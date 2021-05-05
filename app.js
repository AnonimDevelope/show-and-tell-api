const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
require("dotenv/config");
require("./auth/auth");

const app = express();

const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const postsRoute = require("./routes/posts");
const authRoute = require("./routes/auth");

app.use("/posts", postsRoute);
app.use("/auth", authRoute); //https://www.digitalocean.com/community/tutorials/api-authentication-with-json-web-tokensjwt-and-passport

mongoose.connect(
  process.env.DATABASE_URL,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true,
  },
  () => console.log("connected to db")
);

app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.json({ error: err });
});

app.listen(port);
