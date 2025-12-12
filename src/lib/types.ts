export interface Poll {
  id: string;
  created_at: string;
  question: string;
  created_by: string;
  is_public: boolean;
  is_featured: boolean;
  featured_image_url: string | null;
  expires_at: string | null;
  status: string;
  max_voters?: number | null;
}

export interface PollOption {
  id: string;
  created_at: string;
  text: string;
  poll_id: string;
  votes: number;
  image_url: string | null;
  position: number;
  description?: string;
}

export interface PollWithOptions extends Poll {
  poll_options: PollOption[];
  has_voted?: boolean;
  is_favorited?: boolean;
}

export interface PollWithUserStatus extends PollWithOptions {
  username?: string;
  user_points?: number;
}

// Pagination & Filtering Types (Step 10)

export type SortBy = 'created_at' | 'votes' | 'expires_at';
export type SortOrder = 'asc' | 'desc';
export type FilterStatus = 'all' | 'active' | 'closed';

export interface GetPollsParams {
  limit?: number;
  offset?: number;
  sortBy?: SortBy;
  sortOrder?: SortOrder;
  filterStatus?: FilterStatus;
}

export interface PaginationMetadata {
  total: number;
  limit: number;
  offset: number;
  hasNextPage: boolean;
  nextOffset: number | null;
}

export interface PollsResponse {
  data: PollWithOptions[];
  pagination: PaginationMetadata;
}

// Leaderboard Types (Step 18)

export type LeaderboardScope = 'global' | 'friends' | 'region';
export type LeaderboardSortBy = 'score' | 'delta' | 'recent_activity';
export type LeaderboardPeriod = '24h' | '7d' | '30d' | 'all';

export interface LeaderboardEntry {
  user_id: string;
  rank: number;
  score: number;
  display_name: string | null;
  avatar_url: string | null;
  delta?: number;
  last_activity_at?: string | null;
  region?: string | null;
}

export interface GetLeaderboardParams {
  limit?: number;
  offset?: number;
  scope?: LeaderboardScope;
  sortBy?: LeaderboardSortBy;
  sortOrder?: SortOrder;
  period?: LeaderboardPeriod;
  region?: string | null;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
  pagination: PaginationMetadata;
}

export type ScoreEventType =
  | "vote"
  | "create_poll"
  | "share"
  | "streak3"
  | "streak7";
