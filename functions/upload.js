const AWS = require("aws-sdk");
const sharp = require("sharp");
const sizeOf = require("image-size");

const uploadToS3 = async (file, fileName) => {
  let s3bucket = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    Bucket: process.env.AWS_BUCKET_NAME,
  });

  let extn = fileName.split(".").pop();
  let contentType = "application/octet-stream";
  if (extn == "png" || extn == "jpg" || extn == "gif")
    contentType = "image/" + extn;

  const params = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: Date.now() + fileName,
    Body: file,
    ContentType: contentType,
  };
  const data = await s3bucket.upload(params).promise();

  return data.Location;
};

const optimizeImage = async (image, width, height) => {
  const size = sizeOf(image);
  if (size.width < width) {
    return { image, width: size.width, height: size.height };
  }

  const img = await sharp(image).resize(width, height).toBuffer();

  return { image: img, width: size.width, height: size.height };
};

module.exports = { uploadToS3, optimizeImage };
