import { apiSlice } from './apiSlice';

export interface IStripeConnectStatus {
  isConnected: boolean;
  isStripeReady: boolean;
  detailsSubmitted: boolean;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export const stripeConnectApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Check Stripe Connect account status
    getStripeStatus: builder.query<IStripeConnectStatus, void>({
      query: () => '/stripe/status',
      transformResponse: (response: ApiResponseWrapper<IStripeConnectStatus>) => response.data,
      providesTags: ['User'],
    }),

    // Initialize/resume Connect onboarding link creation
    createOnboardingLink: builder.mutation<{ url: string }, void>({
      query: () => ({
        url: '/stripe/onboarding-link',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponseWrapper<{ url: string }>) => response.data,
      invalidatesTags: ['User'],
    }),

    // Generate Connect Express Dashboard login link
    createLoginLink: builder.mutation<{ url: string }, void>({
      query: () => ({
        url: '/stripe/login-link',
        method: 'POST',
      }),
      transformResponse: (response: ApiResponseWrapper<{ url: string }>) => response.data,
    }),
  }),
});

export const {
  useGetStripeStatusQuery,
  useCreateOnboardingLinkMutation,
  useCreateLoginLinkMutation,
} = stripeConnectApi;
