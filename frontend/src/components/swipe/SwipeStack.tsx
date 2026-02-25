import { useAppSelector } from "@/store";
import { useSwipeGesture } from "@/features/swipe/useSwipeGesture";
import { SwipeCard } from "./SwipeCard";

interface SwipeStackProps {
  exitDir: "left" | "right" | null;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

/**
 * Renders the top 3 cards as a depth stack.
 * The top card receives drag gesture handlers and the exit animation style.
 * Cards behind it are scaled + translated to create depth.
 */
export function SwipeStack({ exitDir, onSwipeLeft, onSwipeRight }: SwipeStackProps) {
  const deck = useAppSelector((s) => s.swipe.deck);
  const { x, rotate, direction, handlers } = useSwipeGesture(onSwipeLeft, onSwipeRight);

  const visibleCards = deck.slice(-3);

  if (visibleCards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
        <span className="text-6xl">🎉</span>
        <p className="text-lg font-semibold">Все вакансии просмотрены!</p>
        <p className="text-sm">Загляните позже — появятся новые</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {visibleCards.map((card, i) => {
        const isTop = i === visibleCards.length - 1;
        const stackIndex = visibleCards.length - 1 - i;

        // Top card: either flying out (exitDir set) or following the drag
        const topStyle: React.CSSProperties | undefined = isTop
          ? exitDir
            ? {
                transform: `translateX(${exitDir === "right" ? 900 : -900}px) rotate(${exitDir === "right" ? 30 : -30}deg)`,
                transition: "transform 0.35s ease",
              }
            : {
                transform: `translateX(${x}px) rotate(${rotate}deg)`,
                transition: x === 0 ? "transform 0.3s ease" : "none",
              }
          : undefined;

        // Gesture handlers only on top card when not already exiting
        const gestureHandlers = isTop && !exitDir ? handlers : {};

        return (
          <SwipeCard
            key={card.id}
            card={card}
            isTop={isTop}
            stackIndex={stackIndex}
            style={topStyle}
            direction={isTop && !exitDir ? direction : null}
            {...gestureHandlers}
          />
        );
      })}
    </div>
  );
}
