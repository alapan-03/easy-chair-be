const mongoose = require('mongoose');

const aiReportSchema = new mongoose.Schema({
  orgId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Organization',
    index: true
  },
  conferenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Conference',
    index: true
  },
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'Submission',
    index: true
  },
  fileVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'SubmissionFile'
  },
  status: {
    type: String,
    enum: ['QUEUED', 'RUNNING', 'DONE', 'FAILED'],
    required: true,
    default: 'QUEUED',
    index: true
  },
  summary: {
    text: { type: String },
    wordCount: { type: Number },
    providerMeta: { type: mongoose.Schema.Types.Mixed }
  },
  formatCheck: {
    score: { type: Number },
    checks: [{
      key: { type: String },
      pass: { type: Boolean },
      notes: { type: String }
    }]
  },
  similarity: {
    scorePct: { type: Number },
    thresholdPct: { type: Number },
    flagged: { type: Boolean, default: false },
    excludeReferencesUsed: { type: Boolean, default: false }
  },
  provenance: {
    provider: { type: String },
    model: { type: String },
    runBy: {
      type: String,
      enum: ['AUTO', 'MANUAL'],
      required: true
    },
    runByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    runAt: {
      type: Date,
      default: Date.now
    }
  },
  failure: {
    code: { type: String },
    message: { type: String }
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Compound indexes for admin queries
aiReportSchema.index({ conferenceId: 1, submissionId: 1 });
aiReportSchema.index({ conferenceId: 1, status: 1 });
aiReportSchema.index({ orgId: 1, conferenceId: 1 });
aiReportSchema.index({ 'similarity.flagged': 1, conferenceId: 1 });

const AIReport = mongoose.model('AIReport', aiReportSchema);

module.exports = AIReport;
