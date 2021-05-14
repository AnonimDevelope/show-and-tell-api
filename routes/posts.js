const express = require("express");
const passport = require("passport");
const multer = require("multer");
const Jimp = require("jimp");
const Post = require("../models/Post");
const User = require("../models/User");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/posts");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 15 }, //limit 15 megabytes
});

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

    console.log(enhancedPosts);

    res.status(200).json(enhancedPosts);
  } catch (error) {
    return next(error);
  }
});

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  upload.single("thumbnail"),
  async (req, res, next) => {
    try {
      const path = req.file.path.replaceAll("\\", "/");

      const image = await Jimp.read(path);
      image
        .resize(650, 390)
        .quality(60)
        .write("./" + path);

      let slug = req.body.title.toLowerCase().replaceAll(" ", "-");

      const isSlugExist = await Post.exists({ slug });

      if (isSlugExist) {
        slug = Date.now().toString() + slug;
      }

      const post = new Post({
        title: req.body.title,
        authorId: req.user._id,
        slug: slug,
        content: req.body.content,
        readTime: req.body.readTime,
        thumbnail: process.env.DOMAIN + "/" + path,
        comments: [],
        likes: [],
        dislikes: [],
        date: Date.now(),
      });

      await post.save();
      res.status(201).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.get("/:id", async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id).lean();

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

      console.log(user.saves);

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
