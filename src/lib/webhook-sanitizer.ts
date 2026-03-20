/**
 * Sanitize webhook payloads before storing in webhook_logs.
 * Strips PII (emails, names, addresses, payment details) to prevent
 * sensitive data accumulation in the database.
 */

const PII_KEYS = new Set([
  // Personal identifiers
  "email", "email_address", "email_addresses",
  "first_name", "last_name", "name", "full_name",
  "phone", "phone_number", "phone_numbers",
  // Address fields
  "address", "line1", "line2", "city", "state", "postal_code", "country",
  "shipping", "billing_details",
  // Payment details
  "card", "last4", "fingerprint", "cvc_check",
  "bank_account", "iban", "routing_number", "account_number",
  // Auth/tokens
  "password", "secret", "token", "api_key", "access_token",
  // Clerk-specific
  "external_accounts", "private_metadata",
]);

const SAFE_KEYS = new Set([
  // IDs are safe (non-PII, needed for debugging)
  "id", "object", "type", "status", "mode", "currency",
  "amount", "amount_due", "amount_paid", "amount_remaining",
  "interval", "interval_count", "trial_end", "trial_start",
  "created", "livemode", "metadata",
  "plan", "quantity", "subscription", "customer",
  "current_period_start", "current_period_end",
  "cancel_at", "canceled_at", "cancel_at_period_end",
  "start_date", "billing_cycle_anchor",
]);

function sanitizeValue(key: string, value: unknown): unknown {
  if (value === null || value === undefined) return value;

  const lowerKey = key.toLowerCase();

  // Redact known PII fields
  if (PII_KEYS.has(lowerKey)) {
    if (typeof value === "string") return "[REDACTED]";
    if (Array.isArray(value)) return `[REDACTED_ARRAY:${value.length}]`;
    if (typeof value === "object") return "[REDACTED_OBJECT]";
    return "[REDACTED]";
  }

  // Recursively sanitize nested objects
  if (Array.isArray(value)) {
    return value.map((item, i) => sanitizeValue(String(i), item));
  }

  if (typeof value === "object") {
    return sanitizeObject(value as Record<string, unknown>);
  }

  return value;
}

function sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    sanitized[key] = sanitizeValue(key, value);
  }
  return sanitized;
}

/**
 * Sanitize a webhook payload by redacting PII fields.
 * Returns a JSON string safe for storage in webhook_logs.
 */
export function sanitizeWebhookPayload(payload: unknown): string {
  if (typeof payload === "string") {
    try {
      const parsed = JSON.parse(payload);
      return JSON.stringify(sanitizeObject(parsed as Record<string, unknown>));
    } catch {
      return "[UNPARSEABLE_PAYLOAD]";
    }
  }

  if (typeof payload === "object" && payload !== null) {
    return JSON.stringify(sanitizeObject(payload as Record<string, unknown>));
  }

  return String(payload);
}
