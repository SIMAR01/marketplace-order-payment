import { apiSlice } from './apiSlice';
import { UserProfile, setCredentials, updateProfile, clearCredentials } from '../store/slices/authSlice';

export interface ApiResponse<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password?: string;
  role: 'CUSTOMER' | 'PROVIDER';
  phone?: string;
  businessName?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface AuthResponseData {
  user: UserProfile;
  accessToken: string;
}

export interface ProfileResponseData {
  user: UserProfile;
}

export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    register: builder.mutation<ApiResponse<AuthResponseData>, RegisterRequest>({
      query: (body) => ({
        url: '/auth/register',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data?.data) {
            dispatch(
              setCredentials({
                user: data.data.user,
                accessToken: data.data.accessToken,
              })
            );
          }
        } catch (error) {
          // Failure handled locally in component
        }
      },
    }),
    login: builder.mutation<ApiResponse<AuthResponseData>, LoginRequest>({
      query: (body) => ({
        url: '/auth/login',
        method: 'POST',
        body,
      }),
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data?.data) {
            dispatch(
              setCredentials({
                user: data.data.user,
                accessToken: data.data.accessToken,
              })
            );
          }
        } catch (error) {
          // Failure handled locally in component
        }
      },
    }),
    logout: builder.mutation<ApiResponse<void>, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    getProfile: builder.query<ApiResponse<ProfileResponseData>, void>({
      query: () => '/auth/profile',
      providesTags: ['User'],
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data?.success && data?.data) {
            dispatch(updateProfile(data.data.user));
          }
        } catch (error) {
          dispatch(clearCredentials());
        }
      },
    }),
  }),
});

export const {
  useRegisterMutation,
  useLoginMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useLazyGetProfileQuery,
} = authApi;
