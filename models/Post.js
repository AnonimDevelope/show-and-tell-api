const mongoose = require("mongoose");

const NestedCommentSchema = mongoose.Schema({
  authorId: {
    type: String,
    required: true,
  },
  date: {
    type: Number,
    required: true,
  },
  likes: {
    type: Array,
    required: true,
  },
  dislikes: {
    type: Array,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  author: {
    type: Object,
    required: false,
  },
  myAction: {
    type: String,
    required: false,
  },
});

const CommentSchema = mongoose.Schema({
  authorId: {
    type: String,
    required: true,
  },
  date: {
    type: Number,
    required: true,
  },
  likes: {
    type: Array,
    required: true,
  },
  dislikes: {
    type: Array,
    required: true,
  },
  comment: {
    type: String,
    required: true,
  },
  replies: {
    type: [NestedCommentSchema],
    required: false,
  },
  author: {
    type: Object,
    required: false,
  },
  myAction: {
    type: String,
    required: false,
  },
});

const PostSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: Object,
    required: true,
  },
  readTime: {
    type: Number,
    required: true,
  },
  authorId: {
    type: String,
    required: true,
  },
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  thumbnail: {
    type: String,
    required: true,
  },
  comments: {
    type: [CommentSchema],
    required: false,
  },
  likes: {
    type: Array,
    required: true,
  },
  dislikes: {
    type: Array,
    required: true,
  },
  date: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Post", PostSchema);
