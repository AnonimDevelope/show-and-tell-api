const express = require("express");
const passport = require("passport");

const uploadControllers = require("../controllers/upload.controllers");

const router = express.Router();

router.post(
  "/posts/file",
  passport.authenticate("jwt", { session: false }),
  uploadControllers.postByFile
);

router.post(
  "/posts/url",
  passport.authenticate("jwt", { session: false }),
  uploadControllers.postByUrl
);

module.exports = router;
