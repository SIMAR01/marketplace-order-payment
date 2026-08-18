export const DEFAULT_CURRENCY = 'USD';
export const SUPPORTED_CURRENCIES = ['USD'];

/**
 * Verifies if a currency code is supported by our application.
 */
export const isSupportedCurrency = (currency: string): boolean => {
  return SUPPORTED_CURRENCIES.includes(currency.toUpperCase());
};
