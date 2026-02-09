import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Maximum number of videos allowed in a single batch to prevent timeouts/quota issues
const MAX_VIDEOS_BATCH = 50;

// Helper to get current user from auth context
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCurrentUser(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: { eq: (field: string, value: string) => unknown }) => q.eq("clerkId", identity.subject))
    .first();

  return user;
}

// List videos for the current user
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// List videos for a project - with ownership check
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      return [];
    }

    return await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// Get a single video by ID - with ownership check
export const getById = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const video = await ctx.db.get(args.videoId);
    if (!video || !video.userId || !user._id || video.userId.toString() !== user._id.toString()) {
      return null;
    }

    return video;
  },
});

// Get video by YouTube ID - scoped to current user
export const getByYouTubeId = query({
  args: { youtubeId: v.string() },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    return await ctx.db
      .query("videos")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .withIndex("by_user_youtube_id", (q: any) =>
        q.eq("userId", user._id).eq("youtubeId", args.youtubeId)
      )
      .first();
  },
});

// Create a new video - uses auth context to get userId
export const create = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    youtubeId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    // If projectId is provided, verify ownership
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized: you do not own this project");
      }
    }

    const now = Date.now();

    const insertData: {
      userId: Id<"users">;
      projectId?: Id<"projects">;
      youtubeId: string;
      title: string;
      description?: string;
      thumbnailUrl?: string;
      duration?: string;
      publishedAt?: string;
      transcriptStatus: "pending";
      createdAt: number;
      updatedAt: number;
    } = {
      userId: user._id,
      youtubeId: args.youtubeId,
      title: args.title,
      transcriptStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };
    if (args.projectId !== undefined) insertData.projectId = args.projectId;
    if (args.description !== undefined) insertData.description = args.description;
    if (args.thumbnailUrl !== undefined) insertData.thumbnailUrl = args.thumbnailUrl;
    if (args.duration !== undefined) insertData.duration = args.duration;
    if (args.publishedAt !== undefined) insertData.publishedAt = args.publishedAt;

    return await ctx.db.insert("videos", insertData);
  },
});

// Batch create videos - with user-scoped deduplication
export const createBatch = mutation({
  args: {
    projectId: v.optional(v.id("projects")),
    videos: v.array(
      v.object({
        youtubeId: v.string(),
        title: v.string(),
        description: v.optional(v.string()),
        thumbnailUrl: v.optional(v.string()),
        duration: v.optional(v.string()),
        publishedAt: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Validate batch size to prevent timeouts and quota issues
    if (args.videos.length > MAX_VIDEOS_BATCH) {
      throw new Error(`Too many videos: max ${MAX_VIDEOS_BATCH} per batch`);
    }

    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    // If projectId is provided, verify ownership
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized: you do not own this project");
      }
    }

    const now = Date.now();
    const videoIds: Id<"videos">[] = [];

    for (const video of args.videos) {
      // Check if video already exists FOR THIS USER using compound index
      const existing = await ctx.db
        .query("videos")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex("by_user_youtube_id", (q: any) =>
          q.eq("userId", user._id).eq("youtubeId", video.youtubeId)
        )
        .first();

      if (existing) {
        videoIds.push(existing._id as Id<"videos">);
      } else {
        const insertData: {
          userId: Id<"users">;
          projectId?: Id<"projects">;
          youtubeId: string;
          title: string;
          description?: string;
          thumbnailUrl?: string;
          duration?: string;
          publishedAt?: string;
          transcriptStatus: "pending";
          createdAt: number;
          updatedAt: number;
        } = {
          userId: user._id,
          youtubeId: video.youtubeId,
          title: video.title,
          transcriptStatus: "pending",
          createdAt: now,
          updatedAt: now,
        };
        if (args.projectId !== undefined) insertData.projectId = args.projectId;
        if (video.description !== undefined) insertData.description = video.description;
        if (video.thumbnailUrl !== undefined) insertData.thumbnailUrl = video.thumbnailUrl;
        if (video.duration !== undefined) insertData.duration = video.duration;
        if (video.publishedAt !== undefined) insertData.publishedAt = video.publishedAt;

        const id = await ctx.db.insert("videos", insertData);
        videoIds.push(id);
      }
    }

    return videoIds;
  },
});

// Update transcript status - with ownership check
export const updateTranscriptStatus = mutation({
  args: {
    videoId: v.id("videos"),
    status: v.union(
      v.literal("pending"),
      v.literal("fetching"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("unavailable")
    ),
    transcript: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    const video = await ctx.db.get(args.videoId);
    if (!video || !video.userId || !user._id || video.userId.toString() !== user._id.toString()) {
      throw new Error("Unauthorized: you do not own this video");
    }

    await ctx.db.patch(args.videoId, {
      transcriptStatus: args.status,
      transcript: args.transcript,
      transcriptError: args.error,
      updatedAt: Date.now(),
    });
  },
});

// Update video - with ownership check
export const update = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    const video = await ctx.db.get(args.videoId);
    if (!video || !video.userId || !user._id || video.userId.toString() !== user._id.toString()) {
      throw new Error("Unauthorized: you do not own this video");
    }

    // If updating projectId, verify ownership of target project
    if (args.projectId) {
      const project = await ctx.db.get(args.projectId);
      if (!project || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
        throw new Error("Unauthorized: you do not own the target project");
      }
    }

    const { videoId, ...updates } = args;

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(videoId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete video - with ownership check
export const deleteVideo = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    const video = await ctx.db.get(args.videoId);
    if (!video || !video.userId || !user._id || video.userId.toString() !== user._id.toString()) {
      throw new Error("Unauthorized: you do not own this video");
    }

    await ctx.db.delete(args.videoId);
  },
});

// Get videos with pending transcripts for a project - with ownership check
export const getPendingTranscripts = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      return [];
    }

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return videos.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (v: any) => v.transcriptStatus === "pending" || v.transcriptStatus === "fetching"
    );
  },
});

// Get transcript stats for a project - with ownership check
export const getTranscriptStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    // Verify project ownership
    const project = await ctx.db.get(args.projectId);
    if (!project || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      return null;
    }

    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return {
      total: videos.length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      completed: videos.filter((v: any) => v.transcriptStatus === "completed").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      pending: videos.filter((v: any) => v.transcriptStatus === "pending").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetching: videos.filter((v: any) => v.transcriptStatus === "fetching").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      failed: videos.filter((v: any) => v.transcriptStatus === "failed").length,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      unavailable: videos.filter((v: any) => v.transcriptStatus === "unavailable").length,
    };
  },
});

// ============================================
// Internal functions for server-side use only
// ============================================

// List videos for a project - INTERNAL (no auth check, for server-side use)
export const listByProjectInternal = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// Update transcript status - INTERNAL (no auth check, for server-side use)
export const updateTranscriptStatusInternal = internalMutation({
  args: {
    videoId: v.id("videos"),
    status: v.union(
      v.literal("pending"),
      v.literal("fetching"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("unavailable")
    ),
    transcript: v.optional(v.string()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.videoId, {
      transcriptStatus: args.status,
      transcript: args.transcript,
      transcriptError: args.error,
      updatedAt: Date.now(),
    });
  },
});
