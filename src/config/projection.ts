export type ProjectionSetId = "set1" | "set2" | "set3";
export type ProjectionSetAlias = "set-a" | "set-b" | "set-c";

export interface ProjectionVideoConfig {
  first: string;
  firstFallback?: string;
  second: string;
  third: string;
}

export interface ProjectionSetConfig {
  id: ProjectionSetId;
  alias: ProjectionSetAlias;
  name: string;
  discipline: string;
  categoryFilter: string;
  videos: ProjectionVideoConfig;
}

export const PROJECTION_SETS: Record<ProjectionSetId, ProjectionSetConfig> = {
  set1: {
    id: "set1",
    alias: "set-a",
    name: "Set 1: Dance Stage",
    discipline: "Dance Stage",
    categoryFilter: "dance",
    videos: {
      first: "/results/set-a/first.mp4",
      second: "/results/set-a/second.mp4",
      third: "/results/set-a/third.mp4",
    },
  },
  set2: {
    id: "set2",
    alias: "set-b",
    name: "Set 2: Singing & Vocals",
    discipline: "Singing & Vocals",
    categoryFilter: "sing",
    videos: {
      first: "/results/set-b/first.mp4",
      second: "/results/set-b/second.mp4",
      third: "/results/set-b/third.mp4",
    },
  },
  set3: {
    id: "set3",
    alias: "set-c",
    name: "Set 3: Instrumental Music",
    discipline: "Instrumental Music",
    categoryFilter: "instrumental",
    videos: {
      first: "/results/set-c/first.mp4",
      second: "/results/set-c/second.mp4",
      third: "/results/set-c/third.mp4",
    },
  },
};

export function normalizeProjectionSetId(input: string | null | undefined): ProjectionSetId {
  if (!input) return "set1";
  const lower = input.toLowerCase();
  if (lower === "set1" || lower === "set-a" || lower === "dance") return "set1";
  if (lower === "set2" || lower === "set-b" || lower === "sing" || lower === "singing") return "set2";
  if (lower === "set3" || lower === "set-c" || lower === "instrumental" || lower === "music") return "set3";
  return "set1";
}

export function getVideoForRank(
  setId: ProjectionSetId,
  rank: 1 | 2 | 3
): { src: string; fallback?: string } {
  const set = PROJECTION_SETS[setId] || PROJECTION_SETS.set1;
  if (rank === 1) {
    return {
      src: set.videos.first,
      fallback: set.videos.firstFallback,
    };
  }
  if (rank === 2) {
    return { src: set.videos.second };
  }
  return { src: set.videos.third };
}

/** Preload videos in the browser for instant playback without buffer stutter */
export function preloadProjectionVideos(setId: ProjectionSetId) {
  if (typeof window === "undefined") return;
  const set = PROJECTION_SETS[setId];
  if (!set) return;

  const urls = [set.videos.third, set.videos.second, set.videos.first];
  if (set.videos.firstFallback) urls.push(set.videos.firstFallback);

  urls.forEach((url) => {
    try {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "video";
      link.href = url;
      document.head.appendChild(link);
    } catch {
      // Ignore link preload issues
    }
  });
}
