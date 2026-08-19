import { apiSlice } from './apiSlice';

export interface IShippingAddress {
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
}

export interface ICreatePaymentIntentParams {
  shippingAddress: IShippingAddress;
  providerId: string;
  idempotencyKey?: string;
}

export interface ICreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
  orderNumber: string;
}

export interface IOrderItem {
  product: {
    _id: string;
    title: string;
    images?: Array<{ url: string }>;
  } | string;
  title: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    name: string;
    email: string;
  } | string;
  provider: {
    _id: string;
    name: string;
    businessName?: string;
    stripeAccountId?: string;
  };
  items: IOrderItem[];
  financials: {
    grossAmount: number;
    platformFee: number;
    stripeFee: number;
    netPayout: number;
    currency: string;
  };
  shippingAddress: IShippingAddress;
  status: 'PLACED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'COMPLETED' | 'CANCEL_REQUESTED' | 'CANCELLED';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payoutStatus: 'HELD_IN_ESCROW' | 'TRANSFERRED' | 'CANCELLED';
  paymentIntentId: string;
  stripeTransferId?: string;
  cancelReason?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export const paymentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Triggers payment initialization on the backend for a specific provider package
    createPaymentIntent: builder.mutation<ICreatePaymentIntentResponse, ICreatePaymentIntentParams>({
      query: (body) => ({
        url: '/orders/checkout-intent',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponseWrapper<ICreatePaymentIntentResponse>) => response.data,
      invalidatesTags: ['Cart', 'Order'],
    }),

    // Fetches orders list depending on claims
    getOrders: builder.query<IOrder[], void>({
      query: () => '/orders',
      transformResponse: (response: ApiResponseWrapper<IOrder[]>) => response.data,
      providesTags: ['Order'],
    }),

    // Submits customer request to cancel a vendor order split
    requestCancellation: builder.mutation<IOrder, { orderId: string; reason?: string }>({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel-request`,
        method: 'POST',
        body: { reason },
      }),
      transformResponse: (response: ApiResponseWrapper<IOrder>) => response.data,
      invalidatesTags: ['Order'],
    }),

    // Provider transitions shipping/delivery state of a vendor package
    updateOrderStatus: builder.mutation<IOrder, { orderId: string; status: string }>({
      query: ({ orderId, status }) => ({
        url: `/orders/${orderId}/status`,
        method: 'POST',
        body: { status },
      }),
      transformResponse: (response: ApiResponseWrapper<IOrder>) => response.data,
      invalidatesTags: ['Order'],
    }),

    // Customer manually releases held escrow payout to vendor Connect account
    releasePayout: builder.mutation<IOrder, string>({
      query: (orderId) => ({
        url: `/orders/${orderId}/release`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponseWrapper<IOrder>) => response.data,
      invalidatesTags: ['Order'],
    }),

    // Admin approves order refund and triggers Stripe refunds API
    approveRefund: builder.mutation<IOrder, string>({
      query: (orderId) => ({
        url: `/orders/${orderId}/approve-refund`,
        method: 'POST',
      }),
      transformResponse: (response: ApiResponseWrapper<IOrder>) => response.data,
      invalidatesTags: ['Order'],
    }),

    // Admin/Developer triggers the cron payout release simulation manually
    triggerCron: builder.mutation<any, void>({
      query: () => ({
        url: '/cron/release-payouts',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponseWrapper<any>) => response.data,
      invalidatesTags: ['Order'],
    }),

    // Queries fallback verification on successful checkout redirect page
    verifyCheckoutSuccess: builder.query<IOrder, string>({
      query: (orderId) => `/orders/success/${orderId}`,
      transformResponse: (response: ApiResponseWrapper<IOrder>) => response.data,
      providesTags: ['Order', 'Cart'],
    }),
  }),
});

export const {
  useCreatePaymentIntentMutation,
  useGetOrdersQuery,
  useRequestCancellationMutation,
  useUpdateOrderStatusMutation,
  useReleasePayoutMutation,
  useApproveRefundMutation,
  useTriggerCronMutation,
  useVerifyCheckoutSuccessQuery,
} = paymentApi;
