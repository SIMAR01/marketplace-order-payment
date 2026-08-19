import mongoose, { Document, Schema } from 'mongoose';

export interface ISubOrderItem {
  product: mongoose.Types.ObjectId;
  title: string;
  quantity: number;
  unitPrice: number; // in cents
}

export interface ISubOrder extends Document {
  parentOrder: mongoose.Types.ObjectId;
  provider: mongoose.Types.ObjectId;
  items: ISubOrderItem[];
  grossAmount: number; // total items subtotal in cents
  platformFee: number; // 10% commission in cents
  stripeFeeDeduction: number; // prorated Stripe processing fee in cents
  netPayout: number; // grossAmount - platformFee - stripeFeeDeduction
  status: 'PENDING' | 'PLACED' | 'PAID' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCEL_REQUESTED' | 'CANCELLED' | 'COMPLETED';
  payoutStatus: 'HELD' | 'PAID' | 'CANCELLED';
  deliveredAt?: Date;
  payoutReleasedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SubOrderItemSchema = new Schema<ISubOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true },
  },
  { _id: false }
);

const SubOrderSchema = new Schema<ISubOrder>(
  {
    parentOrder: { type: Schema.Types.ObjectId, ref: 'Order', required: true, index: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [SubOrderItemSchema],
    grossAmount: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    stripeFeeDeduction: { type: Number, required: true },
    netPayout: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PLACED', 'PAID', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCEL_REQUESTED', 'CANCELLED', 'COMPLETED'],
      default: 'PENDING',
      index: true,
    },
    payoutStatus: {
      type: String,
      enum: ['HELD', 'PAID', 'CANCELLED'],
      default: 'HELD',
      index: true,
    },
    deliveredAt: { type: Date },
    payoutReleasedAt: { type: Date },
  },
  { timestamps: true }
);

export const SubOrder = mongoose.model<ISubOrder>('SubOrder', SubOrderSchema);
