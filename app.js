const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
const fs = require("fs");
require("dotenv/config");
require("./auth/auth");
const fileUpload = require("express-fileupload");

const app = express();

const port = process.env.PORT || 4000;

if (!fs.existsSync("./uploads")) {
  fs.mkdirSync("./uploads");
}
if (!fs.existsSync("./uploads/posts")) {
  fs.mkdirSync("./uploads/posts");
}
if (!fs.existsSync("./uploads/users")) {
  fs.mkdirSync("./uploads/users");
}

app.use(cors());
app.use(fileUpload());
app.use("/uploads/users", express.static("uploads/users"));
app.use("/uploads/posts", express.static("uploads/posts"));
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const postsRoute = require("./routes/posts");
const authRoute = require("./routes/auth");
const userRoute = require("./routes/user");
const uploadRoute = require("./routes/upload");

app.use("/posts", postsRoute);
app.use("/auth", authRoute);
app.use("/user", userRoute);
app.use(
  "/upload",
  passport.authenticate("jwt", { session: false }),
  uploadRoute
);

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
