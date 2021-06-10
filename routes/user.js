const express = require("express");
const User = require("../models/User");
const Post = require("../models/Post");
const passport = require("passport");
const { Types } = require("mongoose");
const nodemailer = require("nodemailer");
const multer = require("multer");
const Jimp = require("jimp");
const bcrypt = require("bcrypt");

const router = express.Router();

const updateWebHook = () => {
  fetch(process.env.UPDATE_HOOK, {
    method: "POST",
  });
};

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

  const posts = await Post.find().where("_id").in(postIds).select("title slug");
  const authors = await User.find().where("_id").in(authorIds).select("name");

  const history = [];

  user.history.forEach((item) => {
    const author = authors.find(
      (auth) => auth._id.toString() === item.authorId.toString()
    );
    const post = posts.find(
      (pst) => pst._id.toString() === item._id.toString()
    );

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
  const id = Math.floor(Math.random() * 99999) + 1;

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
        subject: "Password Reset",
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

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/users");
  },
  filename: (req, file, cb) => {
    const re = /(?:\.([^.]+))?$/;
    const type = re.exec(file.originalname)[1];

    cb(null, req.user._id + "." + type);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 7 }, //limit 7 megabytes
});

router.post(
  "/update",
  passport.authenticate("jwt", { session: false }),
  upload.single("avatar"),
  async (req, res, next) => {
    try {
      const file = req.file || {
        fieldname: "",
        originalname: "",
        encoding: "",
        mimetype: "",
        destination: "",
        filename: "",
        path: "",
      };

      const user = await User.findById(req.user._id).select(
        "resetCode email password name avatar"
      );

      if (user.resetCode !== req.body.code || user.resetCode === "0") {
        return next("Invalid code");
      }

      const path = file.path.replaceAll("\\", "/");
      const url = process.env.DOMAIN + "/" + path;
      const re = /(?:\.([^.]+))?$/;
      const type = re.exec(file.originalname)[1];

      if (type === "jpg" || type === "jpeg" || type === "png") {
        const image = await Jimp.read(path);
        image
          .resize(100, 100)
          .quality(60)
          .write("./" + path);
      }

      user.name = req.body.name;
      user.email = req.body.email;
      //user.resetCode = "0";
      if (req.file) {
        user.avatar = url;
      }
      if (req.body.password) {
        user.password = req.body.password;
      }

      await user.save();

      updateWebHook();

      res.status(200).json({ message: "success" });
    } catch (error) {
      return next(error);
    }
  }
);

router.get(
  "/:uid",
  passport.authenticate(["jwt", "anonymous"], { session: false }),
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
