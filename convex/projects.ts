import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel";

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

// Helper to verify project ownership
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function verifyProjectOwnership(ctx: any, projectId: Id<"projects">) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthorized: not authenticated");
  }

  const project = await ctx.db.get(projectId);
  if (!project) {
    throw new Error("Project not found");
  }

  // Get user by clerkId to compare userId
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q: { eq: (field: string, value: string) => unknown }) => q.eq("clerkId", identity.subject))
    .first();

  if (!user || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
    throw new Error("Unauthorized: you do not own this project");
  }

  return { identity, project, user };
}

// List all projects for a user - uses auth context instead of client-supplied userId
export const listByUser = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("projects")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Get a single project by ID - with ownership check
export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    if (!project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      return null; // Don't leak project existence to non-owners
    }

    return project;
  },
});

// Get project with related data (videos, voice profile, concept) - with ownership check
export const getWithDetails = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      return null;
    }

    const project = await ctx.db.get(args.projectId);
    if (!project) return null;

    if (!project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      return null; // Don't leak project existence to non-owners
    }

    // Get associated videos
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    // Get voice profile if exists
    const voiceProfile = project.voiceProfileId
      ? await ctx.db.get(project.voiceProfileId as Id<"voiceProfiles">)
      : null;

    // Get selected concept if exists
    const selectedConcept = project.selectedConceptId
      ? await ctx.db.get(project.selectedConceptId as Id<"bookConcepts">)
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chapters: chapters.sort((a: any, b: any) => a.orderIndex - b.orderIndex),
    };
  },
});

// Create a new project - uses auth context to get userId
export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    const now = Date.now();

    const insertData: {
      userId: Id<"users">;
      name: string;
      description?: string;
      status: "draft";
      selectedVideoIds: Id<"videos">[];
      createdAt: number;
      updatedAt: number;
    } = {
      userId: user._id,
      name: args.name,
      status: "draft",
      selectedVideoIds: [],
      createdAt: now,
      updatedAt: now,
    };

    if (args.description !== undefined) {
      insertData.description = args.description;
    }

    return await ctx.db.insert("projects", insertData);
  },
});

