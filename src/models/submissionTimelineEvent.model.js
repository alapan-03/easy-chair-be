const { Schema, model } = require('mongoose');
const { SubmissionTimelineTypes } = require('../constants/submissionStatuses');

const submissionTimelineEventSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    submissionId: { type: Schema.Types.ObjectId, ref: 'Submission', required: true },
    type: { type: String, enum: Object.values(SubmissionTimelineTypes), required: true },
    actorUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    payload: { type: Schema.Types.Mixed },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

submissionTimelineEventSchema.index({ submissionId: 1, createdAt: 1 });
submissionTimelineEventSchema.index({ orgId: 1, submissionId: 1 });

module.exports = model('SubmissionTimelineEvent', submissionTimelineEventSchema);
