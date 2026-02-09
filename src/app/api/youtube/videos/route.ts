import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { getMyVideos, searchMyVideos } from "@/lib/youtube/api";
import { refreshAccessToken } from "@/lib/youtube/oauth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function GET(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const pageToken = searchParams.get("pageToken") || undefined;
  const maxResults = parseInt(searchParams.get("maxResults") || "25", 10);
  const searchQuery = searchParams.get("q") || undefined;
  const publishedAfter = searchParams.get("publishedAfter") || undefined;
  const publishedBefore = searchParams.get("publishedBefore") || undefined;

  try {
    // Get user from Convex
    const user = await convex.query(api.users.getByClerkId, { clerkId: userId });

    if (!user || !user.youtubeConnected || !user.youtubeTokens) {
      return Response.json({ error: "YouTube account not connected" }, { status: 400 });
    }

    let accessToken = user.youtubeTokens.accessToken;

    // Check if token is expired and refresh if needed
    if (Date.now() >= user.youtubeTokens.expiresAt - 60000) {
      // Refresh 1 minute before expiry
      try {
        const newTokens = await refreshAccessToken(user.youtubeTokens.refreshToken);
        const expiresAt = Date.now() + newTokens.expires_in * 1000;

        await convex.mutation(api.users.updateYouTubeConnection, {
          userId: user._id,
          youtubeTokens: {
            accessToken: newTokens.access_token,
            refreshToken: user.youtubeTokens.refreshToken,
            expiresAt,
          },
        });

        accessToken = newTokens.access_token;
      } catch (error) {
        console.error("Failed to refresh token:", error);
        return Response.json({ error: "Failed to refresh YouTube token" }, { status: 401 });
      }
    }

    // Fetch videos
    let result;
    if (searchQuery) {
      result = await searchMyVideos(accessToken, searchQuery, { pageToken, maxResults });
    } else {
      result = await getMyVideos(accessToken, {
        pageToken,
        maxResults,
        publishedAfter,
        publishedBefore,
        searchQuery,
      });
    }

    return Response.json(result);
  } catch (error) {
    console.error("Failed to fetch videos:", error);
    return Response.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}
