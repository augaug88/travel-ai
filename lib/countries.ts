// Passport countries offered in the visa check. Codes are ISO 3166-1 alpha-2.
export const COUNTRIES: { code: string; name: string }[] = [
  { code: 'AR', name: 'Argentina' }, { code: 'AU', name: 'Australia' }, { code: 'AT', name: 'Austria' },
  { code: 'BD', name: 'Bangladesh' }, { code: 'BE', name: 'Belgium' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'KH', name: 'Cambodia' }, { code: 'CA', name: 'Canada' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' },
  { code: 'CZ', name: 'Czechia' }, { code: 'DK', name: 'Denmark' }, { code: 'EG', name: 'Egypt' },
  { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' }, { code: 'DE', name: 'Germany' },
  { code: 'GR', name: 'Greece' }, { code: 'HK', name: 'Hong Kong' }, { code: 'HU', name: 'Hungary' },
  { code: 'IS', name: 'Iceland' }, { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' }, { code: 'IT', name: 'Italy' },
  { code: 'JP', name: 'Japan' }, { code: 'KE', name: 'Kenya' }, { code: 'LA', name: 'Laos' },
  { code: 'MO', name: 'Macau' }, { code: 'MY', name: 'Malaysia' }, { code: 'MX', name: 'Mexico' },
  { code: 'MA', name: 'Morocco' }, { code: 'MM', name: 'Myanmar' }, { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Norway' }, { code: 'PK', name: 'Pakistan' }, { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' }, { code: 'SA', name: 'Saudi Arabia' },
  { code: 'SG', name: 'Singapore' }, { code: 'ZA', name: 'South Africa' }, { code: 'KR', name: 'South Korea' },
  { code: 'ES', name: 'Spain' }, { code: 'LK', name: 'Sri Lanka' }, { code: 'SE', name: 'Sweden' },
  { code: 'CH', name: 'Switzerland' }, { code: 'TW', name: 'Taiwan' }, { code: 'TH', name: 'Thailand' },
  { code: 'TR', name: 'Türkiye' }, { code: 'AE', name: 'United Arab Emirates' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' }, { code: 'VN', name: 'Vietnam' },
];

export function findCountry(value: string | undefined) {
  if (!value) return undefined;
  const v = value.trim().toLowerCase();
  return COUNTRIES.find((c) => c.code.toLowerCase() === v || c.name.toLowerCase() === v);
}
