import mongoose, { Document, Schema } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  title: string;
  quantity: number;
  unitPrice: number; // Stored in cents inside items to avoid rounding, converted during intent creation
  imageUrl?: string;
}

export interface IOrder extends Document {
  orderNumber: string;
  customer: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;
  items: IOrderItem[];
  financials: {
    grossAmount: number; // in dollars (decimal representation)
    platformFee: number; // in dollars
    stripeFee: number; // in dollars
    netPayout: number; // in dollars
    currency: string;
  };
  shippingAddress: {
    street: string;
    area: string;
    city: string;
    state: string;
    pincode: string;
  };
  status: 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCEL_REQUESTED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payoutStatus: 'HELD_IN_ESCROW' | 'TRANSFERRED' | 'CANCELLED';
  paymentIntentId: string;
  stripeChargeId?: string;
  stripeTransferId?: string;
  cancelReason?: string;
  shippedAt?: Date;
  deliveredAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [
      {
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        title: { type: String, required: true },
        quantity: { type: Number, required: true, min: 1 },
        unitPrice: { type: Number, required: true },
        imageUrl: { type: String },
      },
    ],
    financials: {
      grossAmount: { type: Number, required: true },
      platformFee: { type: Number, required: true, default: 0 },
      stripeFee: { type: Number, required: true, default: 0 },
      netPayout: { type: Number, required: true },
      currency: { type: String, default: 'usd' },
    },
    shippingAddress: {
      street: { type: String, required: true },
      area: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    status: {
      type: String,
      enum: ['PLACED', 'PACKED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCEL_REQUESTED', 'CANCELLED'],
      default: 'PLACED',
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    payoutStatus: {
      type: String,
      enum: ['HELD_IN_ESCROW', 'TRANSFERRED', 'CANCELLED'],
      default: 'HELD_IN_ESCROW',
      index: true,
    },
    paymentIntentId: { type: String, index: true },
    stripeChargeId: { type: String },
    stripeTransferId: { type: String },
    cancelReason: { type: String },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
