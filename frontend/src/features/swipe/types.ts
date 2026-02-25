export interface SwipeCard {
  id: number;
  type: "job_post" | "candidate";
  title: string;
  subtitle?: string; // company name or candidate title
  salary?: string; // formatted salary range
  tags?: string[]; // tech_stack or skills
  description?: string;
  logoUrl?: string;
  location?: string;
}

export type SwipeDirection = "left" | "right";

export interface SwipeState {
  deck: SwipeCard[];
  liked: number[];
  disliked: number[];
  matchedCard: SwipeCard | null;
}
