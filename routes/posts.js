const express = require("express");
const passport = require("passport");
const Post = require("../models/Post");
const User = require("../models/User");
const { Types } = require("mongoose");
const { uploadToS3, optimizeImage } = require("../functions/upload");
const Busboy = require("busboy");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const posts = await Post.find().sort({ date: -1 }).lean();

    const enhancedPosts = [];
    for (const post of posts) {
      const author = await User.findById(post.authorId).select("name avatar");
      enhancedPosts.push({
        ...post,
        author: { name: author.name, avatar: author.avatar, _id: author._id },
      });
    }

    res.status(200).json(enhancedPosts);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      let slug = req.body.title.toLowerCase().replaceAll(" ", "-");

      const isSlugExist = await Post.exists({ slug });

      if (isSlugExist) {
        slug = Date.now().toString() + slug;
      }

      const busboy = new Busboy({ headers: req.headers });

      busboy.on("finish", async () => {
        console.log("initializing");
        const img = await optimizeImage(req.files.thumbnail.data, 675);
        console.log("optimized image: ", img);
        const url = await uploadToS3(img, req.files.thumbnail.name);
        console.log("upload url: ", url);

        const post = new Post({
          title: req.body.title,
          authorId: req.user._id,
          slug: slug,
          content: JSON.parse(req.body.content),
          readTime: req.body.readTime,
          thumbnail: url,
          comments: [],
          likes: [],
          dislikes: [],
          date: Date.now(),
        });

        await post.save();

        res.status(201).json({ message: "success" });
      });

      req.pipe(busboy);
    } catch (error) {
      console.log(error);
      return next(error);
    }
  }
);

