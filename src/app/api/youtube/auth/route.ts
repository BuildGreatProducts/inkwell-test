import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getYouTubeAuthUrl } from "@/lib/youtube/oauth";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Generate a state parameter to prevent CSRF attacks
  // In production, you'd want to store this in a session or cookie
  const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString("base64");

  const authUrl = getYouTubeAuthUrl(state);

  redirect(authUrl);
}
