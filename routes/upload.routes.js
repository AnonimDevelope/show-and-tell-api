const express = require("express");

const uploadControllers = require("../controllers/upload.controllers");

const router = express.Router();

router.post("/posts/file", uploadControllers.postByFile);

router.post("/posts/url", uploadControllers.postByUrl);

module.exports = router;
