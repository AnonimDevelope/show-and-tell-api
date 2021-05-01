const express = require("express");
const Post = require("../models/Post");

const router = express.Router();

router.get("/", async (req, res) => {
  const posts = await Post.find();
  res.status(200).json(posts);
});

router.post("/", async (req, res) => {
  const post = new Post({
    title: req.body.title,
    slug: req.body.slug,
    content: req.body.content,
    comments: req.body.comments,
  });

  try {
    await post.save();
    res.status(201).json({ message: "success" });
  } catch (error) {
    res.status(500).json({ message: error });
  }
});

module.exports = router;
