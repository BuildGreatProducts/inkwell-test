import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "./_generated/dataModel";

// ============================================
// Constants
// ============================================

const CLAUDE_MODEL = "claude-sonnet-4-20250514";

const TOKEN_LIMITS = {
  VOICE_PROFILE: 4096,
  BOOK_CONCEPT: 4096,
} as const;

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
} as const;

// ============================================
// Helpers
// ============================================

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNonRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return (
    message.includes("invalid api key") ||
    message.includes("authentication") ||
    message.includes("unauthorized") ||
    message.includes("invalid request")
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    maxDelayMs?: number;
  } = {}
): Promise<T> {
  const {
    maxRetries = RETRY_CONFIG.maxRetries,
    baseDelayMs = RETRY_CONFIG.baseDelayMs,
    maxDelayMs = RETRY_CONFIG.maxDelayMs,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (isNonRetryableError(lastError)) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

// Estimate token count (rough approximation: ~4 chars per token)
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

// Chunk text to fit within token limits
function chunkText(
  text: string,
  maxTokens: number = 100000,
  overlapTokens: number = 500
): string[] {
  const estimatedTokens = estimateTokenCount(text);

  if (estimatedTokens <= maxTokens) {
    return [text];
  }

  const chunks: string[] = [];
  const charsPerToken = 4;
  const maxChars = maxTokens * charsPerToken;
  const overlapChars = overlapTokens * charsPerToken;

  const paragraphs = text.split(/\n\n+/);
  let currentChunk = "";

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length + 2 <= maxChars) {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk);
        const overlapStart = Math.max(0, currentChunk.length - overlapChars);
        currentChunk = currentChunk.slice(overlapStart) + "\n\n" + paragraph;
      } else {
        const sentences = paragraph.split(/(?<=[.!?])\s+/);
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length + 1 <= maxChars) {
            currentChunk += (currentChunk ? " " : "") + sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk);
            }
            currentChunk = sentence;
          }
        }
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Create Anthropic client
function createAnthropicClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set");
  }
  return new Anthropic({ apiKey });
}

// ============================================
// Prompt Templates
// ============================================

const SYSTEM_PROMPTS = {
  VOICE_PROFILE_EXTRACTOR: `You are an expert literary analyst specializing in identifying and codifying an author's unique voice. Your task is to analyze transcripts from spoken content and extract the distinct characteristics that define the speaker's communication style.

When analyzing, look for:
- Formality level (casual, professional, academic, conversational)
- Teaching/communication style (storytelling, analytical, persuasive, instructional)
- Vocabulary patterns (technical jargon, colloquialisms, metaphors)
- Recurring phrases and expressions
- Personality traits that come through in the content

Be specific and provide examples from the transcripts when possible.`,

  BOOK_CONCEPT_GENERATOR: `You are a skilled publishing consultant who helps authors develop compelling book concepts. Your task is to analyze content from transcripts and propose book concepts that would resonate with readers while staying true to the creator's voice and expertise.

Each concept should:
- Have a compelling, market-friendly title
- Include an optional subtitle that clarifies the book's value
- Feature a 2-3 sentence blurb that would work on the back cover
- Identify 3-5 primary themes the book covers

Focus on concepts that would translate well to print and appeal to book buyers.`,
};

function createVoiceProfilePrompt(transcripts: string[]): string {
  const combinedTranscripts = transcripts.join("\n\n---\n\n");

  return `Analyze the following transcripts and extract the speaker's unique voice profile.

TRANSCRIPTS:
${combinedTranscripts}

Based on your analysis, provide a voice profile in the following JSON format:
{
  "formalityLevel": "A description of how formal or casual the speaker tends to be (e.g., 'Casual and approachable with occasional technical depth')",
  "teachingStyle": "How the speaker conveys information (e.g., 'Story-driven with personal anecdotes, builds concepts progressively')",
  "vocabularyPatterns": ["Array of 3-5 notable vocabulary patterns, e.g., 'Uses sports metaphors frequently'"],
  "commonPhrases": ["Array of 5-10 phrases or expressions the speaker uses often, with exact quotes when possible"],
  "personalityTraits": ["Array of 3-5 personality traits evident in the content, e.g., 'Empathetic', 'Direct', 'Humorous'"],
  "additionalNotes": "Any other notable characteristics worth preserving when writing in this voice"
}

Respond ONLY with valid JSON. Do not include any other text.`;
}

