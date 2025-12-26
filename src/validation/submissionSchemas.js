const { z } = require('zod');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId');

const authorSchema = z.object({
  name: z.string().min(1),
  affiliation: z.string().min(1),
  orcid: z.string().optional(),
  corresponding: z.boolean().optional(),
});

const metadataSchema = z.object({
  title: z.string().min(1),
  abstract: z.string().min(1),
  keywords: z.array(z.string()).optional().default([]),
  authors: z.array(authorSchema).nonempty(),
});

const createSubmissionSchema = {
  body: z.object({
    conferenceId: objectId,
    trackId: objectId,
    metadata: metadataSchema,
  }),
};

const updateSubmissionSchema = {
  params: z.object({ id: objectId }),
  body: z.object({ metadata: metadataSchema }),
};

const uploadFileSchema = {
  params: z.object({ id: objectId }),
  body: z.object({
    originalName: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().positive(),
    checksum: z.string().optional(),
  }),
};

const idOnlySchema = {
  params: z.object({ id: objectId }),
};

module.exports = {
  createSubmissionSchema,
  updateSubmissionSchema,
  uploadFileSchema,
  idOnlySchema,
};
