// Claude API client configuration
import Anthropic from "@anthropic-ai/sdk";

// Maximum tokens for different use cases
export const TOKEN_LIMITS = {
  VOICE_PROFILE: 4096,
  BOOK_CONCEPT: 4096,
  CHAPTER_STRUCTURE: 8192,
  CHAPTER_DRAFT: 16384,
  EDITING: 4096,
} as const;

// Model configurations
export const MODELS = {
  DEFAULT: "claude-sonnet-4-20250514",
  FAST: "claude-sonnet-4-20250514",
} as const;

// Create Anthropic client - should only be used server-side
export function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

// Retry configuration
export const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
} as const;

// Helper to implement exponential backoff
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {}
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    baseDelayMs = RETRY_CONFIG.baseDelayMs,
    maxDelayMs = RETRY_CONFIG.maxDelayMs,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on certain errors
      if (isNonRetryableError(lastError)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        onRetry?.(lastError, attempt + 1);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// Check if an error should not be retried
function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid api key") ||
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("invalid request")
  );
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Estimate token count (rough approximation: ~4 chars per token)
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// Chunk text to fit within token limits
export function chunkText(
  text: string,
  maxTokens: number = 100000,
  overlapTokens: number = 500
): string[] {
  const estimatedTokens = estimateTokenCount(text);

  if (estimatedTokens <= maxTokens) {
    return [text];
  }

  const chunks: string[] = [];
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxChars) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        // Include overlap from end of previous chunk
        const overlapStart = Math.max(0, currentChunk.length - overlapChars);
        currentChunk = currentChunk.slice(overlapStart) + "\n\n" + paragraph;
      } else {
        // Single paragraph is too long, split by sentences
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChars) {
            currentChunk += (currentChunk ? " " : "") + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = sentence;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}