interface VoiceProfileData {
  formalityLevel: string;
  teachingStyle: string;
  vocabularyPatterns: string[];
  commonPhrases: string[];
  personalityTraits: string[];
  additionalNotes?: string;
}

function createBookConceptPrompt(
  transcripts: string[],
  voiceProfile: VoiceProfileData,
  count: number = 4
): string {
  const combinedTranscripts = transcripts.join("\n\n---\n\n");

  return `Based on the following content and voice profile, generate ${count} distinct book concept options.

VOICE PROFILE:
- Formality: ${voiceProfile.formalityLevel}
- Teaching Style: ${voiceProfile.teachingStyle}
- Vocabulary Patterns: ${voiceProfile.vocabularyPatterns.join(", ")}
- Common Phrases: ${voiceProfile.commonPhrases.join(", ")}
- Personality Traits: ${voiceProfile.personalityTraits.join(", ")}
${voiceProfile.additionalNotes ? `- Additional Notes: ${voiceProfile.additionalNotes}` : ""}

TRANSCRIPTS:
${combinedTranscripts}

Generate ${count} different book concepts that would appeal to different audiences or angles while staying true to the content and voice. Each concept should be distinct.

Respond with valid JSON in this exact format:
{
  "concepts": [
    {
      "title": "Book Title Here",
      "subtitle": "Optional Subtitle That Clarifies Value",
      "blurb": "A 2-3 sentence compelling description that would work on the back cover. It should hook the reader and convey the book's core value proposition.",
      "primaryThemes": ["Theme 1", "Theme 2", "Theme 3"]
    }
  ]
}

Respond ONLY with valid JSON. Do not include any other text.`;
}

interface BookConceptData {
  title: string;
  subtitle?: string;
  blurb: string;
  primaryThemes: string[];
}

// Generate prompt for additional book concepts (with exclusions)
function createMoreConceptsPrompt(
  transcripts: string[],
  voiceProfile: VoiceProfileData,
  existingConcepts: BookConceptData[],
  count: number = 3
): string {
  const combinedTranscripts = transcripts.join("\n\n---\n\n");
  const existingTitles = existingConcepts.map((c) => c.title).join(", ");

  return `Based on the following content and voice profile, generate ${count} NEW and DISTINCT book concept options.

VOICE PROFILE:
- Formality: ${voiceProfile.formalityLevel}
- Teaching Style: ${voiceProfile.teachingStyle}
- Vocabulary Patterns: ${voiceProfile.vocabularyPatterns.join(", ")}
- Common Phrases: ${voiceProfile.commonPhrases.join(", ")}
- Personality Traits: ${voiceProfile.personalityTraits.join(", ")}
${voiceProfile.additionalNotes ? `- Additional Notes: ${voiceProfile.additionalNotes}` : ""}

EXISTING CONCEPTS TO AVOID (generate something different):
${existingTitles}

TRANSCRIPTS:
${combinedTranscripts}

Generate ${count} NEW book concepts that are distinctly different from the existing ones. Explore different angles, target audiences, or approaches to the material.

Respond with valid JSON in this exact format:
{
  "concepts": [
    {
      "title": "Book Title Here",
      "subtitle": "Optional Subtitle That Clarifies Value",
      "blurb": "A 2-3 sentence compelling description that would work on the back cover. It should hook the reader and convey the book's core value proposition.",
      "primaryThemes": ["Theme 1", "Theme 2", "Theme 3"]
    }
  ]
}

Respond ONLY with valid JSON. Do not include any other text.`;
}

