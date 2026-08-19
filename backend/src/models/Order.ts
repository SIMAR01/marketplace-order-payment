import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderItem {
  product: mongoose.Types.ObjectId;
  title: string;
  quantity: number;
  unitPrice: number; // Stored in cents (integer)
  provider: mongoose.Types.ObjectId;
}

export interface IShippingAddress {
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

export interface IOrder extends Document {
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  totalAmount: number; // Stored in cents (integer)
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'CANCELLED' | 'PAYMENT_FAILED' | 'PAYMENT_HELD_STOCK_FAILED' | 'REFUNDED';
  paymentIntentId?: string;
  idempotencyKey?: string;
  shippingAddress: IShippingAddress;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<IOrderItem>(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    quantity: { type: Number, required: true, min: [1, 'Quantity must be at least 1'] },
    unitPrice: { type: Number, required: true },
    provider: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

const ShippingAddressSchema = new Schema<IShippingAddress>(
  {
    street: { type: String, required: true },
    area: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true },
  },
  { _id: false }
);

const OrderSchema = new Schema<IOrder>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    items: [OrderItemSchema],
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'CANCELLED', 'PAYMENT_FAILED', 'PAYMENT_HELD_STOCK_FAILED', 'REFUNDED'],
      default: 'PENDING',
      index: true,
    },
    paymentIntentId: { type: String, index: true },
    idempotencyKey: { type: String, unique: true, sparse: true },
    shippingAddress: { type: ShippingAddressSchema, required: true },
  },
  {
    timestamps: true,
  }
);

export const Order = mongoose.model<IOrder>('Order', OrderSchema);
