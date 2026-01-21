const express = require("express");
const router = express.Router();

const { downloadCertificate } = require("../controllers/certificate.controller");

router.get("/download/:conferenceId", downloadCertificate);

module.exports = router;