// ============================================
// Response Parsers
// ============================================

function parseVoiceProfileResponse(response: string): VoiceProfileData {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (
      typeof parsed.formalityLevel !== "string" ||
      typeof parsed.teachingStyle !== "string" ||
      !Array.isArray(parsed.vocabularyPatterns) ||
      !Array.isArray(parsed.commonPhrases) ||
      !Array.isArray(parsed.personalityTraits)
    ) {
      throw new Error("Invalid voice profile structure");
    }

    return {
      formalityLevel: parsed.formalityLevel,
      teachingStyle: parsed.teachingStyle,
      vocabularyPatterns: parsed.vocabularyPatterns.filter(
        (p: unknown): p is string => typeof p === "string"
      ),
      commonPhrases: parsed.commonPhrases.filter(
        (p: unknown): p is string => typeof p === "string"
      ),
      personalityTraits: parsed.personalityTraits.filter(
        (p: unknown): p is string => typeof p === "string"
      ),
      additionalNotes: parsed.additionalNotes || undefined,
    };
  } catch (error) {
    throw new Error(
      `Failed to parse voice profile: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

interface BookConceptData {
  title: string;
  subtitle?: string;
  blurb: string;
  primaryThemes: string[];
}

function parseBookConceptsResponse(response: string): BookConceptData[] {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!Array.isArray(parsed.concepts)) {
      throw new Error("Invalid book concepts structure");
    }

    return parsed.concepts.map((concept: Record<string, unknown>) => {
      if (
        typeof concept.title !== "string" ||
        typeof concept.blurb !== "string" ||
        !Array.isArray(concept.primaryThemes)
      ) {
        throw new Error("Invalid concept structure");
      }

      return {
        title: concept.title,
        subtitle: typeof concept.subtitle === "string" ? concept.subtitle : undefined,
        blurb: concept.blurb,
        primaryThemes: concept.primaryThemes.filter(
          (t: unknown): t is string => typeof t === "string"
        ),
      };
    });
  } catch (error) {
    throw new Error(
      `Failed to parse book concepts: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

// ============================================
// Internal Queries
// ============================================

// Get user ID from Clerk identity
export const getUserFromAuth = internalQuery({
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

    return user;
  },
});

// Get project with videos for AI processing (with ownership verification)
export const getProjectForAnalysis = internalQuery({
  args: {
    projectId: v.id("projects"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    // Verify ownership
    if (!project.userId || project.userId.toString() !== args.userId.toString()) {
      return null;
    }

    // Get all videos with completed transcripts
    const videos = await ctx.db
      .query("videos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    const videosWithTranscripts = videos.filter(
      (v) => v.transcriptStatus === "completed" && v.transcript
    );

    return {
      project,
      videos: videosWithTranscripts,
      transcripts: videosWithTranscripts.map((v) => v.transcript as string),
    };
  },
});

// Get voice profile by project ID
export const getVoiceProfileByProject = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("voiceProfiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
  },
});

// Get book concepts by project ID
export const getBookConceptsByProject = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bookConcepts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// ============================================
// Internal Mutations
// ============================================

