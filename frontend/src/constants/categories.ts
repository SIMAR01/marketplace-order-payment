export const PRODUCT_CATEGORIES = [
  'ELECTRONICS',
  'FASHION_APPAREL',
  'HOME_LIVING',
  'HEALTH_BEAUTY',
  'GROCERY_GOURMET',
  'SPORTS_OUTDOORS',
  'BOOKS_STATIONERY',
  'TOYS_GAMES',
  'AUTOMOTIVE_PARTS',
  'OFFICE_SUPPLIES',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  ELECTRONICS: 'Electronics & Gadgets',
  FASHION_APPAREL: 'Fashion & Apparel',
  HOME_LIVING: 'Home, Kitchen & Living',
  HEALTH_BEAUTY: 'Beauty & Personal Care',
  GROCERY_GOURMET: 'Grocery & Gourmet Food',
  SPORTS_OUTDOORS: 'Sports, Fitness & Outdoors',
  BOOKS_STATIONERY: 'Books & Stationery',
  TOYS_GAMES: 'Toys, Games & Hobbies',
  AUTOMOTIVE_PARTS: 'Automotive & Accessories',
  OFFICE_SUPPLIES: 'Office & Tech Accessories',
};
