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
  slug: {
    type: String,
    required: true,
  },
  comments: {
    type: Array,
    required: false,
  },
});

module.exports = mongoose.model("Posts", PostSchema);
