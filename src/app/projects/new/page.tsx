"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/layout";
import { Button, Input, Textarea, Card, LoadingScreen } from "@/components/ui";
import { VideoSelector } from "@/components/videos";
import type { YouTubeVideo } from "@/lib/youtube/api";

type Step = "details" | "videos" | "confirm";

export default function NewProjectPage() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);
  const createProject = useMutation(api.projects.create);
  const createVideos = useMutation(api.videos.createBatch);
  const addVideosToProject = useMutation(api.projects.addVideos);

  const [step, setStep] = useState<Step>("details");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedVideos, setSelectedVideos] = useState<YouTubeVideo[]>([]);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingScreen message="Loading..." />
      </div>
    );
  }

  if (!user?.youtubeConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Card variant="bordered" className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-warning-100 flex items-center justify-center mx-auto mb-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-warning-600"
              >
                <path d="m22 8-6 4 6 4V8Z" />
                <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
              </svg>
            </div>
            <h2 className="font-heading font-semibold text-xl text-neutral-900 mb-2">
              Connect YouTube First
            </h2>
            <p className="text-neutral-600 mb-6 max-w-sm mx-auto">
              You need to connect your YouTube account before creating a project.
            </p>
            <Link href="/settings/youtube">
              <Button>Connect YouTube</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const handleCreateProject = async () => {
    if (!user || !projectName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      // Create project (auth is handled server-side, no need to pass userId)
      const projectId = await createProject({
        name: projectName.trim(),
        description: projectDescription.trim() || undefined,
      });

      // Create video records and add to project
      if (selectedVideos.length > 0) {
        const videoIds = await createVideos({
          projectId,
          videos: selectedVideos.map((v) => ({
            youtubeId: v.id,
            title: v.title,
            description: v.description,
            thumbnailUrl: v.thumbnailUrl,
            duration: v.duration,
            publishedAt: v.publishedAt,
          })),
        });

        await addVideosToProject({
          projectId,
          videoIds,
        });
      }

      router.push(`/projects/${projectId}`);
    } catch (err) {
      console.error("Failed to create project:", err);
      setError(err instanceof Error ? err.message : "Failed to create project. Please try again.");
      setIsCreating(false);
    }
  };

  const canProceedFromDetails = projectName.trim().length > 0;
  const canProceedFromVideos = selectedVideos.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-700">
                Dashboard
              </Link>
            </li>
            <li className="text-neutral-400">/</li>
            <li className="text-neutral-900">New Project</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-heading font-bold text-neutral-900 mb-8">
          Create New Project
        </h1>

        {/* Progress Steps */}
        <div className="flex items-center gap-4 mb-8">
          {[
            { key: "details", label: "Project Details", number: 1 },
            { key: "videos", label: "Select Videos", number: 2 },
            { key: "confirm", label: "Confirm", number: 3 },
          ].map((s, index) => (
            <div key={s.key} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s.key
                    ? "bg-primary-600 text-white"
                    : index < ["details", "videos", "confirm"].indexOf(step)
                      ? "bg-primary-100 text-primary-600"
                      : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {s.number}
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  step === s.key ? "text-neutral-900" : "text-neutral-500"
                }`}
              >
                {s.label}
              </span>
              {index < 2 && <div className="w-12 h-px bg-neutral-200 ml-4" />}
            </div>
          ))}
        </div>

        {/* Step Content */}
        {step === "details" && (
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-heading font-semibold text-neutral-900 mb-6">
              Project Details
            </h2>

            <div className="space-y-6">
              <Input
                label="Project Name"
                placeholder="e.g., My Book on Productivity"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                hint="Give your book project a memorable name"
              />

              <Textarea
                label="Description (optional)"
                placeholder="A brief description of what this book will be about..."
                value={projectDescription}
                onChange={(e) => setProjectDescription(e.target.value)}
                hint="This helps you remember the purpose of this project"
              />
            </div>

            <div className="flex justify-end mt-8">
              <Button onClick={() => setStep("videos")} disabled={!canProceedFromDetails}>
                Continue to Video Selection
              </Button>
            </div>
          </Card>
        )}

        {step === "videos" && (
          <div>
            <Card variant="default" className="p-6 mb-6">
              <h2 className="text-xl font-heading font-semibold text-neutral-900 mb-2">
                Select Videos
              </h2>
              <p className="text-neutral-600">
                Choose the videos from your YouTube channel that you want to transform into a book.
              </p>
            </Card>

            <VideoSelector
              onSelectionChange={setSelectedVideos}
              initialSelection={selectedVideos}
            />

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep("details")}>
                Back
              </Button>
              <Button onClick={() => setStep("confirm")} disabled={!canProceedFromVideos}>
                Continue ({selectedVideos.length} videos selected)
              </Button>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <Card variant="default" className="p-6">
            <h2 className="text-xl font-heading font-semibold text-neutral-900 mb-6">
              Confirm Your Project
            </h2>

            <div className="space-y-6">
              {/* Project Summary */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <h3 className="font-medium text-neutral-900 mb-1">{projectName}</h3>
                {projectDescription && (
                  <p className="text-sm text-neutral-600">{projectDescription}</p>
                )}
              </div>

              {/* Video Summary */}
              <div>
                <h3 className="font-medium text-neutral-900 mb-3">
                  Selected Videos ({selectedVideos.length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[300px] overflow-y-auto">
                  {selectedVideos.map((video) => (
                    <div key={video.id} className="bg-neutral-50 rounded-lg overflow-hidden">
                      <div className="aspect-video bg-neutral-200">
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium text-neutral-900 line-clamp-2">
                          {video.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* What Happens Next */}
              <div className="bg-primary-50 rounded-xl p-4">
                <h3 className="font-medium text-primary-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-primary-700 space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500">1.</span>
                    We&apos;ll fetch transcripts for your selected videos
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500">2.</span>
                    AI will analyze your content and extract your voice profile
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary-500">3.</span>
                    You&apos;ll receive book concept suggestions to choose from
                  </li>
                </ul>
              </div>
            </div>

            {error && (
              <div className="bg-error-50 border border-error-200 rounded-lg p-4">
                <p className="text-error-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-between mt-8">
              <Button variant="outline" onClick={() => setStep("videos")}>
                Back
              </Button>
              <Button onClick={handleCreateProject} isLoading={isCreating}>
                Create Project
              </Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
