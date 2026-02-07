// YouTube OAuth configuration and utilities
import crypto from "crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";

// Get the HMAC secret (should be set in environment variables)
function getHmacSecret(): string {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    throw new Error("OAUTH_STATE_SECRET environment variable is not set");
  }
  return secret;
}

// Create an HMAC-signed state token for CSRF protection
export function createSignedState(userId: string): string {
  const timestamp = Date.now();
  const payload = `${userId}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", getHmacSecret());
  hmac.update(payload);
  const signature = hmac.digest("hex");
  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

// Verify and parse an HMAC-signed state token
export function verifySignedState(
  state: string,
  maxAgeMs: number = 10 * 60 * 1000 // 10 minutes default
): { valid: boolean; userId?: string; error?: string } {
  try {
    const decoded = Buffer.from(state, "base64url").toString("utf-8");

    // Parse from the end to handle userIds that contain colons
    // Format: userId:timestamp:signature
    const lastColonIdx = decoded.lastIndexOf(":");
    if (lastColonIdx === -1) {
      return { valid: false, error: "Invalid state format" };
    }

    const signature = decoded.substring(lastColonIdx + 1);
    const remaining = decoded.substring(0, lastColonIdx);

    const secondLastColonIdx = remaining.lastIndexOf(":");
    if (secondLastColonIdx === -1) {
      return { valid: false, error: "Invalid state format" };
    }

    const timestampStr = remaining.substring(secondLastColonIdx + 1);
    const userId = remaining.substring(0, secondLastColonIdx);

    if (!userId || !timestampStr || !signature) {
      return { valid: false, error: "Invalid state format" };
    }

    const timestamp = parseInt(timestampStr, 10);

    // Check timestamp validity
    if (isNaN(timestamp)) {
      return { valid: false, error: "Invalid timestamp" };
    }

    // Check if state has expired
    if (Date.now() - timestamp > maxAgeMs) {
      return { valid: false, error: "State expired" };
    }

    // Verify HMAC signature
    const payload = `${userId}:${timestampStr}`;
    const hmac = crypto.createHmac("sha256", getHmacSecret());
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return { valid: false, error: "Invalid signature" };
    }

    return { valid: true, userId };
  } catch {
    return { valid: false, error: "Failed to parse state" };
  }
}

// Scopes needed for YouTube Data API (readonly is sufficient for fetching videos/transcripts)
const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
];

export function getYouTubeAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI!,
    response_type: "code",
    scope: YOUTUBE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    state,
  });

  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

export interface YouTubeTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<YouTubeTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.NEXT_PUBLIC_YOUTUBE_REDIRECT_URI!,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  return response.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<YouTubeTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return response.json();
}
