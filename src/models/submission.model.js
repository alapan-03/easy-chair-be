const { Schema, model } = require('mongoose');
const { SubmissionStatuses } = require('../constants/submissionStatuses');

const authorMetaSchema = new Schema(
  {
    name: { type: String, required: true },
    affiliation: { type: String, required: true },
    orcid: { type: String },
    corresponding: { type: Boolean, default: false },
  },
  { _id: false }
);

const decisionSchema = new Schema(
  {
    status: { type: String },
    notes: { type: String },
    decidedAt: { type: Date },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const blindedSnapshotSchema = new Schema(
  {
    authors: { type: [authorMetaSchema], default: [] },
  },
  { _id: false }
);

const submissionSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    conferenceId: { type: Schema.Types.ObjectId, ref: 'Conference', required: true },
    trackId: { type: Schema.Types.ObjectId, ref: 'Track', required: true },
    createdByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: {
      title: { type: String, required: true },
      abstract: { type: String, required: true },
      keywords: { type: [String], default: [] },
      authors: { type: [authorMetaSchema], default: [] },
    },
    status: { type: String, enum: Object.values(SubmissionStatuses), default: SubmissionStatuses.DRAFT },
    decision: { type: decisionSchema, default: () => ({}) },
    blindedSnapshot: { type: blindedSnapshotSchema, default: () => ({}) },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

submissionSchema.index({ orgId: 1, conferenceId: 1, status: 1 });
submissionSchema.index({ orgId: 1, createdByUserId: 1, conferenceId: 1 });
submissionSchema.index({ orgId: 1, _id: 1 });

module.exports = model('Submission', submissionSchema);
