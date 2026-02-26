import { useRef, useState, useCallback, useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store";
import { updateCard } from "@/features/swipe/swipeSlice";
import { useSwipeGesture } from "@/features/swipe/useSwipeGesture";
import { SwipeCard } from "./SwipeCard";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface SwipeStackProps {
  exitDir: "left" | "right" | null;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

/**
 * Renders the top 3 cards as a depth stack with Tinder-like physics
 * and Instagram Stories-like tap zones.
 *
 * Tap left  → if on details view, go back to image; otherwise skip (swipe left)
 * Tap right → if on image view, show details; otherwise like (swipe right)
 * Drag      → Tinder swipe with physics
 */
export function SwipeStack({ exitDir, onSwipeLeft, onSwipeRight }: SwipeStackProps) {
  const deck = useAppSelector((s) => s.swipe.deck);
  const dispatch = useAppDispatch();

  // Track whether the top card is showing the details side
  const [showDetails, setShowDetails] = useState(false);

  // Reset details view when the top card changes (after swipe)
  const topCard = deck.length > 0 ? deck[deck.length - 1] : null;
  const topCardId = topCard?.id ?? null;
  const prevTopCardRef = useRef(topCardId);
  if (topCardId !== prevTopCardRef.current) {
    prevTopCardRef.current = topCardId;
    if (showDetails) setShowDetails(false);
  }

  // Lazy-fetch full HH description when details view is opened
  const fetchedRef = useRef<Set<string | number>>(new Set());
  useEffect(() => {
    if (!showDetails || !topCard) return;
    if (topCard.source !== "hh") return;
    if (fetchedRef.current.has(topCard.id)) return;

    // Check if description already has HTML (= full description loaded)
    const hasFullDesc = topCard.description && /<[a-z][\s\S]*>/i.test(topCard.description);
    if (hasFullDesc) return;

    fetchedRef.current.add(topCard.id);
    const rawId = String(topCard.id).replace(/^hh_/, "");

    fetch(`${API_BASE}/career-ai/hh-vacancy/${rawId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.description) {
          dispatch(
            updateCard({
              id: topCard.id,
              changes: {
                description: data.description,
                tags: data.key_skills?.length ? data.key_skills : topCard.tags,
              },
            }),
          );
        }
      })
      .catch(() => {/* ignore */});
  }, [showDetails, topCard, dispatch]);

  // Dynamic city image: fetch from backend for cards with location but no imageUrl
  const cityFetchedRef = useRef<Set<string | number>>(new Set());
  useEffect(() => {
    const cardsToProcess = deck.slice(-3); // top 3 visible cards
    for (const card of cardsToProcess) {
      if (!card.location || card.imageUrl || cityFetchedRef.current.has(card.id)) continue;
      cityFetchedRef.current.add(card.id);

      fetch(`${API_BASE}/career-ai/city-image?city=${encodeURIComponent(card.location)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.image_url) {
            dispatch(updateCard({ id: card.id, changes: { imageUrl: data.image_url } }));
          }
        })
        .catch(() => {/* gradient fallback */});
    }
  }, [topCard, deck, dispatch]);

  // Wrapped swipe handlers that reset details state
  const handleSwipeLeft = useCallback(() => {
    setShowDetails(false);
    onSwipeLeft();
  }, [onSwipeLeft]);

  const handleSwipeRight = useCallback(() => {
    setShowDetails(false);
    onSwipeRight();
  }, [onSwipeRight]);

  const { x, y, rotate, direction, dragProgress, handlers } = useSwipeGesture(
    handleSwipeLeft,
    handleSwipeRight,
    // onTap: Instagram Stories-like navigation
    (side) => {
      if (side === "right") {
        if (!showDetails) {
          // Image → Details
          setShowDetails(true);
        } else {
          // Details → like (swipe right)
          onSwipeRight();
        }
      } else {
        if (showDetails) {
          // Details → back to Image
          setShowDetails(false);
        } else {
          // Image → skip (swipe left)
          onSwipeLeft();
        }
      }
    },
  );

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

  const isDragging = x !== 0 || y !== 0;
  const effectiveDragProgress = exitDir ? 1 : dragProgress;

  // Progress bars: 2 segments per card (image | details)
  const totalBars = 2;
  const currentBar = showDetails ? 1 : 0;

  return (
    <div className="relative h-full w-full">
      {visibleCards.map((card, i) => {
        const isTop = i === visibleCards.length - 1;
        const stackIndex = visibleCards.length - 1 - i;

        let topStyle: React.CSSProperties | undefined;

        if (isTop) {
          if (exitDir) {
            topStyle = {
              transform: `translateX(${exitDir === "right" ? "calc(100vw + 200px)" : "calc(-100vw - 200px)"}) rotate(${exitDir === "right" ? 30 : -30}deg)`,
              transition: "transform 0.38s cubic-bezier(0.55, 0, 1, 0.45)",
              zIndex: 10,
            };
          } else {
            const liftScale = 1 + dragProgress * 0.03;
            topStyle = {
              transform: `translateX(${x}px) translateY(${y}px) rotate(${rotate}deg) scale(${liftScale})`,
              transition: isDragging ? "none" : "transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
              zIndex: 10,
            };
          }
        }

        const gestureHandlers = isTop && !exitDir ? handlers : {};

        return (
          <SwipeCard
            key={card.id}
            card={card}
            isTop={isTop}
            stackIndex={stackIndex}
            style={topStyle}
            direction={isTop && !exitDir ? direction : null}
            dragProgress={isTop ? dragProgress : effectiveDragProgress}
            showDetails={isTop ? showDetails : false}
            totalBars={isTop ? totalBars : 0}
            currentBar={isTop ? currentBar : 0}
            {...gestureHandlers}
          />
        );
      })}
    </div>
  );
}
