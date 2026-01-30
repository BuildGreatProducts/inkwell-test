import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { exchangeCodeForTokens } from "@/lib/youtube/oauth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Handle error from Google
  if (error) {
    console.error("YouTube OAuth error:", error);
    redirect("/settings/youtube?error=oauth_denied");
  }

  // Verify we have a code
  if (!code) {
    redirect("/settings/youtube?error=no_code");
  }

  // Verify state parameter
  if (state) {
    try {
      const decodedState = JSON.parse(Buffer.from(state, "base64").toString());
      if (decodedState.userId !== userId) {
        redirect("/settings/youtube?error=invalid_state");
      }
    } catch {
      redirect("/settings/youtube?error=invalid_state");
    }
  }

  try {
    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    // Get the Convex user
    const convexUser = await convex.query(api.users.getByClerkId, { clerkId: userId });

    if (!convexUser) {
      redirect("/settings/youtube?error=user_not_found");
    }

    // Calculate token expiry time
    const expiresAt = Date.now() + tokens.expires_in * 1000;

    // Store tokens in Convex
    await convex.mutation(api.users.updateYouTubeConnection, {
      userId: convexUser._id,
      youtubeTokens: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || "",
        expiresAt,
      },
    });

    redirect("/settings/youtube?success=true");
  } catch (err) {
    console.error("Failed to complete YouTube OAuth:", err);
    redirect("/settings/youtube?error=token_exchange_failed");
  }
}
