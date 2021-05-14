const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("name email avatar");
    const { name, email, avatar, _id } = user;
    res.status(200).json({ name, email, avatar, _id });
  } catch (error) {
    return next(error);
  }
});

router.get("/history", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("history").lean();
    const history = [];
    for (const item of user.history) {
      const post = await Post.findById(item._id)
        .select("title thumbnail")
        .lean();
      history.push({
        ...item,
        title: post.title,
        thumbnail: post.thumbnail,
      });
    }

    res.status(200).json(history);
  } catch (error) {
    return next(error);
  }
});

router.post("/history", async (req, res, next) => {
  try {
    const isIdValid = Post.exists({ _id: req.body._id });
    if (!isIdValid) {
      return next("Invalid post id");
    }
    const user = await User.findById(req.user._id).select("history");

    const history = [...user.history];
    history.unshift({ _id: req.body._id, date: Date.now() });

    user.history = history;

    await user.save();

    res.status(201).json({ message: "success" });
  } catch (error) {
    return next(error);
  }
});

router.post("/saves", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("saves");

    const saves = [...user.saves];
    saves.unshift({ _id: req.body._id, date: Date.now() });

    user.saves = saves;

    await user.save();

    res.status(201).json({ message: "success" });
  } catch (error) {
    console.log(error);
    return next(error);
  }
});

router.delete("/saves", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("saves");

    const saves = [...user.saves];
    const existingSave = saves.find((save) => save._id === req.body._id);

    if (!existingSave) {
      return next("Post does not exist");
    }

    saves.splice(saves.indexOf(existingSave), 1);

    user.saves = saves;

    await user.save();

    res.status(201).json({ message: "success" });
  } catch (error) {
    return next(error);
  }
});

router.get("/saves", async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("saves").lean();

    const postIdList = [];

    user.saves.forEach((save) => {
      postIdList.unshift(save._id);
    });

    if (postIdList.length === 0) {
      res.status(200).json([]);
      return;
    }

    const authorIds = [];

    const posts = await Post.find().where("_id").in(postIdList).lean();
    posts.forEach((post) => {
      const data = user.saves.find((item) => item._id === `${post._id}`);
      post.savedDate = data.date;
      authorIds.push(post.authorId);
    });

    const authors = await User.find()
      .where("_id")
      .in(authorIds)
      .select("name avatar")
      .lean();

    posts.forEach((post) => {
      const data = authors.find(
        (author) => `${author._id}` === `${post.authorId}`
      );
      post.author = {
        _id: data._id,
        name: data.name,
        avatar: data.avatar,
      };
    });

    res.status(200).json(posts);
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
