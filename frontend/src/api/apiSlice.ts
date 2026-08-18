import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// Retrieve base URL from Vite environment metadata (fallback to localhost:5000/api)
const baseUrl = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:5000/api';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl }),
  endpoints: () => ({
    // Endpoint injections will occur in subsequent commits
  }),
});
