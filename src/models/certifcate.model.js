const { Schema, model } = require("mongoose");

const certificateSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    conferenceId: { type: Schema.Types.ObjectId, ref: "Conference", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },

    certificateId: { type: String, required: true, unique: true },
    issuedAt: { type: Date, default: Date.now },

    // for s3, later use
    pdfUrl: { type: String },

    status: { type: String, enum: ["ISSUED", "REVOKED"], default: "ISSUED" },

    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

certificateSchema.index({ orgId: 1, conferenceId: 1, userId: 1 }, { unique: true });

const Certificate = model("Certificate", certificateSchema);

module.exports = Certificate