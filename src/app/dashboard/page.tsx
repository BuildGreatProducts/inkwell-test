"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Header } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardDescription, LoadingScreen } from "@/components/ui";

export default function DashboardPage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const convexUser = useQuery(api.users.getCurrentUser);
  const projects = useQuery(
    api.projects.listByUser,
    convexUser ? { userId: convexUser._id } : "skip"
  );

  if (!isUserLoaded || convexUser === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingScreen message="Loading your dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-heading font-bold text-neutral-900">
              Welcome back{user?.firstName ? `, ${user.firstName}` : ""}
            </h1>
            <p className="mt-1 text-neutral-600">
              Create and manage your book projects
            </p>
          </div>
          <Link href="/projects/new">
            <Button size="lg">
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
                className="mr-2"
              >
                <path d="M5 12h14" />
                <path d="M12 5v14" />
              </svg>
              New Project
            </Button>
          </Link>
        </div>

        {/* YouTube Connection Status */}
        {convexUser && !convexUser.youtubeConnected && (
          <Card variant="bordered" className="mb-8 border-warning-500 bg-warning-50">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-warning-100 flex items-center justify-center flex-shrink-0">
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
                  className="text-warning-600"
                >
                  <path d="m22 8-6 4 6 4V8Z" />
                  <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-neutral-900">Connect your YouTube account</h3>
                <p className="mt-1 text-sm text-neutral-600">
                  Link your YouTube channel to import videos and create your book.
                </p>
                <Link href="/settings/youtube" className="mt-3 inline-block">
                  <Button variant="secondary" size="sm">
                    Connect YouTube
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Projects Grid */}
        <div className="mb-6">
          <h2 className="text-xl font-heading font-semibold text-neutral-900">Your Projects</h2>
        </div>

        {projects === undefined ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} variant="default" className="animate-pulse">
                <div className="h-4 bg-neutral-200 rounded w-3/4 mb-4" />
                <div className="h-3 bg-neutral-200 rounded w-1/2" />
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card variant="bordered" className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mx-auto mb-4">
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
                className="text-neutral-400"
              >
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20" />
              </svg>
            </div>
            <h3 className="font-heading font-semibold text-lg text-neutral-900 mb-2">
              No projects yet
            </h3>
            <p className="text-neutral-600 mb-6 max-w-sm mx-auto">
              Create your first project to start transforming your videos into a book.
            </p>
            <Link href="/projects/new">
              <Button>Create Your First Project</Button>
            </Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Link key={project._id} href={`/projects/${project._id}`}>
                <Card
                  variant="default"
                  className="hover:shadow-lg transition-all hover:border-primary-200 cursor-pointer h-full"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
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
                    </div>
                    <CardTitle className="line-clamp-2">{project.name}</CardTitle>
                    {project.description && (
                      <CardDescription className="line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <div className="px-6 pb-6 pt-2">
                    <div className="flex items-center gap-4 text-sm text-neutral-500">
                      <span className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m22 8-6 4 6 4V8Z" />
                          <rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
                        </svg>
                        {project.selectedVideoIds.length} videos
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                          <line x1="16" x2="16" y1="2" y2="6" />
                          <line x1="8" x2="8" y1="2" y2="6" />
                          <line x1="3" x2="21" y1="10" y2="10" />
                        </svg>
                        {new Date(project.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
