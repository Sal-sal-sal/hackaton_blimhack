export interface SwipeCard {
  id: number | string;
  type: "job_post" | "candidate";
  source?: "local" | "hh";
  title: string;
  subtitle?: string; // company name or candidate title
  salary?: string; // formatted salary range
  tags?: string[]; // tech_stack or skills
  description?: string;
  logoUrl?: string;
  imageUrl?: string; // background image for the card
  location?: string;
  url?: string; // external link (e.g. HH vacancy page)
  experience?: string; // "От 1 до 3 лет"
  schedule?: string; // "Полный день", "Сменный график"
  employment?: string; // "Полная занятость", "Частичная"
}

export type SwipeDirection = "left" | "right";

export interface SwipeState {
  deck: SwipeCard[];
  liked: (number | string)[];
  disliked: (number | string)[];
  likedCards: SwipeCard[];
  matchedCard: SwipeCard | null;
}
