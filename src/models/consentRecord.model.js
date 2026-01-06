const mongoose = require('mongoose');

const consentRecordSchema = new mongoose.Schema({
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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
    index: true
  },
  consentAI: {
    type: Boolean,
    required: true,
    default: false
  },
  consentFineTune: {
    type: Boolean,
    required: true,
    default: false
  },
  capturedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  isDeleted: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Unique constraint: one consent record per submission-user pair
consentRecordSchema.index({ submissionId: 1, userId: 1 }, { unique: true });

// Multi-tenant compound indexes
consentRecordSchema.index({ orgId: 1, conferenceId: 1 });
consentRecordSchema.index({ orgId: 1, submissionId: 1 });

const ConsentRecord = mongoose.model('ConsentRecord', consentRecordSchema);

module.exports = ConsentRecord;
