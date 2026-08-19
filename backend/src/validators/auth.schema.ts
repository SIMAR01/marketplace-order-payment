import { z } from 'zod';

// Zod Schema for Customer Registration
export const customerRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.literal('CUSTOMER').optional().default('CUSTOMER'),
});

// Zod Schema for Provider / Seller Registration
export const providerRegisterSchema = z.object({
  name: z.string().min(2, "Contact name is required").trim(),
  businessName: z.string().min(3, "Business name must be at least 3 characters").trim().optional(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().min(10, "Valid phone number is required").trim(), // Mandatory for PROVIDER
  role: z.literal('PROVIDER'),
});

// Zod Schema for Admin Registration
export const adminRegisterSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").trim(),
  email: z.string().email("Invalid email address").toLowerCase().trim(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.literal('ADMIN'),
});

// Unified registration schema checking role conditionally at runtime
export const registerSchema = z.preprocess((val: any) => {
  if (val && !val.role) {
    val.role = 'CUSTOMER';
  }
  return val;
}, z.discriminatedUnion('role', [
  customerRegisterSchema.extend({ role: z.literal('CUSTOMER') }),
  providerRegisterSchema,
  adminRegisterSchema,
]));

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .email({ message: 'Invalid email address' }),
  password: z
    .string({ required_error: 'Password is required' }),
});
