"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import { Header } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardDescription, LoadingScreen, Spinner } from "@/components/ui";
import { VoiceProfileCard, BookConceptGrid } from "@/components/analysis";

type AnalysisStep = "transcripts" | "voice-profile" | "concepts";

// Helper to validate Convex ID format (Crockford Base32)
function isValidConvexId(id: string): boolean {
  // Convex IDs use Crockford Base32 which excludes I, L, O, U
  return typeof id === "string" && id.length > 0 && /^[0-9a-hj-km-np-tv-z]+$/i.test(id);
}

export default function AnalyzePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);

  // Validate projectId before treating it as a Convex Id
  const rawProjectId = resolvedParams.projectId;
  const projectId = isValidConvexId(rawProjectId) ? (rawProjectId as Id<"projects">) : null;

  const project = useQuery(
    api.projects.getWithDetails,
    projectId ? { projectId } : "skip"
  );
  const transcriptStats = useQuery(
    api.videos.getTranscriptStats,
    projectId ? { projectId } : "skip"
  );
  const voiceProfile = useQuery(
    api.ai.getVoiceProfile,
    projectId ? { projectId } : "skip"
  );
  const bookConcepts = useQuery(
    api.ai.getBookConcepts,
    projectId ? { projectId } : "skip"
  );

  const generateVoiceProfile = useAction(api.ai.generateVoiceProfile);
  const regenerateVoiceProfile = useAction(api.ai.regenerateVoiceProfile);
  const generateBookConcepts = useAction(api.ai.generateBookConcepts);

  const [isGeneratingVoiceProfile, setIsGeneratingVoiceProfile] = useState(false);
  const [isGeneratingConcepts, setIsGeneratingConcepts] = useState(false);
  const [isRegeneratingVoiceProfile, setIsRegeneratingVoiceProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!projectId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card variant="bordered" className="text-center py-12">
            <h2 className="font-heading font-semibold text-xl text-neutral-900 mb-2">
              Invalid Project ID
            </h2>
            <p className="text-neutral-600 mb-6">
              The project ID in the URL is not valid.
            </p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  if (project === undefined || transcriptStats === undefined || voiceProfile === undefined || bookConcepts === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingScreen message="Loading analysis..." />
      </div>
    );
  }

  if (project === null) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card variant="bordered" className="text-center py-12">
            <h2 className="font-heading font-semibold text-xl text-neutral-900 mb-2">
              Project Not Found
            </h2>
            <p className="text-neutral-600 mb-6">
              This project doesn&apos;t exist or you don&apos;t have access to it.
            </p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  // Determine current step based on progress
  const hasTranscripts = transcriptStats && transcriptStats.completed > 0;
  const hasVoiceProfile = voiceProfile !== null;
  const hasConcepts = bookConcepts && bookConcepts.length > 0;
  const hasSelectedConcept = bookConcepts?.some((c) => c.isSelected);

  const getCurrentStep = (): AnalysisStep => {
    if (!hasTranscripts) return "transcripts";
    if (!hasVoiceProfile) return "voice-profile";
    return "concepts";
  };

  const currentStep = getCurrentStep();

  const handleGenerateVoiceProfile = async () => {
    setIsGeneratingVoiceProfile(true);
    setError(null);
    try {
      await generateVoiceProfile({ projectId });
    } catch (err) {
      console.error("Failed to generate voice profile:", err);
      setError(err instanceof Error ? err.message : "Failed to generate voice profile");
    } finally {
      setIsGeneratingVoiceProfile(false);
    }
  };

  const handleRegenerateVoiceProfile = async (feedback: string) => {
    setIsRegeneratingVoiceProfile(true);
    setError(null);
    try {
      await regenerateVoiceProfile({ projectId, feedback });
    } catch (err) {
      console.error("Failed to regenerate voice profile:", err);
      setError(err instanceof Error ? err.message : "Failed to regenerate voice profile");
    } finally {
      setIsRegeneratingVoiceProfile(false);
    }
  };

  const handleGenerateConcepts = async () => {
    setIsGeneratingConcepts(true);
    setError(null);
    try {
      await generateBookConcepts({ projectId, count: 4 });
    } catch (err) {
      console.error("Failed to generate concepts:", err);
      setError(err instanceof Error ? err.message : "Failed to generate book concepts");
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  const handleGenerateMoreConcepts = async () => {
    setIsGeneratingConcepts(true);
    setError(null);
    try {
      // Pass existing concept IDs to avoid generating duplicates
      const existingConceptIds = bookConcepts?.map((c) => c._id) ?? [];
      await generateBookConcepts({ projectId, count: 3, existingConceptIds });
    } catch (err) {
      console.error("Failed to generate more concepts:", err);
      setError(err instanceof Error ? err.message : "Failed to generate more concepts");
    } finally {
      setIsGeneratingConcepts(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-700">
                Dashboard
              </Link>
            </li>
            <li className="text-neutral-400">/</li>
            <li>
              <Link
                href={`/projects/${projectId}`}
                className="text-neutral-500 hover:text-neutral-700"
              >
                {project.name}
              </Link>
            </li>
            <li className="text-neutral-400">/</li>
            <li className="text-neutral-900">Content Analysis</li>
          </ol>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-heading font-bold text-neutral-900">Content Analysis</h1>
          <p className="mt-2 text-neutral-600">
            Analyze your content to extract your unique voice and generate book concepts.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center gap-4">
            {[
              { key: "transcripts", label: "Transcripts Ready", number: 1 },
              { key: "voice-profile", label: "Voice Profile", number: 2 },
              { key: "concepts", label: "Book Concepts", number: 3 },
            ].map((step, index) => {
              const isCompleted =
                (step.key === "transcripts" && hasTranscripts) ||
                (step.key === "voice-profile" && hasVoiceProfile) ||
                (step.key === "concepts" && hasSelectedConcept);

              const isCurrent = step.key === currentStep;

              return (
                <div key={step.key} className="flex items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCompleted
                        ? "bg-success-100 text-success-600"
                        : isCurrent
                          ? "bg-primary-600 text-white"
                          : "bg-neutral-100 text-neutral-400"
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      isCompleted
                        ? "text-success-600"
                        : isCurrent
                          ? "text-neutral-900"
                          : "text-neutral-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  {index < 2 && <div className="w-12 h-px bg-neutral-200 ml-4" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-error-50 border border-error-200 rounded-lg p-4">
            <p className="text-error-600 text-sm">{error}</p>
          </div>
        )}

        {/* Step Content */}
        <div className="space-y-8">
          {/* Step 1: Transcripts */}
          <section>
            <Card variant={hasTranscripts ? "bordered" : "default"} className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-heading font-semibold text-neutral-900 flex items-center gap-2">
                    {hasTranscripts && (
                      <span className="w-5 h-5 rounded-full bg-success-100 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="text-success-600"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      </span>
                    )}
                    Step 1: Transcripts
                  </h2>
                  <p className="mt-1 text-neutral-600">
                    {hasTranscripts
                      ? `${transcriptStats?.completed || 0} of ${project.videos.length} transcripts ready for analysis.`
                      : "Fetch transcripts from your videos before analysis."}
                  </p>
                </div>
                {!hasTranscripts && (
                  <Link href={`/projects/${projectId}`}>
                    <Button>Go to Project</Button>
                  </Link>
                )}
              </div>
            </Card>
          </section>

          {/* Step 2: Voice Profile */}
          <section>
            {hasVoiceProfile && voiceProfile ? (
              <VoiceProfileCard
                voiceProfile={voiceProfile}
                onRegenerate={handleRegenerateVoiceProfile}
                isRegenerating={isRegeneratingVoiceProfile}
              />
            ) : (
              <Card variant={hasTranscripts ? "default" : "bordered"} className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-heading font-semibold text-neutral-900">
                      Step 2: Voice Profile
                    </h2>
                    <p className="mt-1 text-neutral-600">
                      {hasTranscripts
                        ? "Analyze your content to extract your unique voice and communication style."
                        : "Complete Step 1 first to enable voice profile generation."}
                    </p>
                  </div>
                  <Button
                    onClick={handleGenerateVoiceProfile}
                    isLoading={isGeneratingVoiceProfile}
                    disabled={!hasTranscripts}
                  >
                    {isGeneratingVoiceProfile ? "Analyzing..." : "Generate Voice Profile"}
                  </Button>
                </div>

                {isGeneratingVoiceProfile && (
                  <div className="mt-6 flex items-center gap-3 text-primary-600">
                    <Spinner size="sm" />
                    <span className="text-sm">
                      Analyzing your content to extract voice characteristics...
                    </span>
                  </div>
                )}
              </Card>
            )}
          </section>

          {/* Step 3: Book Concepts */}
          <section>
            <Card variant="default" className="p-6">
              <CardHeader className="px-0 pt-0">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>Step 3: Book Concepts</CardTitle>
                    <CardDescription>
                      {hasConcepts
                        ? "Choose the concept that best represents your book."
                        : hasVoiceProfile
                          ? "Generate book concepts based on your content and voice profile."
                          : "Complete Step 2 first to enable concept generation."}
                    </CardDescription>
                  </div>
                  {!hasConcepts && (
                    <Button
                      onClick={handleGenerateConcepts}
                      isLoading={isGeneratingConcepts}
                      disabled={!hasVoiceProfile}
                    >
                      {isGeneratingConcepts ? "Generating..." : "Generate Concepts"}
                    </Button>
                  )}
                </div>
              </CardHeader>

              {isGeneratingConcepts && !hasConcepts && (
                <div className="flex items-center gap-3 text-primary-600 mt-4">
                  <Spinner size="sm" />
                  <span className="text-sm">
                    Generating book concepts based on your content...
                  </span>
                </div>
              )}

              {hasConcepts && bookConcepts && (
                <div className="mt-6">
                  <BookConceptGrid
                    concepts={bookConcepts}
                    onRequestMore={handleGenerateMoreConcepts}
                    isLoadingMore={isGeneratingConcepts}
                  />
                </div>
              )}
            </Card>
          </section>

          {/* Continue Button */}
          {hasSelectedConcept && (
            <div className="flex justify-end">
              <Link href={`/projects/${projectId}/structure`}>
                <Button size="lg">
                  Continue to Chapter Structure
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-2"
                  >
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
