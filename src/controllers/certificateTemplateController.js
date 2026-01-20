const certificateTemplateModel = require("../models/certificateTemplate.model");
const { validateCertificateTemplate } = require("../validation/certificateTemplateValidator");

const saveCertificateTemplate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orgId, conferenceId, html, css } = req.body;

    if (!orgId || !conferenceId) {
      return res.status(400).json({ message: "orgId and conferenceId required" });
    }

    const errors = validateCertificateTemplate({ html, css });
    if (errors.length > 0) {
      return res.status(400).json({ message: "Template invalid", errors });
    }

    const template = await certificateTemplateModel.findOneAndUpdate(
      { conferenceId, orgId, isDeleted: false },
      {
        orgId,
        conferenceId,
        html,
        css,
        updatedBy: userId,
        $setOnInsert: { createdBy: userId },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({
      message: "Template saved successfully",
      data: template,
    });
  } catch (err) {
    console.error("saveCertificateTemplate error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getCertificateTemplate = async (req, res) => {
  try {
    const { orgId, conferenceId } = req.params;

    const template = await CertificateTemplate.findOne({
      orgId,
      conferenceId,
      isDeleted: false,
    }).lean();

    return res.status(200).json({
      message: "Template fetched",
      data: template || null,
    });
  } catch (err) {
    console.error("getCertificateTemplate error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { saveCertificateTemplate, getCertificateTemplate };
