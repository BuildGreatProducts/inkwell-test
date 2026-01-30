import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getVideoTranscript } from "@/lib/youtube/api";
import { refreshAccessToken } from "@/lib/youtube/oauth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await request.json();

  if (!projectId) {
    return Response.json({ error: "Project ID required" }, { status: 400 });
  }

  try {
    // Get user from Convex
    const user = await convex.query(api.users.getByClerkId, { clerkId: userId });

    if (!user || !user.youtubeConnected || !user.youtubeTokens) {
      return Response.json({ error: "YouTube account not connected" }, { status: 400 });
    }

    // Get project videos
    const videos = await convex.query(api.videos.listByProject, {
      projectId: projectId as Id<"projects">,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingVideos = (videos as any[]).filter(
      (v: { transcriptStatus: string }) => v.transcriptStatus === "pending" || v.transcriptStatus === "fetching"
    );

    if (pendingVideos.length === 0) {
      return Response.json({ message: "No pending transcripts" });
    }

    // Refresh token if needed
    let accessToken = user.youtubeTokens.accessToken;
    if (Date.now() >= user.youtubeTokens.expiresAt - 60000) {
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

    // Process each video
    const results: { videoId: string; status: string }[] = [];

    for (const video of pendingVideos) {
      try {
        // Update status to fetching
        await convex.mutation(api.videos.updateTranscriptStatus, {
          videoId: video._id,
          status: "fetching",
        });

        // Try to get transcript
        const transcript = await getVideoTranscript(accessToken, video.youtubeId);

        if (transcript) {
          await convex.mutation(api.videos.updateTranscriptStatus, {
            videoId: video._id,
            status: "completed",
            transcript,
          });
          results.push({ videoId: video._id, status: "completed" });
        } else {
          await convex.mutation(api.videos.updateTranscriptStatus, {
            videoId: video._id,
            status: "unavailable",
            error: "No transcript available for this video",
          });
          results.push({ videoId: video._id, status: "unavailable" });
        }
      } catch (error) {
        console.error(`Failed to fetch transcript for ${video.youtubeId}:`, error);
        await convex.mutation(api.videos.updateTranscriptStatus, {
          videoId: video._id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        results.push({ videoId: video._id, status: "failed" });
      }
    }

    return Response.json({ results });
  } catch (error) {
    console.error("Failed to fetch transcripts:", error);
    return Response.json({ error: "Failed to fetch transcripts" }, { status: 500 });
  }
}
