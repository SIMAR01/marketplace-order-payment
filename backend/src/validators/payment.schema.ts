import { z } from 'zod';

export const createPaymentIntentSchema = z.object({
  shippingAddress: z.object({
    street: z.string({ required_error: 'Street is required' }).min(1, 'Street cannot be empty').trim(),
    area: z.string({ required_error: 'Area is required' }).min(1, 'Area cannot be empty').trim(),
    city: z.string({ required_error: 'City is required' }).min(1, 'City cannot be empty').trim(),
    state: z.string({ required_error: 'State is required' }).min(1, 'State cannot be empty').trim(),
    pincode: z.string({ required_error: 'Pincode is required' }).min(1, 'Pincode cannot be empty').trim(),
  }),
  providerId: z.string({ required_error: 'Provider ID is required' }).regex(/^[0-9a-fA-F]{24}$/, 'Invalid Provider ID format'),
  idempotencyKey: z.string().optional(),
});
