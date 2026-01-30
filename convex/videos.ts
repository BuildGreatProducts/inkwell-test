// @ts-nocheck
// Note: Types are generated when you run `npx convex dev`
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List videos for a user
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// List videos for a project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// Get a single video by ID
export const getById = query({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.videoId);
  },
});

// Get video by YouTube ID
export const getByYouTubeId = query({
  args: { youtubeId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("videos")
      .withIndex("by_youtube_id", (q) => q.eq("youtubeId", args.youtubeId))
      .first();
  },
});

// Create a new video
export const create = mutation({
  args: {
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    youtubeId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("videos", {
      userId: args.userId,
      projectId: args.projectId,
      youtubeId: args.youtubeId,
      title: args.title,
      description: args.description,
      thumbnailUrl: args.thumbnailUrl,
      duration: args.duration,
      publishedAt: args.publishedAt,
      transcriptStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Batch create videos
export const createBatch = mutation({
  args: {
    userId: v.id("users"),
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
    const now = Date.now();
    const videoIds = [];

    for (const video of args.videos) {
      // Check if video already exists
      const existing = await ctx.db
        .query("videos")
        .withIndex("by_youtube_id", (q) => q.eq("youtubeId", video.youtubeId))
        .first();

      if (existing) {
        videoIds.push(existing._id);
      } else {
        const id = await ctx.db.insert("videos", {
          userId: args.userId,
          projectId: args.projectId,
          youtubeId: video.youtubeId,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          duration: video.duration,
          publishedAt: video.publishedAt,
          transcriptStatus: "pending",
          createdAt: now,
          updatedAt: now,
        });
        videoIds.push(id);
      }
    }

    return videoIds;
  },
});

// Update transcript status
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
    await ctx.db.patch(args.videoId, {
      transcriptStatus: args.status,
      transcript: args.transcript,
      transcriptError: args.error,
      updatedAt: Date.now(),
    });
  },
});

// Update video
export const update = mutation({
  args: {
    videoId: v.id("videos"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const { videoId, ...updates } = args;

    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(videoId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Delete video
export const deleteVideo = mutation({
  args: { videoId: v.id("videos") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.videoId);
  },
});

// Get videos with pending transcripts for a project
export const getPendingTranscripts = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return videos.filter(
      (v) => v.transcriptStatus === "pending" || v.transcriptStatus === "fetching"
    );
  },
});

// Get transcript stats for a project
export const getTranscriptStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return {
      total: videos.length,
      completed: videos.filter((v) => v.transcriptStatus === "completed").length,
      pending: videos.filter((v) => v.transcriptStatus === "pending").length,
      fetching: videos.filter((v) => v.transcriptStatus === "fetching").length,
      failed: videos.filter((v) => v.transcriptStatus === "failed").length,
      unavailable: videos.filter((v) => v.transcriptStatus === "unavailable").length,
    };
  },
});
