export interface Poll {
  id: string;
  created_at: string;
  question: string;
  user_id: string;
  expires_at: string;
  status: string;
}

export interface PollOption {
  id: string;
  created_at: string;
  text: string;
  poll_id: string;
  votes: number;
  image_url: string | null;
  description?: string;
}

export interface PollWithOptions extends Poll {
  poll_options: PollOption[];
  has_voted?: boolean;
}

export interface PollWithUserStatus extends PollWithOptions {
  username?: string;
  user_points?: number;
}
