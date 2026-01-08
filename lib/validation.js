import { z } from 'zod';

export const createPasteSchema = z.object({
  content: z.string()
    .min(1, 'Content cannot be empty')
    .max(10485760, 'Content too large (max 10MB)'),
  title: z.string()
    .max(255, 'Title too long')
    .optional(),
  expiresIn: z.number()
    .int('Expiration must be an integer')
    .positive('Expiration must be positive')
    .max(8760, 'Max expiration is 1 year (8760 hours)')
    .optional(),
  maxViews: z.number()
    .int('Max views must be an integer')
    .positive('Max views must be positive')
    .max(1000000, 'Max views cannot exceed 1,000,000')
    .optional()
});

export function validateCreatePaste(data) {
  try {
    return {
      success: true,
      data: createPasteSchema.parse(data)
    };
  } catch (error) {
    return {
      success: false,
      error: error.errors[0].message
    };
  }
}