const fetch = require("node-fetch");
const Busboy = require("busboy");
const { uploadToS3, optimizeImage } = require("../functions/upload");

const postByFile = async (req, res, next) => {
  try {
    const busboy = new Busboy({ headers: req.headers });

    busboy.on("finish", async () => {
      const { image, width, height } = await optimizeImage(
        req.files.image.data,
        900
      );
      const url = await uploadToS3(image, req.files.image.name);

      res.json({
        success: 1,
        file: {
          url: url,
          width,
          height,
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
};

const postByUrl = async (req, res) => {
  try {
    const { url } = req.body;

    const response = await fetch(url);
    const buffer = await response.buffer();
    const name = url.substring(url.lastIndexOf("/") + 1);

    const { image, width, height } = await optimizeImage(buffer, 900);
    const imageUrl = await uploadToS3(image, name);

    res.json({
      success: 1,
      file: {
        url: imageUrl,
        width,
        height,
      },
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: 0,
    });
  }
};

module.exports = { postByFile, postByUrl };
