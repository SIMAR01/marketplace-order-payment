import { apiSlice } from './apiSlice';

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IMoney {
  amount: number;
  currency: string;
}

export interface IProviderInfo {
  _id: string;
  name: string;
  email: string;
  businessName?: string;
  phone?: string;
}

export interface IProduct {
  _id: string;
  title: string;
  description: string;
  price: IMoney;
  stock: number;
  category: string;
  images: IProductImage[];
  provider: IProviderInfo | string; // Can be populated object or raw ID string
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetProductsParams {
  page?: number;
  limit?: number;
  keyword?: string;
  category?: string;
  sortBy?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export interface GetProductsResponse {
  products: IProduct[];
  total: number;
  page: number;
  totalPages: number;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export const productApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Public Catalog Search query
    getProducts: builder.query<GetProductsResponse, GetProductsParams>({
      query: (params) => ({
        url: '/products',
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponseWrapper<GetProductsResponse>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(({ _id }) => ({ type: 'Product' as const, id: _id })),
              { type: 'Product', id: 'LIST' },
            ]
          : [{ type: 'Product', id: 'LIST' }],
    }),

    // Public Product Detail Page (PDP) query
    getProductById: builder.query<IProduct, string>({
      query: (id) => `/products/${id}`,
      transformResponse: (response: ApiResponseWrapper<IProduct>) => response.data,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),

    // Protected Merchant Inventory list query
    getProviderProducts: builder.query<GetProductsResponse, GetProductsParams>({
      query: (params) => ({
        url: '/products/inventory',
        method: 'GET',
        params,
      }),
      transformResponse: (response: ApiResponseWrapper<GetProductsResponse>) => response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.products.map(({ _id }) => ({ type: 'ProviderProducts' as const, id: _id })),
              { type: 'ProviderProducts', id: 'LIST' },
            ]
          : [{ type: 'ProviderProducts', id: 'LIST' }],
    }),

    // Protected Merchant Product Detail lookup
    getProviderProductById: builder.query<IProduct, string>({
      query: (id) => `/products/${id}`,
      transformResponse: (response: ApiResponseWrapper<IProduct>) => response.data,
      providesTags: (_result, _error, id) => [
        { type: 'Product', id },
        { type: 'Product', id: 'DETAIL' },
      ],
    }),

    createProduct: builder.mutation<IProduct, FormData>({
      query: (formData) => ({
        url: '/products',
        method: 'POST',
        body: formData,
      }),
      transformResponse: (response: ApiResponseWrapper<IProduct>) => response.data,
      invalidatesTags: [
        { type: 'ProviderProducts', id: 'LIST' },
        { type: 'Product', id: 'LIST' },
      ],
    }),

    updateProduct: builder.mutation<IProduct, { id: string; formData: FormData }>({
      query: ({ id, formData }) => ({
        url: `/products/${id}`,
        method: 'PATCH',
        body: formData,
      }),
      transformResponse: (response: ApiResponseWrapper<IProduct>) => response.data,
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Product', id },
        { type: 'Product', id: 'DETAIL' },
        { type: 'ProviderProducts', id: 'LIST' },
      ],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: `/products/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [
        { type: 'Product', id },
        { type: 'Product', id: 'DETAIL' },
        { type: 'ProviderProducts', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductByIdQuery,
  useGetProviderProductsQuery,
  useGetProviderProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
