import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { clearCredentials, updateAccessToken } from '../store/slices/authSlice';

const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Create base query with cookie credentials enabled
const baseQuery = fetchBaseQuery({
  baseUrl,
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { token: string | null } }).auth.token;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Refresh lock and subscriber queue variables
let isRefreshing = false;
let refreshSubscribers: ((token: string | null) => void)[] = [];

const subscribeTokenRefresh = (cb: (token: string | null) => void) => {
  refreshSubscribers.push(cb);
};

const onTokenRefreshed = (token: string | null) => {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// Custom base query that handles 401 token refresh queueing
export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const url = typeof args === 'string' ? args : args.url;
    
    // Prevent refresh loop on auth endpoints
    if (
      url.includes('/auth/refresh') ||
      url.includes('/auth/login') ||
      url.includes('/auth/register')
    ) {
      return result;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        // Call refresh endpoint to obtain a new access token
        const refreshResult = await baseQuery(
          {
            url: '/auth/refresh',
            method: 'POST',
          },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          // Adapt to the backend response wrapper: data.accessToken
          const responseData = refreshResult.data as {
            success: boolean;
            statusCode: number;
            message: string;
            data: { accessToken: string };
          };

          const newAccessToken = responseData?.data?.accessToken;

          if (newAccessToken) {
            api.dispatch(updateAccessToken(newAccessToken));
            onTokenRefreshed(newAccessToken);
            isRefreshing = false;

            // Retry original request with the new token
            result = await baseQuery(args, api, extraOptions);
          } else {
            throw new Error('No access token in refresh response');
          }
        } else {
          throw new Error('Refresh request failed');
        }
      } catch (error) {
        isRefreshing = false;
        onTokenRefreshed(null);
        api.dispatch(clearCredentials());
      }
    } else {
      // An active refresh is already running; queue this request
      const waitForRefresh = new Promise<string | null>((resolve) => {
        subscribeTokenRefresh((token) => {
          resolve(token);
        });
      });

      const token = await waitForRefresh;
      if (token) {
        // Retry original query with the new token manually injected
        const newArgs = typeof args === 'string' 
          ? { url: args, headers: { Authorization: `Bearer ${token}` } }
          : {
              ...args,
              headers: {
                ...args.headers,
                Authorization: `Bearer ${token}`,
              },
            };
        result = await baseQuery(newArgs, api, extraOptions);
      }
    }
  }

  return result;
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User'],
  endpoints: () => ({}),
});
