const { z } = require('zod');

const createBranchSchema = z.object({
  branchName: z.string().trim().min(1, 'Branch name is required.').max(80, 'Branch name is too long.'),
  code: z.string().trim().min(1, 'Branch code is required.').max(20, 'Branch code is too long.')
});

module.exports = { createBranchSchema };
