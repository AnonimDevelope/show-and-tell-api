const Post = require("../models/Post");
const User = require("../models/User");

const getComments = async (req) => {
  const post = await Post.findById(req.params.id).select("comments");
  const comments = [...post.comments];
  const authorIds = [];

  comments.forEach((comment) => {
    comment.replies.forEach((nestedComm) => {
      if (!authorIds.includes(nestedComm.authorId)) {
        authorIds.push(nestedComm.authorId);
      }
    });

    if (!authorIds.includes(comment.authorId)) {
      authorIds.push(comment.authorId);
    }
  });

  const authors = await User.find()
    .where("_id")
    .in(authorIds)
    .select("name avatar");

  comments.forEach((comment) => {
    comment.replies.forEach((nestedComm) => {
      const author = authors.find(
        (author) => author._id.toString() === nestedComm.authorId.toString()
      );
      nestedComm.author = {
        name: author.name,
        avatar: author.avatar,
      };

      let myAction = "";

      if (req.user && nestedComm.likes.find((id) => id === req.user._id)) {
        myAction = "liked";
      } else if (
        req.user &&
        nestedComm.dislikes.find((id) => id === req.user._id)
      ) {
        myAction = "disliked";
      }

      nestedComm.myAction = myAction;
      nestedComm.likes = nestedComm.likes.length;
      nestedComm.dislikes = nestedComm.dislikes.length;
    });

    const author = authors.find(
      (author) => author._id.toString() === comment.authorId.toString()
    );
    comment.author = {
      name: author.name,
      avatar: author.avatar,
    };

    let myAction = "";

    if (req.user && comment.likes.find((id) => id === req.user._id)) {
      myAction = "liked";
    } else if (req.user && comment.dislikes.find((id) => id === req.user._id)) {
      myAction = "disliked";
    }

    comment.likes = comment.likes.length;
    comment.dislikes = comment.dislikes.length;
    comment.myAction = myAction;
  });
  return comments;
};

module.exports = { getComments };
