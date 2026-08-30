const { z } = require('zod');

const VALID_ROLES = ['Super Admin', 'Service Advisor', 'Technician'];

const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().toLowerCase().email('A valid email address is required.'),
  role: z.enum(VALID_ROLES, { message: `Role must be one of: ${VALID_ROLES.join(', ')}.` }),
  // Required for Service Advisor/Technician (checked below); optional for
  // Super Admin, who isn't pinned to a single branch.
  branchId: z.string().trim().min(1).optional(),
  currentPassword: z.string().min(1, 'Please re-enter your password to confirm this action.')
}).refine((data) => data.role === 'Super Admin' || !!data.branchId, {
  message: 'Branch is required for this role.',
  path: ['branchId']
});

const updateUserSchema = z.object({
  name: z.string().trim().min(1).optional(),
  role: z.enum(VALID_ROLES).optional(),
  status: z.enum(['Active', 'Suspended']).optional(),
  branchId: z.string().trim().min(1).optional()
});

module.exports = { createUserSchema, updateUserSchema };
