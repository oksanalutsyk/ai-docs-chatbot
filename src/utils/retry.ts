// Retry a function with exponential backoff on failure
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

      // Exponential backoff: 1s → 2s → 4s
      delayMs *= 2;
    }
  }

  throw new Error('All retry attempts failed');
}