// Save voice profile
export const saveVoiceProfile = internalMutation({
  args: {
    projectId: v.id("projects"),
    formalityLevel: v.string(),
    teachingStyle: v.string(),
    vocabularyPatterns: v.array(v.string()),
    commonPhrases: v.array(v.string()),
    personalityTraits: v.array(v.string()),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if voice profile already exists for this project
    const existing = await ctx.db
      .query("voiceProfiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();

    if (existing) {
      // Update existing profile
      const updateData: Record<string, unknown> = {
        formalityLevel: args.formalityLevel,
        teachingStyle: args.teachingStyle,
        vocabularyPatterns: args.vocabularyPatterns,
        commonPhrases: args.commonPhrases,
        personalityTraits: args.personalityTraits,
        isApproved: false,
        updatedAt: now,
      };
      if (args.additionalNotes !== undefined) {
        updateData.additionalNotes = args.additionalNotes;
      }
      // @ts-expect-error - dynamic update object
      await ctx.db.patch(existing._id as Id<"voiceProfiles">, updateData);
      return existing._id as Id<"voiceProfiles">;
    }

    // Create new profile
    const insertData: {
      projectId: Id<"projects">;
      formalityLevel: string;
      teachingStyle: string;
      vocabularyPatterns: string[];
      commonPhrases: string[];
      personalityTraits: string[];
      additionalNotes?: string;
      isApproved: boolean;
      createdAt: number;
      updatedAt: number;
    } = {
      projectId: args.projectId,
      formalityLevel: args.formalityLevel,
      teachingStyle: args.teachingStyle,
      vocabularyPatterns: args.vocabularyPatterns,
      commonPhrases: args.commonPhrases,
      personalityTraits: args.personalityTraits,
      isApproved: false,
      createdAt: now,
      updatedAt: now,
    };
    if (args.additionalNotes !== undefined) {
      insertData.additionalNotes = args.additionalNotes;
    }
    const voiceProfileId = await ctx.db.insert("voiceProfiles", insertData);

    // Update project with voice profile reference
    await ctx.db.patch(args.projectId, {
      voiceProfileId,
      updatedAt: now,
    });

    return voiceProfileId;
  },
});

// Save book concept
export const saveBookConcept = internalMutation({
  args: {
    projectId: v.id("projects"),
    title: v.string(),
    subtitle: v.optional(v.string()),
    blurb: v.string(),
    primaryThemes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const insertData: {
      projectId: Id<"projects">;
      title: string;
      subtitle?: string;
      blurb: string;
      primaryThemes: string[];
      isSelected: boolean;
      createdAt: number;
    } = {
      projectId: args.projectId,
      title: args.title,
      blurb: args.blurb,
      primaryThemes: args.primaryThemes,
      isSelected: false,
      createdAt: Date.now(),
    };
    if (args.subtitle !== undefined) {
      insertData.subtitle = args.subtitle;
    }
    return await ctx.db.insert("bookConcepts", insertData);
  },
});

// Update project status
export const updateProjectStatus = internalMutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("draft"),
      v.literal("analyzing"),
      v.literal("structuring"),
      v.literal("writing"),
      v.literal("editing"),
      v.literal("completed")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// Public Queries
// ============================================

// Get voice profile for a project (with auth check)
export const getVoiceProfile = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    // Get project to verify ownership
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return null;
    }

    // Get user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      return null;
    }

    return await ctx.db
      .query("voiceProfiles")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .first();
  },
});

// Get book concepts for a project (with auth check)
export const getBookConcepts = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get project to verify ownership
    const project = await ctx.db.get(args.projectId);
    if (!project) {
      return [];
    }

    // Get user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      return [];
    }

    return await ctx.db
      .query("bookConcepts")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});

// ============================================
// Public Mutations
// ============================================

// Approve voice profile
export const approveVoiceProfile = mutation({
  args: { voiceProfileId: v.id("voiceProfiles") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const voiceProfile = await ctx.db.get(args.voiceProfileId);
    if (!voiceProfile) {
      throw new Error("Voice profile not found");
    }

    // Verify ownership via project
    const project = await ctx.db.get(voiceProfile.projectId as Id<"projects">);
    if (!project) {
      throw new Error("Project not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.voiceProfileId, {
      isApproved: true,
      updatedAt: Date.now(),
    });
  },
});

