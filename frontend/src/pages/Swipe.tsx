import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { setDeck, swipeLeft, swipeRight } from "@/features/swipe/swipeSlice";
import { useGetJobPostsForSwipeQuery } from "@/features/swipe/swipeApi";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import { SwipeButtons } from "@/components/swipe/SwipeButtons";
import { MatchNotification } from "@/components/swipe/MatchNotification";
import { Button } from "@/components/ui/button";
import { Briefcase, RotateCcw } from "lucide-react";

const ANIMATION_DURATION = 350;

export default function SwipePage() {
  const dispatch = useAppDispatch();
  const deck = useAppSelector((s) => s.swipe.deck);
  const liked = useAppSelector((s) => s.swipe.liked);
  const disliked = useAppSelector((s) => s.swipe.disliked);

  const { data: cards, isLoading, isError } = useGetJobPostsForSwipeQuery();

  // Load deck once when cards arrive
  useEffect(() => {
    if (cards && deck.length === 0 && liked.length === 0 && disliked.length === 0) {
      dispatch(setDeck(cards));
    }
  }, [cards, deck.length, liked.length, disliked.length, dispatch]);

  // Exit animation state — shared between SwipeStack and SwipeButtons
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const exitingRef = useRef(false);

  const doSwipe = useCallback(
    (dir: "left" | "right") => {
      if (exitingRef.current || deck.length === 0) return;
      exitingRef.current = true;
      setExitDir(dir);

      setTimeout(() => {
        if (dir === "left") dispatch(swipeLeft());
        else dispatch(swipeRight());
        setExitDir(null);
        exitingRef.current = false;
      }, ANIMATION_DURATION);
    },
    [deck.length, dispatch],
  );

  const handleReset = useCallback(() => {
    if (cards) dispatch(setDeck(cards));
  }, [cards, dispatch]);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-base">Не удалось загрузить вакансии</p>
        <p className="text-sm">Убедитесь, что backend запущен</p>
      </div>
    );
  }

  // ── No posts in DB at all ───────────────────────────────────────────────
  if (!isLoading && cards && cards.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Briefcase className="h-12 w-12 opacity-40" />
        <p className="text-lg font-semibold">Нет вакансий</p>
        <p className="text-sm">Пока что никто не разместил вакансии — загляните позже</p>
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  const isDeckEmpty = deck.length === 0;
  const total = liked.length + disliked.length;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold">Вакансии</h1>
          {total > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {liked.length} отклик{liked.length !== 1 ? "а" : ""} · {disliked.length} пропущено
            </p>
          )}
        </div>

        {isDeckEmpty && cards && cards.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Сначала
          </Button>
        )}
      </div>

      {/* Card stack — takes remaining space */}
      <div className="relative flex-1 min-h-0">
        <SwipeStack
          exitDir={exitDir}
          onSwipeLeft={() => doSwipe("left")}
          onSwipeRight={() => doSwipe("right")}
        />
      </div>

      {/* Action buttons */}
      <div className="shrink-0">
        <SwipeButtons
          disabled={isDeckEmpty || exitingRef.current}
          onDislike={() => doSwipe("left")}
          onLike={() => doSwipe("right")}
        />
      </div>

      {/* Match overlay */}
      <MatchNotification />
    </div>
  );
}
