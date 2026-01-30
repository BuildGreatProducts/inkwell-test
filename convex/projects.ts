// @ts-nocheck
// Note: Types are generated when you run `npx convex dev`
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// List all projects for a user
export const listByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// Get a single project by ID
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

// Get project with related data (videos, voice profile, concept)
export const getWithDetails = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    // Get associated videos
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get voice profile if exists
    const voiceProfile = project.voiceProfileId
      ? await ctx.db.get(project.voiceProfileId)
      : null;

    // Get selected concept if exists
    const selectedConcept = project.selectedConceptId
      ? await ctx.db.get(project.selectedConceptId)
      : null;

    // Get chapters
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return {
      ...project,
      videos,
      voiceProfile,
      selectedConcept,
      chapters: chapters.sort((a, b) => a.orderIndex - b.orderIndex),
    };
  },
});

// Create a new project
export const create = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    return await ctx.db.insert("projects", {
      userId: args.userId,
      name: args.name,
      description: args.description,
      status: "draft",
      selectedVideoIds: [],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update project
export const update = mutation({
  args: {
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("analyzing"),
        v.literal("structuring"),
        v.literal("writing"),
        v.literal("editing"),
        v.literal("completed")
      )
    ),
    selectedVideoIds: v.optional(v.array(v.id("videos"))),
    voiceProfileId: v.optional(v.id("voiceProfiles")),
    selectedConceptId: v.optional(v.id("bookConcepts")),
    coverId: v.optional(v.id("covers")),
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(projectId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Add videos to project
export const addVideos = mutation({
  args: {
    projectId: v.id("projects"),
    videoIds: v.array(v.id("videos")),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const existingIds = new Set(project.selectedVideoIds);
    const newIds = args.videoIds.filter((id) => !existingIds.has(id));

    await ctx.db.patch(args.projectId, {
      selectedVideoIds: [...project.selectedVideoIds, ...newIds],
      updatedAt: Date.now(),
    });

    // Update videos to link to this project
    for (const videoId of newIds) {
      await ctx.db.patch(videoId, { projectId: args.projectId });
    }
  },
});

// Remove videos from project
export const removeVideos = mutation({
  args: {
    projectId: v.id("projects"),
    videoIds: v.array(v.id("videos")),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const removeSet = new Set(args.videoIds);
    const remainingIds = project.selectedVideoIds.filter((id) => !removeSet.has(id));

    await ctx.db.patch(args.projectId, {
      selectedVideoIds: remainingIds,
      updatedAt: Date.now(),
    });

    // Unlink videos from project
    for (const videoId of args.videoIds) {
      await ctx.db.patch(videoId, { projectId: undefined });
    }
  },
});

// Delete project and all related data
export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) return;

    // Delete related videos
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const video of videos) {
      await ctx.db.delete(video._id);
    }

    // Delete voice profiles
    const voiceProfiles = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const vp of voiceProfiles) {
      await ctx.db.delete(vp._id);
    }

    // Delete book concepts
    const concepts = await ctx.db
      .query("bookConcepts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const concept of concepts) {
      await ctx.db.delete(concept._id);
    }

    // Delete chapters and their drafts
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const chapter of chapters) {
      const drafts = await ctx.db
        .query("chapterDrafts")
        .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id))
        .collect();
      for (const draft of drafts) {
        await ctx.db.delete(draft._id);
      }
      await ctx.db.delete(chapter._id);
    }

    // Delete covers
    const covers = await ctx.db
      .query("covers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const cover of covers) {
      await ctx.db.delete(cover._id);
    }

    // Finally delete the project
    await ctx.db.delete(args.projectId);
  },
});