// Update voice profile
export const updateVoiceProfile = mutation({
  args: {
    voiceProfileId: v.id("voiceProfiles"),
    formalityLevel: v.optional(v.string()),
    teachingStyle: v.optional(v.string()),
    vocabularyPatterns: v.optional(v.array(v.string())),
    commonPhrases: v.optional(v.array(v.string())),
    personalityTraits: v.optional(v.array(v.string())),
    additionalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const voiceProfile = await ctx.db.get(args.voiceProfileId);
    if (!voiceProfile) {
      throw new Error("Voice profile not found");
    }

    // Verify ownership via project
    const project = await ctx.db.get(voiceProfile.projectId as Id<"projects">);
    if (!project) {
      throw new Error("Project not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      throw new Error("Unauthorized");
    }

    const { voiceProfileId, ...updates } = args;

    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, value]) => value !== undefined)
    );

    await ctx.db.patch(voiceProfileId, {
      ...cleanUpdates,
      updatedAt: Date.now(),
    });
  },
});

// Select a book concept
export const selectBookConcept = mutation({
  args: {
    conceptId: v.id("bookConcepts"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }

    const concept = await ctx.db.get(args.conceptId);
    if (!concept) {
      throw new Error("Concept not found");
    }

    // Verify ownership via project
    const projectId = concept.projectId as Id<"projects">;
    const project = await ctx.db.get(projectId);
    if (!project) {
      throw new Error("Project not found");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || !project.userId || !user._id || project.userId.toString() !== user._id.toString()) {
      throw new Error("Unauthorized");
    }

    // Unselect all other concepts for this project
    const allConcepts = await ctx.db
      .query("bookConcepts")
      .withIndex("by_project", (q) => q.eq("projectId", projectId))
      .collect();

    for (const c of allConcepts) {
      if (c._id && c._id.toString() !== args.conceptId.toString() && c.isSelected) {
        await ctx.db.patch(c._id as Id<"bookConcepts">, { isSelected: false });
      }
    }

    // Select this concept
    await ctx.db.patch(args.conceptId, { isSelected: true });

    // Update project with selected concept reference
    await ctx.db.patch(projectId, {
      selectedConceptId: args.conceptId,
      updatedAt: Date.now(),
    });
  },
});

// ============================================
// AI Actions
// ============================================

// Generate voice profile from project transcripts
export const generateVoiceProfile = action({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args): Promise<Id<"voiceProfiles">> => {
    // Verify authentication and get user
    const user = await ctx.runQuery(internal.ai.getUserFromAuth, {});
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    // Get project data (with ownership verification)
    const projectData = await ctx.runQuery(internal.ai.getProjectForAnalysis, {
      projectId: args.projectId,
      userId: user._id,
    });

    if (!projectData) {
      throw new Error("Project not found or unauthorized");
    }

    if (projectData.transcripts.length === 0) {
      throw new Error("No transcripts available for analysis");
    }

    // Update project status to analyzing
    await ctx.runMutation(internal.ai.updateProjectStatus, {
      projectId: args.projectId,
      status: "analyzing",
    });

    try {
      // Create Anthropic client
      const anthropic = createAnthropicClient();

      // Prepare transcripts - chunk if too large
      const combinedLength = projectData.transcripts.join("").length;
      let transcriptsToAnalyze = projectData.transcripts;

      // Fix: Use the actual combined length for token estimation (4 chars per token)
      if (Math.ceil(combinedLength / 4) > 80000) {
        // Chunk individual transcripts if needed
        transcriptsToAnalyze = projectData.transcripts.flatMap((t) =>
          chunkText(t, 20000)
        );
        // Limit to a reasonable number of chunks
        transcriptsToAnalyze = transcriptsToAnalyze.slice(0, 10);
      }

      // Generate prompt
      const prompt = createVoiceProfilePrompt(transcriptsToAnalyze);

      // Call Claude API with retry
      const response = await withRetry(async () => {
        const message = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: TOKEN_LIMITS.VOICE_PROFILE,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          system: SYSTEM_PROMPTS.VOICE_PROFILE_EXTRACTOR,
        });

        // Extract text content
        const textContent = message.content.find((c) => c.type === "text");
        if (!textContent || textContent.type !== "text") {
          throw new Error("No text response from Claude");
        }

        return textContent.text;
      });

      // Parse the response
      const voiceProfile = parseVoiceProfileResponse(response);

      // Save to database
      const voiceProfileId = await ctx.runMutation(internal.ai.saveVoiceProfile, {
        projectId: args.projectId,
        ...voiceProfile,
      });

      return voiceProfileId;
    } catch (error) {
      // Reset status on error
      await ctx.runMutation(internal.ai.updateProjectStatus, {
        projectId: args.projectId,
        status: "draft",
      });
      throw error;
    }
  },
});

