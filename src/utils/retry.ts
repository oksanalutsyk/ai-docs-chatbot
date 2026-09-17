/**
 * Retries an async function with exponential backoff on failure.
 * Useful for external API calls that may fail due to transient network issues.
 *
 * @param fn - The async function to retry
 * @param retries - Maximum number of attempts (default: 3)
 * @param delayMs - Initial delay in ms, doubles on each retry (default: 1000)
 * @returns The result of the first successful attempt
 * @throws The last error after all retries are exhausted
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLastAttempt = attempt === retries;
      if (isLastAttempt) throw error;

      console.warn(`⚠️  Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs *= 2; // exponential backoff: 1s → 2s → 4s
    }
  }

  throw new Error('All retry attempts failed');
}