// Update project basic fields - with ownership verification
// Note: For updating selectedVideoIds, use addVideos/removeVideos mutations
// For voiceProfileId, selectedConceptId, coverId - use dedicated setters that verify ownership
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
  },
  handler: async (ctx, args) => {
    // Verify ownership
    await verifyProjectOwnership(ctx, args.projectId);

    const { projectId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(projectId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Set voice profile for project - with ownership verification
export const setVoiceProfile = mutation({
  args: {
    projectId: v.id("projects"),
    voiceProfileId: v.id("voiceProfiles"),
  },
  handler: async (ctx, args) => {
    // Verify project ownership
    await verifyProjectOwnership(ctx, args.projectId);

    // Verify voice profile belongs to this project
    const voiceProfile = await ctx.db.get(args.voiceProfileId);
    if (!voiceProfile) {
      throw new Error("Voice profile not found");
    }
    if (!voiceProfile.projectId || voiceProfile.projectId.toString() !== args.projectId.toString()) {
      throw new Error("Unauthorized: voice profile does not belong to this project");
    }

    await ctx.db.patch(args.projectId, {
      voiceProfileId: args.voiceProfileId,
      updatedAt: Date.now(),
    });
  },
});

// Set selected book concept for project - with ownership verification
export const setSelectedConcept = mutation({
  args: {
    projectId: v.id("projects"),
    conceptId: v.id("bookConcepts"),
  },
  handler: async (ctx, args) => {
    // Verify project ownership
    await verifyProjectOwnership(ctx, args.projectId);

    // Verify concept belongs to this project
    const concept = await ctx.db.get(args.conceptId);
    if (!concept) {
      throw new Error("Book concept not found");
    }
    if (!concept.projectId || concept.projectId.toString() !== args.projectId.toString()) {
      throw new Error("Unauthorized: book concept does not belong to this project");
    }

    await ctx.db.patch(args.projectId, {
      selectedConceptId: args.conceptId,
      updatedAt: Date.now(),
    });
  },
});

// Set cover for project - with ownership verification
export const setCover = mutation({
  args: {
    projectId: v.id("projects"),
    coverId: v.id("covers"),
  },
  handler: async (ctx, args) => {
    // Verify project ownership
    await verifyProjectOwnership(ctx, args.projectId);

    // Verify cover belongs to this project
    const cover = await ctx.db.get(args.coverId);
    if (!cover) {
      throw new Error("Cover not found");
    }
    if (!cover.projectId || cover.projectId.toString() !== args.projectId.toString()) {
      throw new Error("Unauthorized: cover does not belong to this project");
    }

    await ctx.db.patch(args.projectId, {
      coverId: args.coverId,
      updatedAt: Date.now(),
    });
  },
});

// Add videos to project - with ownership verification
export const addVideos = mutation({
  args: {
    projectId: v.id("projects"),
    videoIds: v.array(v.id("videos")),
  },
  handler: async (ctx, args) => {
    // Verify project ownership
    const { project, user } = await verifyProjectOwnership(ctx, args.projectId);

    // Verify ownership of each video before adding
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ownedVideoIds: Array<{ videoId: Id<"videos">; video: any }> = [];
    for (const videoId of args.videoIds) {
      const video = await ctx.db.get(videoId);
      if (!video) {
        continue; // Skip non-existent videos
      }
      if (!video.userId || !user._id || video.userId.toString() !== user._id.toString()) {
        throw new Error(`Unauthorized: you do not own video ${videoId}`);
      }
      ownedVideoIds.push({ videoId, video });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingIds = new Set(project.selectedVideoIds.map((id: any) => id.toString()));
    const newVideos = ownedVideoIds.filter(({ videoId }) => !existingIds.has(videoId.toString()));

    // Handle videos that are already in other projects
    for (const { videoId, video } of newVideos) {
      const existingProjectId = video.projectId;
      if (existingProjectId && existingProjectId.toString() !== args.projectId.toString()) {
        // Remove video from old project's selectedVideoIds
        const oldProject = await ctx.db.get(existingProjectId);
        if (oldProject && oldProject.selectedVideoIds && Array.isArray(oldProject.selectedVideoIds)) {
          const updatedVideoIds = (oldProject.selectedVideoIds as Id<"videos">[]).filter(
            (id) => id.toString() !== videoId.toString()
          );
          await ctx.db.patch(existingProjectId, {
            selectedVideoIds: updatedVideoIds,
            updatedAt: Date.now(),
          });
        }
      }
    }

    const newIds = newVideos.map(({ videoId }) => videoId);

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

// Remove videos from project - with ownership verification
export const removeVideos = mutation({
  args: {
    projectId: v.id("projects"),
    videoIds: v.array(v.id("videos")),
  },
  handler: async (ctx, args) => {
    // Verify project ownership
    const { project, user } = await verifyProjectOwnership(ctx, args.projectId);

    // Verify ownership of each video before removing
    const ownedVideoIds: Id<"videos">[] = [];
    for (const videoId of args.videoIds) {
      const video = await ctx.db.get(videoId);
      if (!video) {
        continue; // Skip non-existent videos
      }
      if (!video.userId || !user._id || video.userId.toString() !== user._id.toString()) {
        throw new Error(`Unauthorized: you do not own video ${videoId}`);
      }
      ownedVideoIds.push(videoId);
    }

    const removeSet = new Set(ownedVideoIds.map((id) => id.toString()));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const remainingIds = project.selectedVideoIds.filter((id: any) => !removeSet.has(id.toString()));

    await ctx.db.patch(args.projectId, {
      selectedVideoIds: remainingIds,
      updatedAt: Date.now(),
    });

    // Unlink videos from project (only for owned videos)
    for (const videoId of ownedVideoIds) {
      await ctx.db.patch(videoId, { projectId: undefined });
    }
  },
});

// Delete project and all related data - with ownership verification
export const deleteProject = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    // Verify ownership
    await verifyProjectOwnership(ctx, args.projectId);

    // Unlink videos from project (don't delete - preserve user's YouTube content)
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const video of videos) {
      if (video._id) {
        await ctx.db.patch(video._id as Id<"videos">, { projectId: undefined });
      }
    }

    // Delete voice profiles
    const voiceProfiles = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const vp of voiceProfiles) {
      if (vp._id) {
        await ctx.db.delete(vp._id as Id<"voiceProfiles">);
      }
    }

    // Delete book concepts
    const concepts = await ctx.db
      .query("bookConcepts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const concept of concepts) {
      if (concept._id) {
        await ctx.db.delete(concept._id as Id<"bookConcepts">);
      }
    }

    // Delete chapters and their drafts
    const chapters = await ctx.db
      .query("chapters")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const chapter of chapters) {
      if (chapter._id) {
        const drafts = await ctx.db
          .query("chapterDrafts")
          .withIndex("by_chapter", (q) => q.eq("chapterId", chapter._id as Id<"chapters">))
          .collect();
        for (const draft of drafts) {
          if (draft._id) {
            await ctx.db.delete(draft._id as Id<"chapterDrafts">);
          }
        }
        await ctx.db.delete(chapter._id as Id<"chapters">);
      }
    }

    // Delete covers
    const covers = await ctx.db
      .query("covers")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const cover of covers) {
      if (cover._id) {
        await ctx.db.delete(cover._id as Id<"covers">);
      }
    }

    // Finally delete the project
    await ctx.db.delete(args.projectId);
  },
});

// ============================================
// Internal functions for server-side use only
// ============================================

// Get project by ID - INTERNAL (no auth check, for server-side use)
export const getByIdInternal = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});
