const express = require("express");
const multer = require("multer");
const fetch = require("node-fetch");
const Jimp = require("jimp");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./uploads/posts");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 15 }, //limit 15 megabytes
});

const router = express.Router();

router.post("/posts/file", upload.single("image"), async (req, res, next) => {
  const path = req.file.path.replaceAll("\\", "/");

  const image = await Jimp.read(path);
  image
    .resize(870, Jimp.AUTO)
    .quality(60)
    .write("./" + path);

  try {
    res.json({
      success: 1,
      file: {
        url: process.env.DOMAIN + "/" + req.file.path.replaceAll("\\", "/"),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: 0,
    });
  }
});

router.post("/posts/url", async (req, res) => {
  try {
    const { url } = req.body;
    const response = await fetch(url);
    const buffer = await response.buffer();
    const name = Date.now() + url.substring(url.lastIndexOf("/") + 1);
    const path = `/uploads/posts/` + name;

    const image = await Jimp.read(buffer);
    image
      .resize(870, Jimp.AUTO)
      .quality(60)
      .write("." + path);

    res.status(200).json({
      success: 1,
      file: {
        url: process.env.DOMAIN + path,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: 0,
    });
  }
});

module.exports = router;
