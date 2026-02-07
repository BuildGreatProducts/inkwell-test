// AI prompt templates for voice profile extraction and book concept generation

export const SYSTEM_PROMPTS = {
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
} as const;

export interface VoiceProfileData {
  formalityLevel: string;
  teachingStyle: string;
  vocabularyPatterns: string[];
  commonPhrases: string[];
  personalityTraits: string[];
  additionalNotes?: string;
}

export interface BookConceptData {
  title: string;
  subtitle?: string;
  blurb: string;
  primaryThemes: string[];
}

// Generate prompt for voice profile extraction
export function createVoiceProfilePrompt(transcripts: string[]): string {
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

// Generate prompt for book concept generation
export function createBookConceptPrompt(
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

// Generate prompt for additional book concepts (with exclusions)
export function createMoreConceptsPrompt(
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

// Parse voice profile from Claude response
export function parseVoiceProfileResponse(response: string): VoiceProfileData {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON object found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
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

// Parse book concepts from Claude response
export function parseBookConceptsResponse(response: string): BookConceptData[] {
  try {
    // Try to extract JSON from the response
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
