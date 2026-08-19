import { Schema, model, Document, Types } from 'mongoose';
import { DEFAULT_CURRENCY } from '../config/currency.config';

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IMoney {
  amount: number; // Stored in cents (integer)
  currency: string;
}

export interface IProduct extends Document {
  title: string;
  description: string;
  price: IMoney;
  stock: number;
  category: string;
  images: IProductImage[];
  provider: Types.ObjectId;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productImageSchema = new Schema<IProductImage>(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
  },
  { _id: false }
);

const moneySchema = new Schema<IMoney>(
  {
    amount: {
      type: Number,
      required: [true, 'Price amount is required'],
      min: [1, 'Price amount in cents must be at least 1 cent'],
      validate: {
        validator: Number.isInteger,
        message: 'Price amount in cents must be a whole integer',
      },
    },
    currency: {
      type: String,
      required: [true, 'Price currency is required'],
      default: DEFAULT_CURRENCY,
      trim: true,
      uppercase: true,
    },
  },
  { _id: false }
);

const productSchema = new Schema<IProduct>(
  {
    title: {
      type: String,
      required: [true, 'Product title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
      trim: true,
    },
    price: {
      type: moneySchema,
      required: [true, 'Product price details are required'],
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true,
      index: true,
    },
    images: {
      type: [productImageSchema],
      required: [true, 'Product images are required'],
      validate: {
        validator: function (val: IProductImage[]) {
          return val && val.length >= 1;
        },
        message: 'At least one product image is required',
      },
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Product provider is required'],
      index: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound Index: Unique active product titles per provider
productSchema.index({ provider: 1, title: 1, isDeleted: 1 }, { unique: true });

export const Product = model<IProduct>('Product', productSchema);
