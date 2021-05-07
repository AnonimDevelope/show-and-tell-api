const passport = require("passport");
const localStrategy = require("passport-local").Strategy;
const UserModel = require("../models/User");
const JWTstrategy = require("passport-jwt").Strategy;
const GooglePlusStrategy = require("passport-google-plus");
const ExtractJWT = require("passport-jwt").ExtractJwt;

passport.use(
  new JWTstrategy(
    {
      secretOrKey: "TOP_SECRET",
      jwtFromRequest: ExtractJWT.fromUrlQueryParameter("secret_token"),
    },
    async (token, done) => {
      try {
        return done(null, token.user);
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.use(
  "googleToken",
  new GooglePlusStrategy(
    {
      clientId:
        "653264637058-sk0aupiel1dkjqt2tmpvn0lkvvm8g512.apps.googleusercontent.com",
      clientSecret: "If_9V6dLAoCv6kem_ngnCLlW",
    },
    function (accessToken, refreshToken, profile, done) {
      console.log("Tokens: ", accessToken);
      console.log("Profile: ", profile);
      //done(null, profile, tokens);
    }
  )
);

passport.use(
  "signup",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await UserModel.create({ email, password });

        return done(null, user);
      } catch (error) {
        done(error);
      }
    }
  )
);

passport.use(
  "login",
  new localStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        const user = await UserModel.findOne({ email });

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        const validate = await user.isValidPassword(password);

        if (!validate) {
          return done(null, false, { message: "Wrong Password" });
        }

        return done(null, user, { message: "Logged in Successfully" });
      } catch (error) {
        return done(error);
      }
    }
  )
);
