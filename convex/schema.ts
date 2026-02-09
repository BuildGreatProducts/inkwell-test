import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - linked to Clerk
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    youtubeConnected: v.boolean(),
    youtubeTokens: v.optional(
      v.object({
        accessToken: v.string(),
        refreshToken: v.string(),
        expiresAt: v.number(),
      })
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"]),

  // Projects table - book projects
  projects: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("draft"),
      v.literal("analyzing"),
      v.literal("structuring"),
      v.literal("writing"),
      v.literal("editing"),
      v.literal("completed")
    ),
    selectedVideoIds: v.array(v.id("videos")),
    voiceProfileId: v.optional(v.id("voiceProfiles")),
    selectedConceptId: v.optional(v.id("bookConcepts")),
    coverId: v.optional(v.id("covers")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"]),

  // Videos table - YouTube videos with transcripts
  videos: defineTable({
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    youtubeId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    thumbnailUrl: v.optional(v.string()),
    duration: v.optional(v.string()),
    publishedAt: v.optional(v.string()),
    transcript: v.optional(v.string()),
    transcriptStatus: v.union(
      v.literal("pending"),
      v.literal("fetching"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("unavailable")
    ),
    transcriptError: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_youtube_id", ["youtubeId"])
    .index("by_user_youtube_id", ["userId", "youtubeId"]),

  // Voice Profiles table
  voiceProfiles: defineTable({
    projectId: v.id("projects"),
    formalityLevel: v.string(),
    teachingStyle: v.string(),
    vocabularyPatterns: v.array(v.string()),
    commonPhrases: v.array(v.string()),
    personalityTraits: v.array(v.string()),
    additionalNotes: v.optional(v.string()),
    isApproved: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Book Concepts table
  bookConcepts: defineTable({
    projectId: v.id("projects"),
    title: v.string(),
    subtitle: v.optional(v.string()),
    blurb: v.string(),
    primaryThemes: v.array(v.string()),
    isSelected: v.boolean(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Chapters table
  chapters: defineTable({
    projectId: v.id("projects"),
    orderIndex: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    estimatedLength: v.optional(v.string()),
    sourceVideoIds: v.array(v.id("videos")),
    status: v.union(
      v.literal("proposed"),
      v.literal("approved"),
      v.literal("writing"),
      v.literal("draft"),
      v.literal("editing"),
      v.literal("completed")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_order", ["projectId", "orderIndex"]),

  // Chapter Drafts table - with version history
  chapterDrafts: defineTable({
    chapterId: v.id("chapters"),
    version: v.number(),
    content: v.string(),
    wordCount: v.number(),
    isLatest: v.boolean(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_chapter", ["chapterId"])
    .index("by_chapter_version", ["chapterId", "version"])
    .index("by_chapter_latest", ["chapterId", "isLatest"]),

  // Covers table
  covers: defineTable({
    projectId: v.id("projects"),
    type: v.union(v.literal("uploaded"), v.literal("generated")),
    imageUrl: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    generationParams: v.optional(
      v.object({
        title: v.string(),
        subtitle: v.optional(v.string()),
        style: v.optional(v.string()),
        colorScheme: v.optional(v.string()),
      })
    ),
    isSelected: v.boolean(),
    createdAt: v.number(),
  }).index("by_project", ["projectId"]),

  // Purchases table
  purchases: defineTable({
    userId: v.id("users"),
    projectId: v.id("projects"),
    polarCheckoutId: v.string(),
    polarCustomerId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    pdfStorageId: v.optional(v.id("_storage")),
    downloadCount: v.number(),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_project", ["projectId"])
    .index("by_checkout_id", ["polarCheckoutId"]),
});
