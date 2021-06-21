const express = require("express");
const passport = require("passport");
const authControllers = require("../controllers/auth.controllers");

const router = express.Router();

router.post(
  "/signup",
  passport.authenticate("signup", { session: false }),
  authControllers.signUp
);

router.post("/google", authControllers.googleLogin);

router.post("/login", authControllers.login);

module.exports = router;
