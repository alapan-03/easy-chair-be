const { Schema, model } = require('mongoose');

const submissionFileSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    version: { type: String, enum: ['v1', 'final'], default: 'v1' },
    storageKey: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    checksum: { type: String },
    uploadedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

submissionFileSchema.index({ submissionId: 1, uploadedAt: 1 });
submissionFileSchema.index({ orgId: 1, submissionId: 1 });

module.exports = model('SubmissionFile', submissionFileSchema);
