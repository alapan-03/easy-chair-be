const { z } = require('zod');
const Roles = require('../constants/roles');

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'Must be a valid ObjectId');

const createOrgSchema = {
  body: z.object({
    name: z.string().min(1, 'name is required'),
    slug: z.string().regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumerics and hyphens').optional(),
  }),
};

const addOrgMemberSchema = {
  params: z.object({
    orgId: objectId,
  }),
  body: z.object({
    userId: objectId,
    // At org level, only ADMIN and MANAGER can be assigned
    // AUTHOR is conference-level only (via access link)
    role: z.enum([Roles.ADMIN, Roles.MANAGER]),
  }),
};

const getOrgMembersSchema = {
  params: z.object({
    orgId: objectId,
  }),
};

module.exports = {
  createOrgSchema,
  addOrgMemberSchema,
  getOrgMembersSchema,
};
