import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api, internal } from "../../../../../convex/_generated/api";
import { exchangeCodeForTokens, verifySignedState } from "@/lib/youtube/oauth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Helper to create redirect URL
function getRedirectUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}${path}`;
}

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.redirect(getRedirectUrl("/sign-in"));
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Handle error from Google
  if (error) {
    console.error("YouTube OAuth error:", error);
    return Response.redirect(getRedirectUrl("/settings/youtube?error=oauth_denied"));
  }

  // Verify we have a code
  if (!code) {
    return Response.redirect(getRedirectUrl("/settings/youtube?error=no_code"));
  }

  // Verify state parameter with HMAC signature
  if (!state) {
    return Response.redirect(getRedirectUrl("/settings/youtube?error=missing_state"));
  }

  const stateResult = verifySignedState(state);
  if (!stateResult.valid) {
    console.error("Invalid OAuth state:", stateResult.error);
    return Response.redirect(getRedirectUrl("/settings/youtube?error=invalid_state"));
  }

  // Verify the state userId matches the authenticated user
  if (stateResult.userId !== userId) {
    console.error("OAuth state userId mismatch");
    return Response.redirect(getRedirectUrl("/settings/youtube?error=invalid_state"));
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get the Convex user using internal query
    const convexUser = await convex.query(internal.users.getByClerkId, { clerkId: userId });

    if (!convexUser) {
      return Response.redirect(getRedirectUrl("/settings/youtube?error=user_not_found"));
    }

    // Calculate token expiry time
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Preserve existing refresh token if not provided in response
    // (Google only sends refresh_token on first authorization)
    let refreshToken = tokens.refresh_token;
    if (!refreshToken && convexUser.youtubeTokens?.refreshToken) {
      refreshToken = convexUser.youtubeTokens.refreshToken;
    }

    if (!refreshToken) {
      console.error("No refresh token available");
      return Response.redirect(getRedirectUrl("/settings/youtube?error=no_refresh_token"));
    }

    // Store tokens in Convex using internal mutation (server-side)
    await convex.mutation(internal.users.updateYouTubeConnectionInternal, {
      userId: convexUser._id,
      youtubeTokens: {
        accessToken: tokens.access_token,
        refreshToken,
        expiresAt,
      },
    });

    return Response.redirect(getRedirectUrl("/settings/youtube?success=true"));
  } catch (err) {
    console.error("Failed to complete YouTube OAuth:", err);
    return Response.redirect(getRedirectUrl("/settings/youtube?error=token_exchange_failed"));
  }
}
