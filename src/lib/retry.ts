/**
 * Generic retry wrapper with exponential backoff.
 * Used for external API calls (Telegram, MailerLite) where transient failures are common.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number;
    backoffMs?: number;
    label?: string;
  } = {}
): Promise<T> {
  const { maxAttempts = 3, backoffMs = 2000, label = "operation" } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      console.error(`[retry] ${label} attempt ${attempt}/${maxAttempts} failed:`, error);

      if (attempt === maxAttempts) {
        throw error;
      }

      // Exponential backoff: 2s, 4s, 8s
      const delay = backoffMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Unreachable, but satisfies TypeScript
  throw new Error(`${label} failed after ${maxAttempts} attempts`);
}
