const Certificate = require("../models/certifcate.model");
const certificateTemplateModel = require("../models/certificateTemplate.model");
const conferenceModel = require("../models/conference.model");
const conferenceMemberModel = require("../models/conferenceMember.model");

const {
  generateCertificatePdfBuffer,
} = require("../utils/generateCertificatePdf");

const generateCertificateId = () => {
  return `CERT-${Date.now()}`;
};

const downloadCertificate = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { conferenceId } = req.params;

    const member = await conferenceMemberModel
      .findOne({
        userId,
        conferenceId,
        status: "ACTIVE",
        isDeleted: false,
      })
      .lean();

    if (!member) {
      return res
        .status(403)
        .json({ message: "You are not a member of this conference." });
    }

    const conf = await conferenceModel
      .findOne({
        _id: conferenceId,
        isDeleted: false,
      })
      .lean();

    if (!conf) {
      return res.status(404).json({ message: "Conference not found." });
    }

    const now = new Date();
    if (conf.endDate && new Date(conf.endDate) > now) {
      return res.status(400).json({ message: "Certificate available after conference ends." });
    }

    const template = await certificateTemplateModel
      .findOne({
        conferenceId,
        orgId: conf.orgId,
        isDeleted: false,
      })
      .lean();

    if (!template) {
      return res
        .status(404)
        .json({ message: "Certificate template not set for this conference." });
    }

    let cert = await Certificate.findOne({
      userId,
      conferenceId,
      orgId: conf.orgId,
      isDeleted: false,
    });

    if (!cert) {
      cert = await Certificate.create({
        userId,
        conferenceId,
        orgId: conf.orgId,
        certificateId: generateCertificateId(),
        issuedAt: new Date(),
      });
    }

    const issueDate = cert.issuedAt.toLocaleDateString("en-GB");
    const verifyUrl = `easychair.com/verify/${cert.certificateId}`;

    const userName = req.user.email || "User";

    const data = {
      userName,
      conferenceName: conf.name,
      role: member.role,
      issueDate,
      certificateId: cert.certificateId,
      verifyUrl,
    };

    const pdfBuffer = await generateCertificatePdfBuffer({
      html: template.html,
      css: template.css,
      data,
    });

    res.status(200);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="certificate.pdf"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    return res.end(pdfBuffer);
  } catch (err) {
    console.error("downloadCertificate error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports = { downloadCertificate };
