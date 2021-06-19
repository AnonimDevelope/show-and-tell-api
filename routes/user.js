const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const passport = require("passport");
const { Types } = require("mongoose");
const nodemailer = require("nodemailer");
const Busboy = require("busboy");
const { uploadToS3, optimizeImage } = require("../functions/upload");

const router = express.Router();

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select(
        "name email avatar"
      );
      const { name, email, avatar, _id } = user;
      res.status(200).json({ name, email, avatar, _id });
    } catch (error) {
      return next(error);
    }
  }
);

const getDate = (date) => {
  const timestamp = new Date(date);
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  let hours = timestamp.getHours();
  let minutes = timestamp.getMinutes();

  if (hours < 10) {
    hours = `0${hours}`;
  }
  if (minutes < 10) {
    minutes = `0${minutes}`;
  }

  return `${
    months[timestamp.getMonth()]
  } ${timestamp.getDate()}, ${timestamp.getFullYear()} ${hours}:${minutes}`;
};

const getHistory = async (req) => {
  const user = await User.findById(req.user._id).select("history").lean();

  const authorIds = [];
  const postIds = [];

  user.history.forEach((item) => {
    const existingAuthorId = authorIds.find((id) => id === item.authorId);
    const existingPostId = postIds.find((id) => id === item._id);

    if (!existingAuthorId) {
      authorIds.push(item.authorId);
    }
    if (!existingPostId) {
      postIds.push(item._id);
    }
  });

  const posts = await Post.find()
    .where("_id")
    .in(postIds)
    .select("title slug authorId");
  const authors = await User.find().where("_id").in(authorIds).select("name");

  const history = [];

  user.history.forEach((item) => {
    const author = authors.find(
      (auth) => auth._id.toString() === item.authorId.toString()
    );
    const post = posts.find(
      (pst) => pst._id.toString() === item._id.toString()
    );

    if (!author) return;
    if (!post) return;

    history.push({
      ...item,
      timestamp: item.date,
      date: getDate(item.date),
      author: author.name,
      title: post.title,
      slug: post.slug,
      key: item.id,
    });
  });

  history.sort((a, b) => b.timestamp - a.timestamp);

  return history;
};

router.get(
  "/history",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const history = await getHistory(req);

      res.status(200).json(history);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/history",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const isIdValid = Post.exists({ _id: req.body._id });
      if (!isIdValid) {
        return next("Invalid post id");
      }
      const user = await User.findById(req.user._id).select("history");

      const history = [...user.history];
      history.unshift({
        _id: req.body._id,
        date: Date.now(),
        authorId: req.body.authorId,
        id: Types.ObjectId(),
      });

      user.history = history;

      await user.save();

      res.status(201).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  "/history",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      if (!req.body.items) {
        await User.findByIdAndUpdate(req.user._id, { history: [] });

        const history = await getHistory(req);

        res.status(200).json(history);
        return;
      }

      const user = await User.findById(req.user._id).select("history");
      const newHistory = [...user.history];

      req.body.items.forEach((id) => {
        newHistory.splice(
          newHistory.findIndex((item) => item.id.toString() === id.toString()),
          1
        );
      });

      user.history = newHistory;

      await user.save();

      const history = await getHistory(req);

      res.status(200).json(history);
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/saves",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const user = await User.findById(req.user._id).select("saves");

      const saves = [...user.saves];
      saves.unshift({ _id: req.body._id, date: Date.now() });

      user.saves = saves;

      await user.save();

      res.status(201).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.delete(
  "/saves",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
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
  }
);

router.get(
  "/saves",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
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

      const posts = await Post.find()
        .where("_id")
        .in(postIdList)
        .select("title content date authorId thumbnail slug")
        .lean();
      posts.forEach((post) => {
        const data = user.saves.find(
          (item) => item._id.toString() === post._id.toString()
        );
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
  }
);

const getAccessId = async () => {
  const id = Math.floor(Math.random() * (99999 - 10000 + 1) + 10000);

  const isExist = await User.exists({ resetCode: id });
  if (isExist) {
    return getAccessId();
  }

  return id.toString();
};

router.get(
  "/update",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      const id = await getAccessId();

      await User.findByIdAndUpdate(req.user._id, {
        resetCode: id,
      });

      await transporter.sendMail({
        from: `"Show&Tell" ${process.env.EMAIL}`,
        to: req.user.email,
        subject: "Profile update",
        html: `
          <h3>Your code: </h3>
          <h1>${id}</h1>
        `,
      });

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.post(
  "/update",
  passport.authenticate("jwt", { session: false }),
  async (req, res, next) => {
    try {
      const busboy = new Busboy({ headers: req.headers });

      const user = await User.findById(req.user._id).select(
        "resetCode email password name avatar"
      );

      if (user.resetCode !== req.body.code || user.resetCode === "0") {
        return next("Invalid code");
      }

      busboy.on("finish", async () => {
        user.resetCode = "0";
        user.name = req.body.name;
        if (req.body.email) {
          user.email = req.body.email;
        }
        if (req.files && req.files.avatar) {
          const img = await optimizeImage(req.files.avatar.data, 100, 100);
          const url = await uploadToS3(img, req.files.avatar.name);

          user.avatar = url;
        }
        if (req.body.password) {
          user.password = req.body.password;
        }

        await user.save();

        res.status(200).json({ message: "success" });
      });

      req.pipe(busboy);
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:uid",
  //passport.authenticate(["jwt", "anonymous"], { session: false }),
  async (req, res, next) => {
    try {
      const userId = req.params.uid;
      const user = await User.findById(userId)
        .select("name avatar email")
        .lean();
      const posts = await Post.find({ authorId: userId }).lean();

      res.status(200).json({ ...user, posts });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
