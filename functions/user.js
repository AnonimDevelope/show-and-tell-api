const User = require("../models/User");
const Post = require("../models/Post");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");

const getAccessId = async () => {
  const id = Math.floor(Math.random() * (99999 - 10000 + 1) + 10000);

  const isExist = await User.exists({ resetCode: id });
  if (isExist) {
    return getAccessId();
  }

  return id.toString();
};

const sendCodeEmail = async (code, email, title) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  await transporter.sendMail({
    from: `"Show&Tell" ${process.env.EMAIL}`,
    to: email,
    subject: title,
    html: `
      <h3>Your code: </h3>
      <h1>${code}</h1>
    `,
  });
};

const jwtSign = (body) => {
  return jwt.sign({ user: body }, process.env.JWT_SECRET);
};

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

module.exports = { sendCodeEmail, getAccessId, jwtSign, getDate, getHistory };
