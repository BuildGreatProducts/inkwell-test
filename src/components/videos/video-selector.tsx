"use client";

import { useState, useEffect } from "react";
import { Button, Input, Card, Spinner } from "@/components/ui";
import type { YouTubeVideo } from "@/lib/youtube/api";

interface VideoSelectorProps {
  onSelectionChange: (selectedVideos: YouTubeVideo[]) => void;
  initialSelection?: YouTubeVideo[];
}

export function VideoSelector({ onSelectionChange, initialSelection = [] }: VideoSelectorProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selectedVideos, setSelectedVideos] = useState<Map<string, YouTubeVideo>>(
    new Map(initialSelection.map((v) => [v.id, v]))
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Date filters
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchVideos = async (pageToken?: string, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (pageToken) params.set("pageToken", pageToken);
      if (searchQuery) params.set("q", searchQuery);
      if (dateFrom) params.set("publishedAfter", new Date(dateFrom).toISOString());
      if (dateTo) params.set("publishedBefore", new Date(dateTo).toISOString());

      const response = await fetch(`/api/youtube/videos?${params.toString()}`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch videos");
      }

      const data = await response.json();

      if (append) {
        setVideos((prev) => [...prev, ...data.items]);
      } else {
        setVideos(data.items);
      }
      setNextPageToken(data.nextPageToken || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch videos");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchVideos();
  }, []);

  const handleSearch = () => {
    fetchVideos();
  };

  const handleLoadMore = () => {
    if (nextPageToken) {
      fetchVideos(nextPageToken, true);
    }
  };

  const toggleVideoSelection = (video: YouTubeVideo) => {
    setSelectedVideos((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(video.id)) {
        newMap.delete(video.id);
      } else {
        newMap.set(video.id, video);
      }
      onSelectionChange(Array.from(newMap.values()));
      return newMap;
    });
  };

  const selectAll = () => {
    const newMap = new Map<string, YouTubeVideo>();
    videos.forEach((v) => newMap.set(v.id, v));
    setSelectedVideos(newMap);
    onSelectionChange(Array.from(newMap.values()));
  };

  const deselectAll = () => {
    setSelectedVideos(new Map());
    onSelectionChange([]);
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card variant="bordered" className="p-8 text-center">
        <div className="text-error-600 mb-4">{error}</div>
        <Button onClick={() => fetchVideos()}>Try Again</Button>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <Input
            label="Search videos"
            placeholder="Search by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div>
          <Input
            type="date"
            label="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <Input
            type="date"
            label="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      {/* Selection Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-neutral-600">
          {selectedVideos.size} of {videos.length} videos selected
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAll}>
            Deselect All
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      {videos.length === 0 ? (
        <Card variant="bordered" className="p-8 text-center">
          <p className="text-neutral-600">No videos found. Try adjusting your filters.</p>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => {
            const isSelected = selectedVideos.has(video.id);
            return (
              <div
                key={video.id}
                onClick={() => toggleVideoSelection(video)}
                className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                  isSelected
                    ? "border-primary-500 shadow-md"
                    : "border-transparent hover:border-neutral-300"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-video bg-neutral-100">
                  {video.thumbnailUrl && (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                  )}
                  {/* Duration Badge */}
                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-1.5 py-0.5 rounded">
                    {video.duration}
                  </div>
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2">
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        isSelected
                          ? "bg-primary-600 border-primary-600"
                          : "bg-white/80 border-neutral-300"
                      }`}
                    >
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="white"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
                {/* Info */}
                <div className="p-3 bg-white">
                  <h3 className="font-medium text-sm text-neutral-900 line-clamp-2">
                    {video.title}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    {new Date(video.publishedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Load More */}
      {nextPageToken && (
        <div className="text-center pt-4">
          <Button variant="outline" onClick={handleLoadMore} isLoading={loadingMore}>
            Load More Videos
          </Button>
        </div>
      )}
    </div>
  );
}
