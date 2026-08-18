import { z } from 'zod';
import { DEFAULT_CURRENCY, SUPPORTED_CURRENCIES } from '../config/currency.config';

// Zod schema for Money object during creation (converts decimal to cents)
export const moneyObjectSchema = z.object({
  amount: z.preprocess(
    (val) => {
      if (typeof val === 'string' || typeof val === 'number') {
        const num = Number(val);
        return isNaN(num) ? null : num;
      }
      return val;
    },
    z.number({
      required_error: 'Price amount is required',
      invalid_type_error: 'Price amount must be a number',
    })
      .positive('Price amount must be greater than 0')
      .min(0.01, 'Price amount must be at least 0.01')
      .refine(
        (val) => Number(val.toFixed(2)) === val,
        { message: 'Price amount cannot have more than 2 decimal places' }
      )
      .transform((val) => Math.round(val * 100)) // Transform decimal (e.g. 89.99) to cents (8999)
  ),
  currency: z
    .string()
    .toUpperCase()
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: `Unsupported currency. Allowed: ${SUPPORTED_CURRENCIES.join(', ')}`,
    })
    .default(DEFAULT_CURRENCY),
});

// Zod schema for Money object during updates (keeps fields optional, converts decimal to cents)
export const moneyUpdateObjectSchema = z.object({
  amount: z.preprocess(
    (val) => {
      if (val === undefined || val === null || val === '') return undefined;
      if (typeof val === 'string' || typeof val === 'number') {
        const num = Number(val);
        return isNaN(num) ? null : num;
      }
      return val;
    },
    z.number()
      .positive('Price amount must be greater than 0')
      .min(0.01, 'Price amount must be at least 0.01')
      .refine(
        (val) => Number(val.toFixed(2)) === val,
        { message: 'Price amount cannot have more than 2 decimal places' }
      )
      .transform((val) => Math.round(val * 100))
      .optional()
  ),
  currency: z
    .string()
    .toUpperCase()
    .refine((val) => SUPPORTED_CURRENCIES.includes(val), {
      message: `Unsupported currency. Allowed: ${SUPPORTED_CURRENCIES.join(', ')}`,
    })
    .optional(),
});

// Preprocess handler to parse JSON string payloads from multipart form-data
const moneyPreprocess = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}, moneyObjectSchema);

const moneyUpdatePreprocess = z.preprocess((val) => {
  if (val === undefined || val === null || val === '') return undefined;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }
  return val;
}, moneyUpdateObjectSchema);

// Stock validator: parses to number, verifies non-negative, enforces whole integer
const stockSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (cleaned === '') return undefined;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }
  return val;
}, z.number({
  required_error: 'Stock is required',
  invalid_type_error: 'Stock must be a valid number',
})
  .int('Stock must be a whole integer')
  .nonnegative('Stock cannot be negative'));

// Schema for product creation
export const createProductSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters')
    .trim(),
  description: z
    .string({ required_error: 'Description is required' })
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim(),
  price: moneyPreprocess,
  stock: stockSchema,
  category: z
    .string({ required_error: 'Category is required' })
    .min(2, 'Category must be at least 2 characters')
    .trim(),
});

// Schema for product update (all fields optional)
export const updateProductSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(120, 'Title cannot exceed 120 characters')
    .trim()
    .optional(),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description cannot exceed 2000 characters')
    .trim()
    .optional(),
  price: moneyUpdatePreprocess.optional(),
  stock: stockSchema.optional(),
  category: z
    .string()
    .min(2, 'Category must be at least 2 characters')
    .trim()
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
