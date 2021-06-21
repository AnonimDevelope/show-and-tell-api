const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const passport = require("passport");
require("dotenv/config");
require("./auth/auth");
const fileUpload = require("express-fileupload");

const app = express();

const port = process.env.PORT || 4000;

app.use(fileUpload());
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

const postsRoute = require("./routes/posts.routes");
const authRoute = require("./routes/auth.routes");
const userRoute = require("./routes/user.routes");
const uploadRoute = require("./routes/upload.routes");

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

app.get("/", (req, res) => res.json({ message: "success" }));

app.listen(port);
