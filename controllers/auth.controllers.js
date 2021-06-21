const User = require("../models/User");
const passport = require("passport");
const { jwtSign } = require("../functions/user");

const signUp = async (req, res, next) => {
  const token = jwtSign({ _id: req.user._id, email: req.user.email });

  res.status(200).json({
    token,
    email: req.user.email,
    name: req.user.name,
    avatar: req.user.avatar,
    _id: req.user._id,
  });
};

const googleLogin = async (req, res, next) => {
  const { name, email, avatar } = req.body;
  try {
    const existingUser = await User.findOne({ email }).select(
      "email name avatar"
    );
    if (existingUser) {
      const token = jwtSign({
        _id: existingUser._id,
        email: existingUser.email,
      });

      res.status(200).json({
        token,
        email: existingUser.email,
        name: existingUser.name,
        avatar: existingUser.avatar,
        _id: existingUser._id,
      });
    } else {
      const user = new User({
        name,
        email,
        avatar,
        saves: [],
        history: [],
        resetCode: "0",
      });

      const newUser = await user.save();
      const newToken = jwtSign({ _id: newUser._id, email: newUser.email });

      res.status(201).json({
        token: newToken,
        email: newUser.email,
        name: newUser.name,
        avatar: newUser.avatar,
        _id: newUser._id,
      });
    }
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  passport.authenticate("login", async (err, user, info) => {
    try {
      if (err || !user) {
        const error = { message: info.message };

        return next(error);
      }

      req.login(user, { session: false }, async (error) => {
        if (error) return next(error);

        const token = jwtSign({ _id: user._id, email: user.email });

        return res.status(200).json({
          token,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          _id: user._id,
        });
      });
    } catch (error) {
      return next(error);
    }
  })(req, res, next);
};

module.exports = { signUp, googleLogin, login };
