import { useEffect, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { setDeck, swipeLeft, swipeRight, resetDeck } from "@/features/swipe/swipeSlice";
import {
  useGetJobPostsForSwipeQuery,
  useGetHHSwipeFeedQuery,
  useLikeJobPostMutation,
  mergeSwipeDecks,
} from "@/features/swipe/swipeApi";
import { SwipeStack } from "@/components/swipe/SwipeStack";
import { SwipeButtons } from "@/components/swipe/SwipeButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Briefcase, RotateCcw, Search, ExternalLink, Heart, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { useAddFavoriteMutation } from "@/features/favorites/favoritesApi";

const ANIMATION_DURATION = 350;

const AREAS = [
  { id: 1, name: "Москва" },
  { id: 2, name: "СПб" },
  { id: 3, name: "Екатеринбург" },
  { id: 4, name: "Новосибирск" },
  { id: 113, name: "Вся Россия" },
];

export default function SwipePage() {
  const dispatch = useAppDispatch();
  const deck = useAppSelector((s) => s.swipe.deck);
  const liked = useAppSelector((s) => s.swipe.liked);
  const disliked = useAppSelector((s) => s.swipe.disliked);
  const likedCards = useAppSelector((s) => s.swipe.likedCards);

  const [addFavorite] = useAddFavoriteMutation();
  const [likeJobPost] = useLikeJobPostMutation();

  // Toggle liked list visibility
  const [showLiked, setShowLiked] = useState(false);

  // HH search params
  const [hhQuery, setHhQuery] = useState("");
  const [hhArea, setHhArea] = useState(1);
  const [activeSearch, setActiveSearch] = useState<{ q: string; area: number } | null>(null);

  // Fetch local job posts
  const { data: localCards, isLoading: localLoading, isError: localError } =
    useGetJobPostsForSwipeQuery();

  // Fetch HH vacancies (only when search is active)
  const { data: hhCards, isLoading: hhLoading } = useGetHHSwipeFeedQuery(
    activeSearch ?? { q: "" },
    { skip: !activeSearch },
  );

  // Load deck when data arrives
  const deckInitialized = useRef(false);
  useEffect(() => {
    if (deckInitialized.current) return;
    const local = localCards ?? [];
    const hh = hhCards ?? [];
    if (localLoading) return;

    if (local.length > 0 || hh.length > 0) {
      dispatch(setDeck(mergeSwipeDecks(local, hh)));
      deckInitialized.current = true;
    }
  }, [localCards, hhCards, localLoading, dispatch]);

  // When HH results arrive, re-merge into deck
  useEffect(() => {
    if (!activeSearch || !hhCards || hhLoading) return;
    const local = localCards ?? [];
    dispatch(resetDeck(mergeSwipeDecks(local, hhCards)));
  }, [hhCards, hhLoading, activeSearch, localCards, dispatch]);

  // Exit animation state
  const [exitDir, setExitDir] = useState<"left" | "right" | null>(null);
  const exitingRef = useRef(false);

  const doSwipe = useCallback(
    (dir: "left" | "right") => {
      if (exitingRef.current || deck.length === 0) return;

      const card = deck[deck.length - 1];
      exitingRef.current = true;
      setExitDir(dir);

      if (dir === "right" && card) {
        // Save to favorites (personal bookmarks)
        addFavorite({
          vacancy_id: String(card.id),
          source: card.source ?? "local",
          title: card.title,
          subtitle: card.subtitle,
          salary: card.salary,
          tags: card.tags ?? [],
          description: card.description,
          logo_url: card.logoUrl,
          location: card.location,
          url: card.url,
        });

        // Send like to backend (creates an application/отклик for employer to see)
        if (card.source === "local" && typeof card.id === "number") {
          likeJobPost(card.id);
        }
      }

      setTimeout(() => {
        dispatch(dir === "right" ? swipeRight() : swipeLeft());
        setExitDir(null);
        exitingRef.current = false;
      }, ANIMATION_DURATION);
    },
    [deck, dispatch, addFavorite, likeJobPost],
  );

  const handleReset = useCallback(() => {
    const local = localCards ?? [];
    const hh = hhCards ?? [];
    dispatch(resetDeck(mergeSwipeDecks(local, hh)));
  }, [localCards, hhCards, dispatch]);

  // Search bar collapse state
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const handleHHSearch = () => {
    if (!hhQuery.trim()) return;
    deckInitialized.current = false;
    setActiveSearch({ q: hhQuery.trim(), area: hhArea });
    setSearchCollapsed(true);
    setSearchOpen(false);
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (localLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (localError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <p className="text-base">Не удалось загрузить вакансии</p>
        <p className="text-sm">Убедитесь, что backend запущен</p>
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  const isDeckEmpty = deck.length === 0;
  const total = liked.length + disliked.length;

  return (
    <div className="relative flex h-full flex-col">

      {/* ═══ FULL-SCREEN CARD STACK ═══ */}
      <div className="relative flex-1 min-h-0">
        {isDeckEmpty && !hhLoading ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-6">
            {total > 0 ? (
              <>
                <span className="text-6xl">🎉</span>
                <p className="text-lg font-semibold">Все вакансии просмотрены!</p>
                <p className="text-sm text-center">Попробуйте поискать на HeadHunter</p>
              </>
            ) : (
              <>
                <Briefcase className="h-12 w-12 opacity-40" />
                <p className="text-lg font-semibold">Нет вакансий</p>
                <p className="text-sm text-center">Введите запрос, чтобы найти вакансии на HH</p>
              </>
            )}
          </div>
        ) : (
          <SwipeStack
            exitDir={exitDir}
            onSwipeLeft={() => doSwipe("left")}
            onSwipeRight={() => doSwipe("right")}
          />
        )}

        {/* ── Overlay: top-right controls (search + reset) ── */}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
          {hhLoading && (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}

          {isDeckEmpty && (localCards?.length ?? 0) > 0 && (
            <button
              onClick={handleReset}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              title="Сначала"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}

          {/* Search icon */}
          <div className="relative">
            <button
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Поиск"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* Dropdown search panel */}
            {searchOpen && (
              <div
                className="absolute right-0 top-12 z-50 w-[300px] sm:w-[400px] rounded-xl border bg-background p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200"
                onMouseLeave={() => setSearchOpen(false)}
              >
                <div className="flex flex-col gap-2">
                  <Input
                    autoFocus
                    placeholder="Поиск на HeadHunter"
                    value={hhQuery}
                    onChange={(e) => setHhQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleHHSearch(); }}
                  />
                  <div className="flex gap-2">
                    <select
                      value={hhArea}
                      onChange={(e) => setHhArea(Number(e.target.value))}
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                    >
                      {AREAS.map((a) => (
                        <option key={a.id} value={a.id}>{a.name}</option>
                      ))}
                    </select>
                    <Button onClick={handleHHSearch} disabled={hhLoading || !hhQuery.trim()} size="sm">
                      <Search className="h-4 w-4 mr-1" />
                      HH
                    </Button>
                  </div>
                  {activeSearch && (
                    <p className="text-xs text-muted-foreground truncate">
                      Текущий: «{activeSearch.q}» · {AREAS.find((a) => a.id === activeSearch.area)?.name}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Overlay: stats badge top-left ── */}
        {total > 0 && (
          <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 text-xs text-white backdrop-blur-sm">
            <Heart className="h-3 w-3 text-green-400" />
            {liked.length}
            <span className="text-white/50 mx-0.5">·</span>
            {disliked.length} пропущено
          </div>
        )}
      </div>

      {/* ═══ ACTION BUTTONS — overlaid at bottom on mobile ═══ */}
      {!isDeckEmpty && (
        <div className="absolute bottom-6 inset-x-0 z-30 flex justify-center lg:static lg:pb-4 lg:pt-2">
          <SwipeButtons
            disabled={isDeckEmpty || exitingRef.current}
            onDislike={() => doSwipe("left")}
            onLike={() => doSwipe("right")}
          />
        </div>
      )}

      {/* ═══ LIKED LIST — only on desktop ═══ */}
      {likedCards.length > 0 && (
        <div className="hidden lg:block shrink-0 border-t pt-3 px-4 pb-4">
          <button
            onClick={() => setShowLiked((v) => !v)}
            className="flex w-full items-center justify-between text-sm font-semibold text-foreground"
          >
            <span className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-green-500" />
              Понравившиеся ({likedCards.length})
            </span>
            {showLiked ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {showLiked && (
            <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
              {likedCards.map((card) => (
                <div
                  key={card.id}
                  className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm"
                >
                  {card.logoUrl ? (
                    <img src={card.logoUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{card.title}</p>
                    {card.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">{card.subtitle}</p>
                    )}
                    <div className="flex items-center gap-3 mt-0.5">
                      {card.salary && (
                        <span className="text-xs font-medium text-green-600 dark:text-green-400">{card.salary}</span>
                      )}
                      {card.location && (
                        <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />{card.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {card.url && (
                    <a
                      href={card.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
