const express = require("express");
const User = require("../models/User");

const router = express.Router();

router.get("/", async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.user.email });
    const { name, email, avatar, _id } = user;
    res.status(200).json({ name, email, avatar, _id });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
