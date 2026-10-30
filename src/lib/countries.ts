/**
 * ISO 3166-1 alpha-2 codes for the patient source markets the platform serves.
 * Display names are produced at runtime with Intl.DisplayNames so they are
 * always localized (Arabic / English) without a translation table.
 */
export const COUNTRY_CODES = [
  "SA", "AE", "KW", "QA", "BH", "OM", "YE", "IQ", "JO", "LB", "SY", "PS", "EG", "SD", "LY",
  "TN", "DZ", "MA", "TR", "IR", "PK", "IN", "BD", "AF", "ID", "MY", "PH", "NG", "ET", "SO",
  "KE", "GB", "US", "CA", "DE", "FR", "IT", "ES", "NL", "SE", "RU", "CN", "JP", "KR", "AU",
] as const;

export type CountryCode = (typeof COUNTRY_CODES)[number];

export function isCountryCode(value: unknown): value is CountryCode {
  return typeof value === "string" && (COUNTRY_CODES as readonly string[]).includes(value);
}

export function countryName(code: string | null | undefined, locale: string): string {
  if (!code) return "";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
