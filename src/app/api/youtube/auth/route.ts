import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getYouTubeAuthUrl, createSignedState } from "@/lib/youtube/oauth";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Generate an HMAC-signed state parameter for CSRF protection
  const state = createSignedState(userId);

  const authUrl = getYouTubeAuthUrl(state);

  redirect(authUrl);
}