// Generate book concepts from project transcripts
export const generateBookConcepts = action({
  args: {
    projectId: v.id("projects"),
    count: v.optional(v.number()),
    existingConceptIds: v.optional(v.array(v.id("bookConcepts"))),
  },
  handler: async (ctx, args): Promise<Id<"bookConcepts">[]> => {
    const conceptCount = args.count ?? 4;

    // Verify authentication and get user
    const user = await ctx.runQuery(internal.ai.getUserFromAuth, {});
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    // Get project data (with ownership verification)
    const projectData = await ctx.runQuery(internal.ai.getProjectForAnalysis, {
      projectId: args.projectId,
      userId: user._id,
    });

    if (!projectData) {
      throw new Error("Project not found or unauthorized");
    }

    if (projectData.transcripts.length === 0) {
      throw new Error("No transcripts available for analysis");
    }

    // Get voice profile
    const voiceProfile = await ctx.runQuery(internal.ai.getVoiceProfileByProject, {
      projectId: args.projectId,
    });

    if (!voiceProfile) {
      throw new Error("Voice profile not found. Generate voice profile first.");
    }

    try {
      // Create Anthropic client
      const anthropic = createAnthropicClient();

      // Prepare transcripts - chunk if too large
      let transcriptsToAnalyze = projectData.transcripts;
      const combinedLength = transcriptsToAnalyze.join("").length;

      // Fix: Use the actual combined length for token estimation (4 chars per token)
      if (Math.ceil(combinedLength / 4) > 80000) {
        transcriptsToAnalyze = projectData.transcripts.flatMap((t) =>
          chunkText(t, 20000)
        );
        transcriptsToAnalyze = transcriptsToAnalyze.slice(0, 10);
      }

      const voiceProfileData = {
        formalityLevel: voiceProfile.formalityLevel,
        teachingStyle: voiceProfile.teachingStyle,
        vocabularyPatterns: voiceProfile.vocabularyPatterns,
        commonPhrases: voiceProfile.commonPhrases,
        personalityTraits: voiceProfile.personalityTraits,
        additionalNotes: voiceProfile.additionalNotes,
      };

      // Get existing concepts if provided (for generating more unique concepts)
      let existingConceptData: BookConceptData[] = [];
      if (args.existingConceptIds && args.existingConceptIds.length > 0) {
        const allConcepts = await ctx.runQuery(internal.ai.getBookConceptsByProject, {
          projectId: args.projectId,
        });
        existingConceptData = allConcepts
          .filter((c) => args.existingConceptIds!.includes(c._id as Id<"bookConcepts">))
          .map((c) => ({
            title: c.title as string,
            subtitle: c.subtitle as string | undefined,
            blurb: c.blurb as string,
            primaryThemes: c.primaryThemes as string[],
          }));
      }

      // Generate prompt - use createMoreConceptsPrompt if we have existing concepts
      const prompt = existingConceptData.length > 0
        ? createMoreConceptsPrompt(
            transcriptsToAnalyze,
            voiceProfileData,
            existingConceptData,
            conceptCount
          )
        : createBookConceptPrompt(
            transcriptsToAnalyze,
            voiceProfileData,
            conceptCount
          );

      // Call Claude API with retry
      const response = await withRetry(async () => {
        const message = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: TOKEN_LIMITS.BOOK_CONCEPT,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          system: SYSTEM_PROMPTS.BOOK_CONCEPT_GENERATOR,
        });

        const textContent = message.content.find((c) => c.type === "text");
        if (!textContent || textContent.type !== "text") {
          throw new Error("No text response from Claude");
        }

        return textContent.text;
      });

      // Parse the response
      const concepts = parseBookConceptsResponse(response);

      // Save each concept to database
      const conceptIds: Id<"bookConcepts">[] = [];
      for (const concept of concepts) {
        const conceptId = await ctx.runMutation(internal.ai.saveBookConcept, {
          projectId: args.projectId,
          ...concept,
        });
        conceptIds.push(conceptId);
      }

      return conceptIds;
    } catch (error) {
      throw error;
    }
  },
});

