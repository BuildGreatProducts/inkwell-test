"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Header } from "@/components/layout";
import { Button, Card, CardHeader, CardTitle, CardDescription, LoadingScreen } from "@/components/ui";

export default function YouTubeSettingsPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const user = useQuery(api.users.getCurrentUser);
  const disconnectYouTube = useMutation(api.users.disconnectYouTube);

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (success === "true") {
      setMessage({ type: "success", text: "Successfully connected your YouTube account!" });
    } else if (error) {
      const errorMessages: Record<string, string> = {
        oauth_denied: "YouTube authorization was denied.",
        no_code: "No authorization code received from YouTube.",
        invalid_state: "Invalid state parameter. Please try again.",
        user_not_found: "User not found. Please sign in again.",
        token_exchange_failed: "Failed to complete authorization. Please try again.",
      };
      setMessage({
        type: "error",
        text: errorMessages[error] || "An error occurred. Please try again.",
      });
    }
  }, [searchParams]);

  const handleDisconnect = async () => {
    if (!user) return;

    try {
      await disconnectYouTube({ userId: user._id });
      setMessage({ type: "success", text: "YouTube account disconnected." });
    } catch {
      setMessage({ type: "error", text: "Failed to disconnect YouTube account." });
    }
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <LoadingScreen message="Loading settings..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <ol className="flex items-center gap-2 text-sm">
            <li>
              <Link href="/dashboard" className="text-neutral-500 hover:text-neutral-700">
                Dashboard
              </Link>
            </li>
            <li className="text-neutral-400">/</li>
            <li className="text-neutral-900">YouTube Settings</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-heading font-bold text-neutral-900 mb-8">YouTube Connection</h1>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-lg ${
              message.type === "success"
                ? "bg-success-50 border border-success-200 text-success-600"
                : "bg-error-50 border border-error-200 text-error-600"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
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
                >
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <path d="m9 11 3 3L22 4" />
                </svg>
              ) : (
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
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" x2="12" y1="8" y2="12" />
                  <line x1="12" x2="12.01" y1="16" y2="16" />
                </svg>
              )}
              <span>{message.text}</span>
            </div>
          </div>
        )}

        {/* Connection Status Card */}
        <Card variant="default">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  user?.youtubeConnected ? "bg-error-100" : "bg-neutral-100"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill={user?.youtubeConnected ? "#dc2626" : "none"}
                  stroke={user?.youtubeConnected ? "#dc2626" : "currentColor"}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={user?.youtubeConnected ? "" : "text-neutral-400"}
                >
                  <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                  <path d="m10 15 5-3-5-3z" />
                </svg>
              </div>
              <div className="flex-1">
                <CardTitle>YouTube Account</CardTitle>
                <CardDescription>
                  {user?.youtubeConnected
                    ? "Your YouTube account is connected. You can import videos from your channel."
                    : "Connect your YouTube account to import videos and create books from your content."}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="px-6 pb-6">
            {user?.youtubeConnected ? (
              <div className="flex items-center gap-4">
                <span className="inline-flex items-center gap-1.5 text-sm text-success-600">
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
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <path d="m9 11 3 3L22 4" />
                  </svg>
                  Connected
                </span>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Link href="/api/youtube/auth">
                <Button>
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
                    <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
                    <path d="m10 15 5-3-5-3z" />
                  </svg>
                  Connect YouTube Account
                </Button>
              </Link>
            )}
          </div>
        </Card>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-neutral-50 rounded-xl">
          <h3 className="font-medium text-neutral-900 mb-2">What we access:</h3>
          <ul className="text-sm text-neutral-600 space-y-1">
            <li className="flex items-start gap-2">
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
                className="text-success-600 mt-0.5 flex-shrink-0"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              View your YouTube videos and their metadata
            </li>
            <li className="flex items-start gap-2">
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
                className="text-success-600 mt-0.5 flex-shrink-0"
              >
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <path d="m9 11 3 3L22 4" />
              </svg>
              Access video transcripts and captions
            </li>
            <li className="flex items-start gap-2">
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
                className="text-neutral-400 mt-0.5 flex-shrink-0"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="m4.9 4.9 14.2 14.2" />
              </svg>
              We cannot upload, delete, or modify your videos
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
