const mongoose = require("mongoose");

const PostSchema = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String, //Using String instead of an object because of gatsby bug
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
    type: Array,
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
  date: {
    type: Number,
    required: true,
  },
});

module.exports = mongoose.model("Post", PostSchema);
