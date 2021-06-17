const express = require("express");
const fetch = require("node-fetch");
const Busboy = require("busboy");
const { uploadToS3, optimizeImage } = require("../functions/upload");

const router = express.Router();

router.post("/posts/file", async (req, res, next) => {
  try {
    const busboy = new Busboy({ headers: req.headers });

    busboy.on("finish", async () => {
      const img = await optimizeImage(req.files.image.data, 900);
      const url = await uploadToS3(img, req.files.image.name);

      res.json({
        success: 1,
        file: {
          url: url,
        },
      });
    });

    req.pipe(busboy);
  } catch (error) {
    console.log("error: ", error);
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
    const name = url.substring(url.lastIndexOf("/") + 1);

    const img = await optimizeImage(buffer, 900);
    const imageUrl = await uploadToS3(img, name);

    res.json({
      success: 1,
      file: {
        url: imageUrl,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: 0,
    });
  }
});

module.exports = router;