router.get("/:id", async (req, res, next) => {
  try {
    const post = await Post.findOne({ slug: req.params.id }).lean();

    const author = await User.findById(post.authorId).select("name avatar");
    const enhancedPost = {
      ...post,
      author: { name: author.name, avatar: author.avatar, _id: author._id },
    };

    res.status(200).json(enhancedPost);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/:id/edit",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      let slug = req.body.title.toLowerCase().replaceAll(" ", "-");
      const busboy = new Busboy({ headers: req.headers });

      busboy.on("finish", async () => {
        const updateObj = {
          title: req.body.title,
          slug: slug,
          readTime: req.body.readTime,
          content: JSON.parse(req.body.content),
        };

        if (req.files.thumbnail) {
          const img = await optimizeImage(req.files.thumbnail.data, 675);
          const url = await uploadToS3(img, req.files.thumbnail.name);
          updateObj.thumbnail = url;
        }

        await Post.findOneAndUpdate(
          { _id: req.params.id, authorId: req.user._id },
          updateObj
        );

        res.status(200).json({ message: "success" });
      });

      req.pipe(busboy);
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      await Post.findOneAndDelete({
        _id: req.params.id,
        authorId: req.user._id,
      });

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

const getComments = async (req) => {
  const post = await Post.findById(req.params.id).select("comments");
  const comments = [...post.comments];
  const authorIds = [];

  comments.forEach((comment) => {
    comment.replies.forEach((nestedComm) => {
      if (!authorIds.includes(nestedComm.authorId)) {
        authorIds.push(nestedComm.authorId);
      }
    });

    if (!authorIds.includes(comment.authorId)) {
      authorIds.push(comment.authorId);
    }
  });

  const authors = await User.find()
    .where("_id")
    .in(authorIds)
    .select("name avatar");

  comments.forEach((comment) => {
    comment.replies.forEach((nestedComm) => {
      const author = authors.find(
        (author) => author._id.toString() === nestedComm.authorId.toString()
      );
      nestedComm.author = {
        name: author.name,
        avatar: author.avatar,
      };

      let myAction = "";

      if (nestedComm.likes.find((id) => id === req.user._id)) {
        myAction = "liked";
      } else if (nestedComm.dislikes.find((id) => id === req.user._id)) {
        myAction = "disliked";
      }

      nestedComm.myAction = myAction;
      nestedComm.likes = nestedComm.likes.length;
      nestedComm.dislikes = nestedComm.dislikes.length;
    });

    const author = authors.find(
      (author) => author._id.toString() === comment.authorId.toString()
    );
    comment.author = {
      name: author.name,
      avatar: author.avatar,
    };

    let myAction = "";

    if (comment.likes.find((id) => id === req.user._id)) {
      myAction = "liked";
    } else if (comment.dislikes.find((id) => id === req.user._id)) {
      myAction = "disliked";
    }

    comment.likes = comment.likes.length;
    comment.dislikes = comment.dislikes.length;
    comment.myAction = myAction;
  });
  return comments;
};

router.get(
  "/:id/comments",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const comments = await getComments(req);

      res.status(200).json(comments);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/comments",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("comments");
      const comments = [...post.comments];

      comments.push({
        _id: Types.ObjectId(),
        authorId: req.user._id,
        date: Date.now(),
        comment: req.body.comment,
        replies: [],
        likes: [],
        dislikes: [],
      });

      post.comments = comments;

      await post.save();

      const newComments = await getComments(req);

      res.status(201).json(newComments);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/comments/:commId",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("comments");
      const comments = [...post.comments];
      const comment = comments.find(
        (comment) => comment._id.toString() === req.params.commId.toString()
      );

      comment.replies = [
        ...comment.replies,
        {
          _id: Types.ObjectId(),
          authorId: req.user._id,
          date: Date.now(),
          comment: req.body.comment,
          likes: [],
          dislikes: [],
        },
      ];

      post.comments = comments;

      post.markModified("post.comments");
      await post.save();

      const newComments = await getComments(req);

      res.status(201).json(newComments);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/comments/:commId/like",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("comments");
      const comments = [...post.comments];
      const comment = comments.find(
        (comment) => comment._id.toString() === req.params.commId.toString()
      );
      const likes = comment.likes;
      const dislikes = comment.dislikes;
      const existingLike = likes.find((id) => id === req.user._id);
      const existingDislike = dislikes.find((id) => id === req.user._id);

      if (existingDislike) {
        dislikes.splice(dislikes.indexOf(existingDislike), 1);
      }

      if (existingLike) {
        likes.splice(likes.indexOf(existingLike), 1);
      } else {
        likes.push(req.user._id);
      }

      post.comments = comments;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/comments/:commId/dislike",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("comments");
      const comments = [...post.comments];
      const comment = comments.find(
        (comment) => comment._id.toString() === req.params.commId.toString()
      );
      const likes = comment.likes;
      const dislikes = comment.dislikes;
      const existingLike = likes.find((id) => id === req.user._id);
      const existingDislike = dislikes.find((id) => id === req.user._id);

      if (existingLike) {
        likes.splice(likes.indexOf(existingLike), 1);
      }

      if (existingDislike) {
        dislikes.splice(likes.indexOf(existingDislike), 1);
      } else {
        dislikes.push(req.user._id);
      }

      post.comments = comments;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/comments/:commId/:nestedCommId/like",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("comments");
      const comments = [...post.comments];
      const comment = comments.find(
        (comment) => comment._id.toString() === req.params.commId.toString()
      );
      const nestedComment = comment.replies.find(
        (comm) => comm._id.toString() === req.params.nestedCommId
      );
      const likes = nestedComment.likes;
      const dislikes = nestedComment.dislikes;
      const existingLike = likes.find((id) => id === req.user._id);
      const existingDislike = dislikes.find((id) => id === req.user._id);

      if (existingDislike) {
        dislikes.splice(dislikes.indexOf(existingDislike), 1);
      }

      if (existingLike) {
        likes.splice(likes.indexOf(existingLike), 1);
      } else {
        likes.push(req.user._id);
      }

      post.comments = comments;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/comments/:commId/:nestedCommId/dislike",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("comments");
      const comments = [...post.comments];
      const comment = comments.find(
        (comment) => comment._id.toString() === req.params.commId.toString()
      );
      const nestedComment = comment.replies.find(
        (comm) => comm._id.toString() === req.params.nestedCommId
      );
      const likes = nestedComment.likes;
      const dislikes = nestedComment.dislikes;
      const existingLike = likes.find((id) => id === req.user._id);
      const existingDislike = dislikes.find((id) => id === req.user._id);

      if (existingLike) {
        likes.splice(likes.indexOf(existingLike), 1);
      }

      if (existingDislike) {
        dislikes.splice(likes.indexOf(existingDislike), 1);
      } else {
        dislikes.push(req.user._id);
      }

      post.comments = comments;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:id/rate",
  passport.authenticate(["jwt", "anonymous"], { session: false }),
  async (req, res, next) => {
    if (!req.user) {
      try {
        const post = await Post.findById(req.params.id).select(
          "likes dislikes"
        );

        res.status(200).json({
          myRate: false,
          likes: post.likes.length,
          dislikes: post.dislikes.length,
          isSaved: false,
        });

        return;
      } catch (error) {
        return next(error);
      }
    }

    try {
      const post = await Post.findById(req.params.id).select("likes dislikes");
      const user = await User.findById(req.user._id).select("saves").lean();
      const likes = [...post.likes];
      const dislikes = [...post.dislikes];
      const existingLike = likes.find((id) => id === req.user._id);
      const existingDislike = dislikes.find((id) => id === req.user._id);
      const existingSave = user.saves.find(
        (item) => item._id === req.params.id
      );

      if (existingLike === req.user._id) {
        res.status(200).json({
          myRate: "liked",
          likes: likes.length,
          dislikes: dislikes.length,
          isSaved: existingSave ? true : false,
        });
        return;
      }
      if (existingDislike === req.user._id) {
        res.status(200).json({
          myRate: "disliked",
          likes: likes.length,
          dislikes: dislikes.length,
          isSaved: existingSave ? true : false,
        });
        return;
      }

      res.status(200).json({
        myRate: false,
        likes: likes.length,
        dislikes: dislikes.length,
        isSaved: existingSave ? true : false,
      });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("likes dislikes");
      const likes = [...post.likes];
      const dislikes = [...post.dislikes];
      const existingLike = likes.find((id) => id === req.user._id);
      const existingDislike = dislikes.find((id) => id === req.user._id);
      if (existingLike === req.user._id) {
        return next("Like exists");
      }
      if (existingDislike === req.user._id) {
        dislikes.splice(dislikes.indexOf(existingDislike), 1);
      }
      likes.push(req.user._id);
      post.likes = likes;
      post.dislikes = dislikes;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("likes");
      const likes = [...post.likes];
      const existingLike = likes.find((id) => id === req.user._id);
      if (existingLike !== req.user._id) {
        return next("Like does not exists");
      }

      likes.splice(likes.indexOf(existingLike), 1);

      post.likes = likes;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/:id/dislike",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("dislikes likes");
      const dislikes = [...post.dislikes];
      const likes = [...post.likes];
      const existingDislike = dislikes.find((id) => id === req.user._id);
      const existingLike = likes.find((id) => id === req.user._id);
      if (existingDislike === req.user._id) {
        return next("Like exists");
      }
      if (existingLike === req.user._id) {
        likes.splice(likes.indexOf(existingLike), 1);
      }
      dislikes.push(req.user._id);
      post.dislikes = dislikes;
      post.likes = likes;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  "/:id/dislike",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const post = await Post.findById(req.params.id).select("dislikes likes");
      const dislikes = [...post.dislikes];
      const existingDislike = dislikes.find((id) => id === req.user._id);
      if (existingDislike !== req.user._id) {
        return next("Like does not exists");
      }

      dislikes.splice(dislikes.indexOf(existingDislike), 1);

      post.dislikes = dislikes;

      await post.save();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
