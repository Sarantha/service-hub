const { z } = require('zod');

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required.').max(50, 'Category name is too long.')
});

module.exports = { createCategorySchema };
