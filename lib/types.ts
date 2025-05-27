export interface AvalancheACP {
  project_id: string;
  project_number: number;
  project_title: string;
  item_id: string;
  item_type: string;
  item_number: string | null;
  item_title: string;
  item_url: string | null;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
  "Parent issue": string | null;
  "Status": string | null;
  "Sub-issues progress": string | null;
  "Track": string | null;
}

export type AvalancheACPRow = AvalancheACP;

export interface AvalancheACPDiscussion {
  id: string;
  number: number;
  title: string;
  author: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  url: string;
  is_answered: boolean | null;
  answer_chosen_at: string | null;
  answer_chosen_by: string | null;
  comment_count: number | null;
  upvote_count: number | null;
  closed: boolean;
  closed_at: string | null;
  state_reason: string | null;
  labels: string | null;
}

export type AvalancheACPDiscussionRow = AvalancheACPDiscussion;

export interface Database {
  public: {
    Tables: {
      avalanche_acp: {
        Row: AvalancheACPRow;
        Insert: Omit<AvalancheACPRow, 'created_at' | 'updated_at'>;
        Update: Partial<AvalancheACPRow>;
      };
      avalanche_acp_discussions: {
        Row: AvalancheACPDiscussionRow;
        Insert: Omit<AvalancheACPDiscussionRow, 'created_at' | 'updated_at'>;
        Update: Partial<AvalancheACPDiscussionRow>;
      };
    };
  };
} 