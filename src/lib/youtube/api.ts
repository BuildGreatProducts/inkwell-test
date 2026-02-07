// YouTube Data API client

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  duration: string;
  publishedAt: string;
}

export interface YouTubeChannel {
  id: string;
  title: string;
  thumbnailUrl: string;
  subscriberCount: string;
}

export interface YouTubeVideoListResponse {
  items: YouTubeVideo[];
  nextPageToken?: string;
  totalResults: number;
}

// Get authenticated user's channel info
export async function getMyChannel(accessToken: string): Promise<YouTubeChannel | null> {
  const response = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=snippet,statistics&mine=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch channel: ${response.statusText}`);
  }

  const data = await response.json();
  const channel = data.items?.[0];

  if (!channel) {
    return null;
  }

  return {
    id: channel.id,
    title: channel.snippet.title,
    thumbnailUrl: channel.snippet.thumbnails?.default?.url || "",
    subscriberCount: channel.statistics.subscriberCount,
  };
}

// Get videos from user's channel
export async function getMyVideos(
  accessToken: string,
  options: {
    pageToken?: string;
    maxResults?: number;
    publishedAfter?: string;
    publishedBefore?: string;
    searchQuery?: string;
  } = {}
): Promise<YouTubeVideoListResponse> {
  const { pageToken, maxResults = 25, publishedAfter, publishedBefore, searchQuery } = options;

  // First, get the channel's upload playlist
  const channelResponse = await fetch(
    `${YOUTUBE_API_BASE}/channels?part=contentDetails&mine=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!channelResponse.ok) {
    throw new Error(`Failed to fetch channel: ${channelResponse.statusText}`);
  }

  const channelData = await channelResponse.json();
  const uploadsPlaylistId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

  if (!uploadsPlaylistId) {
    return { items: [], totalResults: 0 };
  }

  // Build playlist items URL
  const params = new URLSearchParams({
    part: "snippet",
    playlistId: uploadsPlaylistId,
    maxResults: maxResults.toString(),
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const playlistResponse = await fetch(`${YOUTUBE_API_BASE}/playlistItems?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!playlistResponse.ok) {
    throw new Error(`Failed to fetch videos: ${playlistResponse.statusText}`);
  }

  const playlistData = await playlistResponse.json();

  // Guard against empty items array
  if (!playlistData.items || playlistData.items.length === 0) {
    return {
      items: [],
      nextPageToken: playlistData.nextPageToken,
      totalResults: playlistData.pageInfo?.totalResults || 0,
    };
  }

  const videoIds = playlistData.items
    .map((item: { snippet: { resourceId: { videoId: string } } }) => item.snippet.resourceId.videoId)
    .join(",");

  // Get video details (including duration)
  const videosResponse = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoIds}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!videosResponse.ok) {
    throw new Error(`Failed to fetch video details: ${videosResponse.statusText}`);
  }

  const videosData = await videosResponse.json();

  // Guard against empty video details
  if (!videosData.items || videosData.items.length === 0) {
    return {
      items: [],
      nextPageToken: playlistData.nextPageToken,
      totalResults: playlistData.pageInfo?.totalResults || 0,
    };
  }

  let videos: YouTubeVideo[] = videosData.items.map(
    (video: {
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { medium?: { url: string } };
        publishedAt: string;
      };
      contentDetails: { duration: string };
    }) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails?.medium?.url || "",
      duration: formatDuration(video.contentDetails.duration),
      publishedAt: video.snippet.publishedAt,
    })
  );

  // Apply client-side filters
  if (publishedAfter) {
    const afterDate = new Date(publishedAfter);
    videos = videos.filter((v) => new Date(v.publishedAt) >= afterDate);
  }

  if (publishedBefore) {
    const beforeDate = new Date(publishedBefore);
    videos = videos.filter((v) => new Date(v.publishedAt) <= beforeDate);
  }

  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    videos = videos.filter(
      (v) => v.title.toLowerCase().includes(query) || v.description.toLowerCase().includes(query)
    );
  }

  return {
    items: videos,
    nextPageToken: playlistData.nextPageToken,
    totalResults: playlistData.pageInfo?.totalResults || videos.length,
  };
}

// Search videos on user's channel
export async function searchMyVideos(
  accessToken: string,
  query: string,
  options: {
    pageToken?: string;
    maxResults?: number;
  } = {}
): Promise<YouTubeVideoListResponse> {
  const { pageToken, maxResults = 25 } = options;

  // First get channel ID
  const channelResponse = await fetch(`${YOUTUBE_API_BASE}/channels?part=id&mine=true`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!channelResponse.ok) {
    throw new Error(`Failed to fetch channel: ${channelResponse.statusText}`);
  }

  const channelData = await channelResponse.json();
  const channelId = channelData.items?.[0]?.id;

  if (!channelId) {
    return { items: [], totalResults: 0 };
  }

  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    q: query,
    type: "video",
    maxResults: maxResults.toString(),
  });

  if (pageToken) {
    params.set("pageToken", pageToken);
  }

  const searchResponse = await fetch(`${YOUTUBE_API_BASE}/search?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!searchResponse.ok) {
    throw new Error(`Failed to search videos: ${searchResponse.statusText}`);
  }

  const searchData = await searchResponse.json();

  // Guard against empty items array
  if (!searchData.items || searchData.items.length === 0) {
    return {
      items: [],
      nextPageToken: searchData.nextPageToken,
      totalResults: searchData.pageInfo?.totalResults || 0,
    };
  }

  const videoIds = searchData.items
    .map((item: { id: { videoId: string } }) => item.id.videoId)
    .join(",");

  if (!videoIds) {
    return { items: [], nextPageToken: searchData.nextPageToken, totalResults: 0 };
  }

  // Get video details
  const videosResponse = await fetch(
    `${YOUTUBE_API_BASE}/videos?part=snippet,contentDetails&id=${videoIds}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!videosResponse.ok) {
    throw new Error(`Failed to fetch video details: ${videosResponse.statusText}`);
  }

  const videosData = await videosResponse.json();

  // Guard against empty video details
  if (!videosData.items || videosData.items.length === 0) {
    return {
      items: [],
      nextPageToken: searchData.nextPageToken,
      totalResults: searchData.pageInfo?.totalResults || 0,
    };
  }

  const videos: YouTubeVideo[] = videosData.items.map(
    (video: {
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails: { medium?: { url: string } };
        publishedAt: string;
      };
      contentDetails: { duration: string };
    }) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnailUrl: video.snippet.thumbnails?.medium?.url || "",
      duration: formatDuration(video.contentDetails.duration),
      publishedAt: video.snippet.publishedAt,
    })
  );

  return {
    items: videos,
    nextPageToken: searchData.nextPageToken,
    totalResults: searchData.pageInfo?.totalResults || videos.length,
  };
}

// Get video transcript/captions
export async function getVideoTranscript(
  accessToken: string,
  videoId: string
): Promise<string | null> {
  // First, get available captions
  const captionsResponse = await fetch(
    `${YOUTUBE_API_BASE}/captions?part=snippet&videoId=${videoId}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!captionsResponse.ok) {
    if (captionsResponse.status === 403) {
      // No captions available or not accessible
      return null;
    }
    throw new Error(`Failed to fetch captions: ${captionsResponse.statusText}`);
  }

  const captionsData = await captionsResponse.json();
  const captions = captionsData.items || [];

  // Prefer auto-generated English captions, then manual English, then any
  const englishAutoCaption = captions.find(
    (c: { snippet: { language: string; trackKind: string } }) =>
      c.snippet.language === "en" && c.snippet.trackKind === "asr"
  );
  const englishCaption = captions.find(
    (c: { snippet: { language: string } }) => c.snippet.language === "en"
  );
  const anyCaption = captions[0];

  const selectedCaption = englishAutoCaption || englishCaption || anyCaption;

  if (!selectedCaption) {
    return null;
  }

  // Download the caption track
  // Note: This requires the video owner's permission (youtube.readonly scope is sufficient)
  try {
    const downloadResponse = await fetch(
      `${YOUTUBE_API_BASE}/captions/${selectedCaption.id}?tfmt=srt`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!downloadResponse.ok) {
      return null;
    }

    const srtContent = await downloadResponse.text();
    return parseSrtToText(srtContent);
  } catch {
    return null;
  }
}

// Parse SRT format to plain text
function parseSrtToText(srt: string): string {
  const lines = srt.split("\n");
  const textLines: string[] = [];
  let isTextLine = false;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines and timing lines
    if (!trimmedLine || /^\d+$/.test(trimmedLine) || /-->/.test(trimmedLine)) {
      isTextLine = false;
      continue;
    }

    // This is a text line
    if (!isTextLine && textLines.length > 0) {
      textLines.push(" ");
    }
    textLines.push(trimmedLine);
    isTextLine = true;
  }

  return textLines.join("").replace(/<[^>]*>/g, ""); // Remove HTML tags
}

// Format ISO 8601 duration to human-readable format
function formatDuration(isoDuration: string): string {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);

  if (!match) {
    return "0:00";
  }

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
