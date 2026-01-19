const { z } = require('zod');

const loginSchema = {
  body: z.object({
    email: z.string().email(),
    name: z.string().min(1).optional(),
    password: z.string().min(6).optional(),
    orgId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'orgId must be a valid ObjectId').optional(),
  }),
};

const googleLoginSchema = {
  body: z.object({
    idToken: z.string().min(1, 'Google ID token is required'),
    orgId: z.string().regex(/^[a-fA-F0-9]{24}$/, 'orgId must be a valid ObjectId').optional(),
  }),
};

module.exports = {
  loginSchema,
  googleLoginSchema,
};
