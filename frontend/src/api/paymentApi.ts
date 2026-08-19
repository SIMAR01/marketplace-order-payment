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
  idempotencyKey?: string;
}

export interface ICreatePaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  orderId: string;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export const paymentApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Triggers payment initialization on the backend
    createPaymentIntent: builder.mutation<ICreatePaymentIntentResponse, ICreatePaymentIntentParams>({
      query: (body) => ({
        url: '/payments/create-intent',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponseWrapper<ICreatePaymentIntentResponse>) => response.data,
      // Invalidates Cart cache upon checkout initialization (or final webhook handles it)
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const { useCreatePaymentIntentMutation } = paymentApi;
