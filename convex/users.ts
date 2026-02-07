import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Helper to strip sensitive fields from user object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeUser(user: any) {
  if (!user) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { youtubeTokens, ...safeUser } = user;
  return safeUser;
}

// Get user by Clerk ID - INTERNAL ONLY (for server-side use like webhooks)
export const getByClerkId = internalQuery({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get current user (requires auth context) - returns sanitized user without tokens
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    return sanitizeUser(user);
  },
});

// Create or update user from Clerk webhook (internal - called from webhook handler)
export const upsertFromClerk = internalMutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existingUser && existingUser._id) {
      const patchData: {
        email: string;
        name?: string;
        imageUrl?: string;
        updatedAt: number;
      } = {
        email: args.email,
        updatedAt: now,
      };
      if (args.name !== undefined) {
        patchData.name = args.name;
      }
      if (args.imageUrl !== undefined) {
        patchData.imageUrl = args.imageUrl;
      }
      await ctx.db.patch(existingUser._id as Id<"users">, patchData);
      return existingUser._id as Id<"users">;
    }

    const insertData: {
      clerkId: string;
      email: string;
      name?: string;
      imageUrl?: string;
      youtubeConnected: boolean;
      createdAt: number;
      updatedAt: number;
    } = {
      clerkId: args.clerkId,
      email: args.email,
      youtubeConnected: false,
      createdAt: now,
      updatedAt: now,
    };
    if (args.name !== undefined) {
      insertData.name = args.name;
    }
    if (args.imageUrl !== undefined) {
      insertData.imageUrl = args.imageUrl;
    }
    return await ctx.db.insert("users", insertData);
  },
});

// Update YouTube connection status - with auth guard
export const updateYouTubeConnection = mutation({
  args: {
    userId: v.id("users"),
    youtubeTokens: v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    // Auth guard: verify caller owns this user record
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }

    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) {
      throw new Error("Unauthorized: cannot modify another user's record");
    }

    await ctx.db.patch(args.userId, {
      youtubeConnected: true,
      youtubeTokens: args.youtubeTokens,
      updatedAt: Date.now(),
    });
  },
});

// Internal version for server-side YouTube connection updates (from API routes)
export const updateYouTubeConnectionInternal = internalMutation({
  args: {
    userId: v.id("users"),
    youtubeTokens: v.object({
      accessToken: v.string(),
      refreshToken: v.string(),
      expiresAt: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      youtubeConnected: true,
      youtubeTokens: args.youtubeTokens,
      updatedAt: Date.now(),
    });
  },
});

// Disconnect YouTube - with auth guard
export const disconnectYouTube = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Auth guard: verify caller owns this user record
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: not authenticated");
    }

    const user = await ctx.db.get(args.userId);
    if (!user || user.clerkId !== identity.subject) {
      throw new Error("Unauthorized: cannot modify another user's record");
    }

    await ctx.db.patch(args.userId, {
      youtubeConnected: false,
      youtubeTokens: undefined,
      updatedAt: Date.now(),
    });
  },
});

// Delete user - internal only (called from Clerk webhook)
export const deleteUser = internalMutation({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (user && user._id) {
      await ctx.db.delete(user._id as Id<"users">);
    }
  },
});
