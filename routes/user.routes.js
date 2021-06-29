const express = require("express");
const passport = require("passport");
const userControllers = require("../controllers/user.controllers");

const router = express.Router();

router.get(
  "/",
  passport.authenticate("jwt", { session: false }),
  userControllers.getAuthenticatedUserProfile
);

router.get(
  "/history",
  passport.authenticate("jwt", { session: false }),
  userControllers.getHistory
);

router.post(
  "/history",
  passport.authenticate("jwt", { session: false }),
  userControllers.addToHistory
);

router.delete(
  "/history",
  passport.authenticate("jwt", { session: false }),
  userControllers.deleteFromHistory
);

router.post(
  "/saves",
  passport.authenticate("jwt", { session: false }),
  userControllers.savePost
);

router.delete(
  "/saves",
  passport.authenticate("jwt", { session: false }),
  userControllers.deleteSavedPost
);

router.get(
  "/saves",
  passport.authenticate("jwt", { session: false }),
  userControllers.getSaves
);

router.get(
  "/update",
  passport.authenticate("jwt", { session: false }),
  userControllers.sendVerificationCode
);

router.post(
  "/update",
  passport.authenticate("jwt", { session: false }),
  userControllers.updateProfile
);

router.post("/passwordReset", userControllers.sendResetPasswordCode);

router.post("/resetCodeCheck", userControllers.checkResetPasswordCode);

router.post("/resetPassword", userControllers.resetPassword);

router.get("/:uid", userControllers.getUserProfile);

module.exports = router;