// Regenerate voice profile with user feedback
export const regenerateVoiceProfile = action({
  args: {
    projectId: v.id("projects"),
    feedback: v.string(),
  },
  handler: async (ctx, args): Promise<Id<"voiceProfiles">> => {
    // Verify authentication and get user
    const user = await ctx.runQuery(internal.ai.getUserFromAuth, {});
    if (!user) {
      throw new Error("Unauthorized: not authenticated");
    }

    // Get project data (with ownership verification)
    const projectData = await ctx.runQuery(internal.ai.getProjectForAnalysis, {
      projectId: args.projectId,
      userId: user._id,
    });

    if (!projectData) {
      throw new Error("Project not found or unauthorized");
    }

    if (projectData.transcripts.length === 0) {
      throw new Error("No transcripts available for analysis");
    }

    // Get existing voice profile
    const existingProfile = await ctx.runQuery(internal.ai.getVoiceProfileByProject, {
      projectId: args.projectId,
    });

    try {
      const anthropic = createAnthropicClient();

      let transcriptsToAnalyze = projectData.transcripts;
      const combinedLength = transcriptsToAnalyze.join("").length;

      // Fix: Use the actual combined length for token estimation (4 chars per token)
      if (Math.ceil(combinedLength / 4) > 80000) {
        transcriptsToAnalyze = projectData.transcripts.flatMap((t) =>
          chunkText(t, 20000)
        );
        transcriptsToAnalyze = transcriptsToAnalyze.slice(0, 10);
      }

      // Create prompt with feedback
      const basePrompt = createVoiceProfilePrompt(transcriptsToAnalyze);
      const promptWithFeedback = existingProfile
        ? `${basePrompt}

PREVIOUS ANALYSIS:
${JSON.stringify({
            formalityLevel: existingProfile.formalityLevel,
            teachingStyle: existingProfile.teachingStyle,
            vocabularyPatterns: existingProfile.vocabularyPatterns,
            commonPhrases: existingProfile.commonPhrases,
            personalityTraits: existingProfile.personalityTraits,
          }, null, 2)}

USER FEEDBACK ON PREVIOUS ANALYSIS:
${args.feedback}

Please generate an updated voice profile that addresses this feedback while maintaining accuracy to the original transcripts.`
        : basePrompt;

      const response = await withRetry(async () => {
        const message = await anthropic.messages.create({
          model: CLAUDE_MODEL,
          max_tokens: TOKEN_LIMITS.VOICE_PROFILE,
          messages: [
            {
              role: "user",
              content: promptWithFeedback,
            },
          ],
          system: SYSTEM_PROMPTS.VOICE_PROFILE_EXTRACTOR,
        });

        const textContent = message.content.find((c) => c.type === "text");
        if (!textContent || textContent.type !== "text") {
          throw new Error("No text response from Claude");
        }

        return textContent.text;
      });

      const voiceProfile = parseVoiceProfileResponse(response);

      const voiceProfileId = await ctx.runMutation(internal.ai.saveVoiceProfile, {
        projectId: args.projectId,
        ...voiceProfile,
      });

      return voiceProfileId;
    } catch (error) {
      throw error;
    }
  },
});
