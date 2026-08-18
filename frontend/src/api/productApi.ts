import { apiSlice } from './apiSlice';

export interface IProductImage {
  url: string;
  publicId: string;
}

export interface IMoney {
  amount: number;
  currency: string;
}

export interface IProduct {
  _id: string;
  title: string;
  description: string;
  price: IMoney;
  stock: number;
  category: string;
  images: IProductImage[];
  provider: string; // User ID of the provider (UUID)
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
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
    getProviderProducts: builder.query<GetProductsResponse, GetProductsParams>({
      query: (params) => ({
        url: '/products',
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
  useGetProviderProductsQuery,
  useGetProviderProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
} = productApi;
