const express = require("express");
const router = express.Router();
const { requireRole } = require("../middleware/rbac");
const { getCertificateTemplate, saveCertificateTemplate } = require("../controllers/certificateTemplateController");

router.get(
  "/:orgId/:conferenceId",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  getCertificateTemplate,
);
router.post(
  "/save",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  saveCertificateTemplate,
);

module.exports = router;
