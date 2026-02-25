import { X, Star, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SwipeButtonsProps {
  onDislike: () => void;
  onLike: () => void;
  onSuperLike?: () => void;
  disabled?: boolean;
}

/**
 * Action buttons for swipe: Dislike (✕), Super Like (★), Like (♥).
 * Calls callbacks passed from the parent — no Redux dispatch here.
 */
export function SwipeButtons({ onDislike, onLike, onSuperLike, disabled }: SwipeButtonsProps) {
  return (
    <div className="flex items-center justify-center gap-6 py-2">
      {/* Dislike */}
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        className="h-14 w-14 rounded-full border-2 border-red-300 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950"
        title="Пропустить"
        onClick={onDislike}
      >
        <X className="h-7 w-7 text-red-400" />
      </Button>

      {/* Super Like */}
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        className="h-12 w-12 rounded-full border-2 border-yellow-300 hover:border-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-950"
        title="Суперлайк"
        onClick={onSuperLike ?? onLike}
      >
        <Star className="h-5 w-5 text-yellow-400" />
      </Button>

      {/* Like */}
      <Button
        variant="outline"
        size="icon"
        disabled={disabled}
        className="h-14 w-14 rounded-full border-2 border-green-300 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950"
        title="Откликнуться"
        onClick={onLike}
      >
        <Heart className="h-7 w-7 text-green-400" />
      </Button>
    </div>
  );
}
