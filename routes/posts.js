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

router.get("/", async (req, res) => {
  const posts = await Post.find().sort({ date: 1 }).lean();

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
});

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  upload.single("thumbnail"),
  async (req, res) => {
    try {
      const path = req.file.path.replaceAll("\\", "/");

      const image = await Jimp.read(path);
      image
        .resize(650, 390)
        .quality(60)
        .write("./" + path);

      // const user = await User.findById(req.user._id).select("name");

      const post = new Post({
        title: req.body.title,
        authorId: req.user._id,
        slug: req.body.title.toLowerCase().replaceAll(" ", "-"),
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
      res.status(500).json({ message: error });
    }
  }
);

module.exports = router;
