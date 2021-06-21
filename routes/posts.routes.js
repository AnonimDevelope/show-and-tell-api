const express = require("express");
const passport = require("passport");

const postsControllers = require("../controllers/posts.controllers");

const router = express.Router();

router.get("/", postsControllers.getAllPosts);

router.post(
  "/",
  passport.authenticate("jwt", { session: false }),
  postsControllers.publishPost
);

router.get("/:id", postsControllers.getPost);

router.post(
  "/:id/edit",
  passport.authenticate("jwt", { session: false }),
  postsControllers.editPost
);

router.delete(
  "/:id",
  passport.authenticate("jwt", { session: false }),
  postsControllers.deletePost
);

router.get(
  "/:id/comments",
  passport.authenticate(["jwt", "anonymous"], { session: false }),
  postsControllers.getComments
);

router.post(
  "/:id/comments",
  passport.authenticate("jwt", { session: false }),
  postsControllers.postComment
);

router.post(
  "/:id/comments/:commId",
  passport.authenticate("jwt", { session: false }),
  postsControllers.postReplyComment
);

router.post(
  "/:id/comments/:commId/like",
  passport.authenticate("jwt", { session: false }),
  postsControllers.likeComment
);

router.post(
  "/:id/comments/:commId/dislike",
  passport.authenticate("jwt", { session: false }),
  postsControllers.dislikeComment
);

router.post(
  "/:id/comments/:commId/:nestedCommId/like",
  passport.authenticate("jwt", { session: false }),
  postsControllers.likeReplyComment
);

router.post(
  "/:id/comments/:commId/:nestedCommId/dislike",
  passport.authenticate("jwt", { session: false }),
  postsControllers.dislikeReplyComment
);

router.get(
  "/:id/rate",
  passport.authenticate(["jwt", "anonymous"], { session: false }),
  postsControllers.getPostRatings
);

router.post(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  postsControllers.likePost
);

router.delete(
  "/:id/like",
  passport.authenticate("jwt", { session: false }),
  postsControllers.deletePostLike
);

router.post(
  "/:id/dislike",
  passport.authenticate("jwt", { session: false }),
  postsControllers.dislikePost
);

router.delete(
  "/:id/dislike",
  passport.authenticate("jwt", { session: false }),
  postsControllers.deleteDislikePosts
);

module.exports = router;
