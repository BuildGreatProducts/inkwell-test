"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Header } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardDescription, LoadingScreen } from "@/components/ui";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.projectId as Id<"projects">;

  const project = useQuery(api.projects.getWithDetails, { projectId });
  const transcriptStats = useQuery(api.videos.getTranscriptStats, { projectId });
  const [isFetchingTranscripts, setIsFetchingTranscripts] = useState(false);

  if (project === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingScreen message="Loading project..." />
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

  const handleFetchTranscripts = async () => {
    setIsFetchingTranscripts(true);

    try {
      // Call the API endpoint which handles status updates internally
      const response = await fetch("/api/transcripts/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      const result = await response.json();

      // If there are more videos pending, the API will tell us
      if (result.remaining > 0) {
        console.log(`${result.remaining} more videos pending. Fetching...`);
        // Recursively fetch more (the API limits to MAX_BATCH_SIZE per request)
        await handleFetchTranscripts();
      }
    } catch (error) {
      console.error("Failed to fetch transcripts:", error);
    } finally {
      setIsFetchingTranscripts(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success-50 text-success-600";
      case "fetching":
        return "bg-primary-50 text-primary-600";
      case "failed":
      case "unavailable":
        return "bg-error-50 text-error-600";
      default:
        return "bg-neutral-100 text-neutral-600";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-700">
                Dashboard
              </Link>
            </li>
            <li className="text-neutral-400">/</li>
            <li className="text-neutral-900">{project.name}</li>
          </ol>
        </nav>

        {/* Project Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-neutral-900">{project.name}</h1>
            {project.description && (
              <p className="mt-2 text-neutral-600">{project.description}</p>
            )}
            <div className="mt-3 flex items-center gap-4">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  project.status === "completed"
                    ? "bg-success-50 text-success-600"
                    : project.status === "draft"
                      ? "bg-neutral-100 text-neutral-600"
                      : "bg-primary-50 text-primary-600"
                }`}
              >
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
              <span className="text-sm text-neutral-500">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">Edit Project</Button>
            {project.status === "draft" && transcriptStats && transcriptStats.pending > 0 && (
              <Button variant="secondary" onClick={handleFetchTranscripts} isLoading={isFetchingTranscripts}>
                {isFetchingTranscripts ? "Fetching..." : `Fetch Transcripts (${transcriptStats.pending} pending)`}
              </Button>
            )}
            {transcriptStats && transcriptStats.completed > 0 && (
              <Link href={`/projects/${projectId}/analyze`}>
                <Button>
                  {project.voiceProfile ? "View Analysis" : "Start Analysis"}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card variant="bordered" className="p-4">
            <div className="text-2xl font-bold text-neutral-900">{project.videos.length}</div>
            <div className="text-sm text-neutral-500">Videos</div>
          </Card>
          <Card variant="bordered" className="p-4">
            <div className="text-2xl font-bold text-neutral-900">
              {transcriptStats?.completed || 0}
            </div>
            <div className="text-sm text-neutral-500">Transcripts Ready</div>
          </Card>
          <Card variant="bordered" className="p-4">
            <div className="text-2xl font-bold text-neutral-900">{project.chapters.length}</div>
            <div className="text-sm text-neutral-500">Chapters</div>
          </Card>
          <Card variant="bordered" className="p-4">
            <div className="text-2xl font-bold text-neutral-900">
              {project.voiceProfile ? "Yes" : "No"}
            </div>
            <div className="text-sm text-neutral-500">Voice Profile</div>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Videos List */}
          <div className="lg:col-span-2">
            <Card variant="default">
              <CardHeader>
                <CardTitle>Videos ({project.videos.length})</CardTitle>
                <CardDescription>
                  Videos selected for this book project
                </CardDescription>
              </CardHeader>

              <div className="divide-y divide-neutral-100">
                {project.videos.length === 0 ? (
                  <div className="p-6 text-center text-neutral-500">
                    No videos in this project yet.
                  </div>
                ) : (
                  project.videos.map((video) => (
                    <div key={video._id} className="p-4 flex items-start gap-4">
                      {/* Thumbnail */}
                      <div className="w-32 flex-shrink-0">
                        <div className="aspect-video bg-neutral-100 rounded-lg overflow-hidden">
                          {video.thumbnailUrl && (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-900 line-clamp-2">
                          {video.title}
                        </h3>
                        <div className="mt-1 flex items-center gap-3 text-sm text-neutral-500">
                          <span>{video.duration}</span>
                          <span>
                            {video.publishedAt &&
                              new Date(video.publishedAt).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(video.transcriptStatus)}`}
                          >
                            {video.transcriptStatus === "completed"
                              ? "Transcript Ready"
                              : video.transcriptStatus === "fetching"
                                ? "Fetching..."
                                : video.transcriptStatus === "failed"
                                  ? "Failed"
                                  : video.transcriptStatus === "unavailable"
                                    ? "No Transcript"
                                    : "Pending"}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Steps */}
            <Card variant="default">
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6">
                <ol className="space-y-3">
                  <li className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        transcriptStats && transcriptStats.completed === project.videos.length
                          ? "bg-success-100 text-success-600"
                          : "bg-primary-100 text-primary-600"
                      }`}
                    >
                      1
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Fetch Transcripts</p>
                      <p className="text-sm text-neutral-500">
                        {transcriptStats?.completed || 0} of {project.videos.length} complete
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        project.voiceProfile
                          ? "bg-success-100 text-success-600"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      2
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Generate Voice Profile</p>
                      <p className="text-sm text-neutral-500">
                        {project.voiceProfile ? "Completed" : "Not started"}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        project.selectedConcept
                          ? "bg-success-100 text-success-600"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      3
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Choose Book Concept</p>
                      <p className="text-sm text-neutral-500">
                        {project.selectedConcept ? "Selected" : "Not started"}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        project.chapters.length > 0
                          ? "bg-success-100 text-success-600"
                          : "bg-neutral-100 text-neutral-400"
                      }`}
                    >
                      4
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Generate Chapters</p>
                      <p className="text-sm text-neutral-500">
                        {project.chapters.length > 0
                          ? `${project.chapters.length} chapters`
                          : "Not started"}
                      </p>
                    </div>
                  </li>
                </ol>
              </div>
            </Card>

            {/* Quick Actions */}
            <Card variant="default">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <div className="px-6 pb-6 space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M5 12h14" />
                    <path d="M12 5v14" />
                  </svg>
                  Add More Videos
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                    <path d="m15 5 4 4" />
                  </svg>
                  Edit Project Details
                </Button>
                <Button variant="ghost" className="w-full justify-start text-error-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-2"
                  >
                    <path d="M3 6h18" />
                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                  </svg>
                  Delete Project
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
