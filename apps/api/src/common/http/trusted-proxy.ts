export type TrustProxySetting = boolean | number | string[];

/**
 * Express must only trust proxy addresses explicitly configured by the
 * operator. The production validator rejects broad values; this parser also
 * supports simple local development values for convenience.
 */
export function parseTrustProxy(rawValue: string | undefined): TrustProxySetting {
  const raw = rawValue?.trim() ?? '';
  if (!raw || raw === 'false') {
    return false;
  }
  if (raw === 'true') {
    return true;
  }
  if (/^\d+$/.test(raw)) {
    return Number(raw);
  }
  return raw.split(',').map((value) => value.trim()).filter(Boolean);
}
