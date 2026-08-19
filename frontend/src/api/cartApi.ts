import { apiSlice } from './apiSlice';

export interface ICartProduct {
  _id: string;
  title: string;
  description: string;
  price: {
    amount: number; // Decimal dollar amount
    currency: string;
  };
  stock: number;
  category: string;
  images: Array<{ url: string; publicId: string }>;
  isDeleted: boolean;
}

export interface ICartItem {
  product: ICartProduct;
  quantity: number;
  subtotal: number;
  isOutOfStock: boolean;
  hasInsufficientStock: boolean;
}

export interface ICartTotals {
  subtotal: number;
  shippingFee: number;
  tax: number;
  totalAmount: number;
}

export interface IVendorPackage {
  provider: {
    _id: string;
    name: string;
    businessName?: string;
    stripeAccountId?: string;
    isStripeReady: boolean;
  };
  items: ICartItem[];
  totals: ICartTotals;
  hasWarnings: boolean;
}

export interface ICartResponse {
  _id: string;
  user: string;
  vendorPackages: IVendorPackage[];
  totalCartItemsCount: number;
  hasWarnings: boolean;
}

interface ApiResponseWrapper<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export const cartApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // Fetch active customer cart
    getCart: builder.query<ICartResponse, void>({
      query: () => '/cart',
      transformResponse: (response: ApiResponseWrapper<ICartResponse>) => response.data,
      providesTags: ['Cart'],
    }),

    // Add or increment product in cart
    addToCart: builder.mutation<ICartResponse, { productId: string; quantity?: number }>({
      query: (body) => ({
        url: '/cart',
        method: 'POST',
        body,
      }),
      transformResponse: (response: ApiResponseWrapper<ICartResponse>) => response.data,
      invalidatesTags: ['Cart'],
    }),

    // Update quantity of product in cart
    updateCartItem: builder.mutation<ICartResponse, { productId: string; quantity: number }>({
      query: (body) => ({
        url: '/cart/item',
        method: 'PATCH',
        body,
      }),
      transformResponse: (response: ApiResponseWrapper<ICartResponse>) => response.data,
      invalidatesTags: ['Cart'],
    }),

    // Remove single product from cart
    removeFromCart: builder.mutation<ICartResponse, string>({
      query: (productId) => ({
        url: `/cart/item/${productId}`,
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponseWrapper<ICartResponse>) => response.data,
      invalidatesTags: ['Cart'],
    }),

    // Clear entire cart
    clearCart: builder.mutation<ICartResponse, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      transformResponse: (response: ApiResponseWrapper<ICartResponse>) => response.data,
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveFromCartMutation,
  useClearCartMutation,
} = cartApi;
