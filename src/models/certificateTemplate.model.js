const { Schema, model } = require("mongoose");

const certificateTemplateSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    conferenceId: {
      type: Schema.Types.ObjectId,
      ref: "Conference",
      required: true,
      unique: true,
    },

    html: { type: String, required: true },
    css: { type: String, required: true },

    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

certificateTemplateSchema.index({ orgId: 1, conferenceId: 1 });

module.exports = model("CertificateTemplate", certificateTemplateSchema);
