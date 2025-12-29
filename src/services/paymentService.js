const { randomUUID } = require('crypto');
const { ApiError } = require('../utils/errors');
const paymentIntentRepository = require('../repositories/paymentIntentRepository');
const submissionTimelineRepository = require('../repositories/submissionTimelineRepository');
const { SubmissionTimelineTypes } = require('../constants/submissionStatuses');

const createPaymentIntent = async (orgId, submission, settings, actorUserId) => {
  const providerRef = randomUUID();
  const requiresPayment = settings.payments.amountCents > 0;
  const initialStatus = requiresPayment ? 'CREATED' : 'PAID';

  const intent = await paymentIntentRepository.create(orgId, {
    conferenceId: submission.conferenceId,
    submissionId: submission._id,
    authorUserId: submission.createdByUserId,
    provider: 'stub',
    amountCents: settings.payments.amountCents,
    currency: settings.payments.currency,
    status: initialStatus,
    providerRef,
  });

  await submissionTimelineRepository.create(orgId, {
    submissionId: submission._id,
    type: SubmissionTimelineTypes.PAYMENT_INTENT_CREATED,
    actorUserId: actorUserId,
    payload: { paymentIntentId: intent._id, amountCents: intent.amountCents, currency: intent.currency },
  });

  if (!requiresPayment) {
    await submissionTimelineRepository.create(orgId, {
      submissionId: submission._id,
      type: SubmissionTimelineTypes.PAYMENT_CONFIRMED,
      actorUserId: actorUserId,
      payload: { paymentIntentId: intent._id, providerRef },
    });
  }

  return intent;
};

const markPaidByProviderRef = async (orgId, providerRef, actorUserId) => {
  const intent = await paymentIntentRepository.findOneByProviderRef(orgId, providerRef);
  if (!intent) {
    throw new ApiError(404, 'PAYMENT_INTENT_NOT_FOUND', 'Payment intent not found');
  }

  const updated = await paymentIntentRepository.updateOne(
    orgId,
    { _id: intent._id },
    { $set: { status: 'PAID' } },
    { new: true }
  );

  const timelineActor = actorUserId || intent.authorUserId;

  await submissionTimelineRepository.create(orgId, {
    submissionId: intent.submissionId,
    type: SubmissionTimelineTypes.PAYMENT_CONFIRMED,
    actorUserId: timelineActor,
    payload: { paymentIntentId: intent._id, providerRef },
  });

  return updated;
};

module.exports = {
  createPaymentIntent,
  markPaidByProviderRef,
};
