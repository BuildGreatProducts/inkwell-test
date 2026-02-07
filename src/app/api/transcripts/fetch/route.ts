import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { internal } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { getVideoTranscript } from "@/lib/youtube/api";
import { refreshAccessToken } from "@/lib/youtube/oauth";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Maximum number of videos to process per request to prevent timeouts
const MAX_BATCH_SIZE = 5;

// Validate Convex ID format (basic validation)
function isValidConvexId(id: string): boolean {
  // Convex IDs are typically alphanumeric strings
  // This is a basic validation - Convex will do the full validation
  return typeof id === "string" && id.length > 0 && /^[a-zA-Z0-9_]+$/.test(id);
}

interface YouTubeTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

interface ConvexUser {
  _id: Id<"users">;
  youtubeConnected: boolean;
  youtubeTokens?: YouTubeTokens;
}

// Helper to refresh access token if needed
async function ensureValidAccessToken(
  user: ConvexUser
): Promise<{ accessToken: string; refreshed: boolean } | { error: string }> {
  if (!user.youtubeTokens) {
    return { error: "No YouTube tokens available" };
  }

  const { accessToken, refreshToken, expiresAt } = user.youtubeTokens;

  // Check if token expires within the next minute
  if (Date.now() >= expiresAt - 60000) {
    try {
      const newTokens = await refreshAccessToken(refreshToken);
      const newExpiresAt = Date.now() + newTokens.expires_in * 1000;

      // Update tokens in database
      await convex.mutation(internal.users.updateYouTubeConnectionInternal, {
        userId: user._id,
        youtubeTokens: {
          accessToken: newTokens.access_token,
          refreshToken: refreshToken, // Preserve original refresh token
          expiresAt: newExpiresAt,
        },
      });

      return { accessToken: newTokens.access_token, refreshed: true };
    } catch (error) {
      console.error("Failed to refresh token:", error);
      return { error: "Failed to refresh YouTube token" };
    }
  }

  return { accessToken, refreshed: false };
}

export async function POST(request: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse JSON body with dedicated error handling
  let projectId: string;
  try {
    const body = await request.json();
    projectId = body.projectId;
  } catch (e) {
    if (e instanceof SyntaxError) {
      return Response.json({ error: "Malformed JSON body" }, { status: 400 });
    }
    throw e;
  }

  if (!projectId) {
    return Response.json({ error: "Project ID required" }, { status: 400 });
  }

  // Validate projectId format before casting
  if (!isValidConvexId(projectId)) {
    return Response.json({ error: "Invalid project ID format" }, { status: 400 });
  }

  try {
    // Get user from Convex using internal query
    const user = await convex.query(internal.users.getByClerkId, { clerkId: userId }) as ConvexUser | null;

    if (!user || !user.youtubeConnected || !user.youtubeTokens) {
      return Response.json({ error: "YouTube account not connected" }, { status: 400 });
    }

    // Verify project ownership before processing
    let project;
    try {
      project = await convex.query(internal.projects.getByIdInternal, {
        projectId: projectId as Id<"projects">,
      });
    } catch {
      return Response.json({ error: "Invalid project ID" }, { status: 400 });
    }

    if (!project) {
      return Response.json({ error: "Project not found" }, { status: 404 });
    }

    // Check that the project belongs to the current user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((project as any).userId.toString() !== user._id.toString()) {
      return Response.json({ error: "Unauthorized: you do not own this project" }, { status: 403 });
    }

    // Get project videos using internal query
    const videos = await convex.query(internal.videos.listByProjectInternal, {
      projectId: projectId as Id<"projects">,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pendingVideos = (videos as any[]).filter(
      (v: { transcriptStatus: string }) => v.transcriptStatus === "pending" || v.transcriptStatus === "fetching"
    );

    if (pendingVideos.length === 0) {
      return Response.json({ message: "No pending transcripts" });
    }

    // Limit batch size to prevent timeouts
    const videosToProcess = pendingVideos.slice(0, MAX_BATCH_SIZE);
    const remaining = pendingVideos.length - videosToProcess.length;

    // Ensure we have a valid access token
    const tokenResult = await ensureValidAccessToken(user);
    if ("error" in tokenResult) {
      return Response.json({ error: tokenResult.error }, { status: 401 });
    }

    const { accessToken } = tokenResult;

    // Process each video
    const results: { videoId: string; status: string }[] = [];

    for (const video of videosToProcess) {
      try {
        // Update status to fetching
        await convex.mutation(internal.videos.updateTranscriptStatusInternal, {
          videoId: video._id,
          status: "fetching",
        });

        // Try to get transcript
        const transcript = await getVideoTranscript(accessToken, video.youtubeId);

        if (transcript) {
          await convex.mutation(internal.videos.updateTranscriptStatusInternal, {
            videoId: video._id,
            status: "completed",
            transcript,
          });
          results.push({ videoId: video._id, status: "completed" });
        } else {
          await convex.mutation(internal.videos.updateTranscriptStatusInternal, {
            videoId: video._id,
            status: "unavailable",
            error: "No transcript available for this video",
          });
          results.push({ videoId: video._id, status: "unavailable" });
        }
      } catch (error) {
        console.error(`Failed to fetch transcript for ${video.youtubeId}:`, error);
        await convex.mutation(internal.videos.updateTranscriptStatusInternal, {
          videoId: video._id,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        });
        results.push({ videoId: video._id, status: "failed" });
      }
    }

    return Response.json({
      results,
      remaining,
      message: remaining > 0 ? `${remaining} more videos pending. Call again to process more.` : undefined,
    });
  } catch (error) {
    console.error("Failed to fetch transcripts:", error);
    return Response.json({ error: "Failed to fetch transcripts" }, { status: 500 });
  }
}
