import { useState, useRef } from "react";
import { Briefcase, MapPin, ExternalLink, DollarSign, Building2, Clock, Calendar, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwipeCard as SwipeCardType } from "@/features/swipe/types";

interface SwipeCardProps {
  card: SwipeCardType;
  isTop: boolean;
  stackIndex: number;
  style?: React.CSSProperties;
  direction?: "left" | "right" | null;
  dragProgress?: number;
  /** Whether the card is showing the details (text) side */
  showDetails?: boolean;
  /** Progress bar: total number of segments to show (max 8) */
  totalBars?: number;
  /** Progress bar: index of the current (active) segment, 0-based */
  currentBar?: number;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: () => void;
}

function stringToColor(str: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function stringToGradient(str: string): string {
  const gradients = [
    "from-blue-600 to-indigo-900",
    "from-purple-600 to-pink-900",
    "from-teal-600 to-cyan-900",
    "from-rose-600 to-red-900",
    "from-amber-600 to-orange-900",
    "from-green-600 to-emerald-900",
    "from-fuchsia-600 to-purple-900",
    "from-sky-600 to-blue-900",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return gradients[Math.abs(hash) % gradients.length];
}

const SCALE_MAP = [1, 0.95, 0.9];
const TRANSLATE_Y_MAP = [0, 14, 28];

export function SwipeCard({
  card,
  isTop,
  stackIndex,
  style,
  direction,
  dragProgress = 0,
  showDetails = false,
  totalBars = 0,
  currentBar = 0,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: SwipeCardProps) {
  const scale = SCALE_MAP[stackIndex] ?? 0.85;
  const translateY = TRANSLATE_Y_MAP[stackIndex] ?? 42;
  const [imgFailed, setImgFailed] = useState(false);

  let cardStyle: React.CSSProperties;
  if (isTop) {
    cardStyle = { ...style, zIndex: 10 - stackIndex };
  } else {
    const adjustedScale = scale + (1 - scale) * dragProgress;
    const adjustedTranslateY = translateY * (1 - dragProgress);
    cardStyle = {
      transform: `scale(${adjustedScale}) translateY(${adjustedTranslateY}px)`,
      transition: "transform 0.3s ease",
      zIndex: 10 - stackIndex,
    };
  }

  const overlayOpacity = direction ? Math.min(dragProgress * 1.4, 1) : 0;
  const hasImage = card.imageUrl && !imgFailed;
  const gradient = stringToGradient(card.subtitle ?? card.title);
  const showBars = isTop && totalBars > 0;
  const [imgLoaded, setImgLoaded] = useState(false);

  // Reset load state when image URL changes
  const prevImgRef = useRef(card.imageUrl);
  if (card.imageUrl !== prevImgRef.current) {
    prevImgRef.current = card.imageUrl;
    setImgLoaded(false);
    setImgFailed(false);
  }

  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      )}
      style={cardStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="relative h-full w-full overflow-hidden rounded-none shadow-xl lg:rounded-2xl lg:max-h-[1000px] lg:max-w-[618px]">

        {/* ── Instagram Stories progress bars (2 segments: image | details) ── */}
        {showBars && (
          <div className="absolute inset-x-3 top-3 z-30 flex gap-[3px]">
Hey, Cortana.             {Array.from({ length: totalBars }, (_, i) => (
              <div
                key={i}
                className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/35"
              >
                <div
                  className="h-full rounded-full bg-white transition-all duration-200"
                  style={{ width: i <= currentBar ? "100%" : "0%" }}
                />
              </div>
            ))}
          </div>
        )}

        {/* LIKE overlay */}
        {isTop && (
          <div
            className="absolute top-8 left-6 z-20 rotate-[-20deg] rounded-lg border-4 border-green-400 px-4 py-2 pointer-events-none"
            style={{ opacity: direction === "right" ? overlayOpacity : 0, transition: "opacity 0.05s" }}
          >
            <span className="text-2xl font-black uppercase text-green-400">LIKE</span>
          </div>
        )}

        {/* NOPE overlay */}
        {isTop && (
          <div
            className="absolute top-8 right-6 z-20 rotate-[20deg] rounded-lg border-4 border-red-400 px-4 py-2 pointer-events-none"
            style={{ opacity: direction === "left" ? overlayOpacity : 0, transition: "opacity 0.05s" }}
          >
            <span className="text-2xl font-black uppercase text-red-400">NOPE</span>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 1: Image / preview (default)                                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {!showDetails && (
          <>
            {/* Background: gradient always present, image fades in on top */}
            <div className={cn("absolute inset-0 bg-gradient-to-b", gradient)} />
            {hasImage && (
              <img
                src={card.imageUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
                style={{ opacity: imgLoaded ? 1 : 0 }}
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgFailed(true)}
              />
            )}

            {/* Dark overlay — tall gradient leaving clear zone for buttons at bottom */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.85) 15%, rgba(0,0,0,0.55) 40%, rgba(0,0,0,0.15) 60%, transparent 75%)",
              }}
            />

            {/* Top badges — pushed down when bars are shown */}
            <div className={cn("absolute left-4 z-10 flex items-center gap-2", showBars ? "top-9" : "top-4")}>
              {card.source === "hh" && (
                <span className="rounded-full bg-red-500/90 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  HH
                </span>
              )}
              {card.source === "hh" && card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white/20 p-1.5 backdrop-blur-sm transition-colors hover:bg-white/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5 text-white" />
                </a>
              )}
            </div>

            {/* Bottom content — raised on mobile to leave space for overlay buttons */}
            <div className="absolute inset-x-0 bottom-20 lg:bottom-0 z-10 flex flex-col gap-3 p-5 text-white">
              <div className="flex items-end gap-3">
                <Logo url={card.logoUrl} name={card.subtitle ?? card.title} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold leading-tight drop-shadow-md line-clamp-2">{card.title}</h2>
                  {card.subtitle && (
                    <p className="text-sm text-white/80 truncate">{card.subtitle}</p>
                  )}
                </div>
              </div>

              {card.location && (
                <div className="flex items-center gap-1.5 text-sm text-white/70">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>{card.location}</span>
                </div>
              )}

              {/* Salary + condition chips */}
              <div className="flex flex-wrap gap-1.5">
                {card.salary && (
                  <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-sm font-semibold backdrop-blur-sm">
                    {card.salary}
                  </span>
                )}
                {card.experience && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                    <Clock className="h-3 w-3" />{card.experience}
                  </span>
                )}
                {card.schedule && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                    <Calendar className="h-3 w-3" />{card.schedule}
                  </span>
                )}
                {card.employment && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm">
                    <BadgeCheck className="h-3 w-3" />{card.employment}
                  </span>
                )}
              </div>

              {card.description && (
                <p className="text-[13px] leading-relaxed text-white/75 line-clamp-3">
                  {card.description.replace(/<[^>]*>/g, "")}
                </p>
              )}

              {card.tags && card.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {card.tags.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                  {card.tags.length > 5 && (
                    <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/50">
                      +{card.tags.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VIEW 2: Details (full vacancy info) — like next Instagram story    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {showDetails && (
          <>
            {/* Subtle gradient background with city image if available */}
            <div className={cn("absolute inset-0 bg-gradient-to-b", gradient)} />
            {hasImage && (
              <img
                src={card.imageUrl}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/80" />

            {/* Scrollable content — extra bottom padding on mobile for overlay buttons */}
            <div className="absolute inset-0 z-10 flex flex-col overflow-y-auto pt-10 pb-24 lg:pb-5 px-5 text-white">
              {/* Title header */}
              <div className="flex items-center gap-3 mb-5 shrink-0">
                <Logo url={card.logoUrl} name={card.subtitle ?? card.title} />
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-bold leading-tight">{card.title}</h2>
                  {card.subtitle && (
                    <p className="text-sm text-white/70">{card.subtitle}</p>
                  )}
                </div>
              </div>

              {/* Info chips */}
              <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                {card.salary && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-green-500/20 px-3 py-1.5">
                    <DollarSign className="h-3.5 w-3.5 text-green-400" />
                    <span className="text-sm font-semibold text-green-300">{card.salary}</span>
                  </div>
                )}
                {card.location && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-blue-500/20 px-3 py-1.5">
                    <MapPin className="h-3.5 w-3.5 text-blue-400" />
                    <span className="text-sm font-medium text-blue-300">{card.location}</span>
                  </div>
                )}
                {card.subtitle && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-purple-500/20 px-3 py-1.5">
                    <Building2 className="h-3.5 w-3.5 text-purple-400" />
                    <span className="text-sm font-medium text-purple-300">{card.subtitle}</span>
                  </div>
                )}
                {card.experience && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3 py-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-sm font-medium text-amber-300">{card.experience}</span>
                  </div>
                )}
                {card.schedule && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-cyan-500/20 px-3 py-1.5">
                    <Calendar className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-sm font-medium text-cyan-300">{card.schedule}</span>
                  </div>
                )}
                {card.employment && (
                  <div className="flex items-center gap-1.5 rounded-xl bg-rose-500/20 px-3 py-1.5">
                    <BadgeCheck className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-sm font-medium text-rose-300">{card.employment}</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {card.tags && card.tags.length > 0 && (
                <div className="mb-4 shrink-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">Навыки</p>
                  <div className="flex flex-wrap gap-1.5">
                    {card.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Full description (HH returns HTML) */}
              {card.description && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/50 mb-2">Описание</p>
                  <div
                    className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed text-white/85 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1 [&_strong]:text-white [&_a]:text-blue-300 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: card.description }}
                  />
                </div>
              )}

              {/* HH link */}
              {card.source === "hh" && card.url && (
                <a
                  href={card.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 shrink-0 w-fit"
                  onClick={(e) => e.stopPropagation()}
                >
                  Открыть на HeadHunter <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Logo({ url, name }: { url?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const colorClass = stringToColor(name);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt={name}
        className="h-11 w-11 shrink-0 rounded-xl object-cover ring-2 ring-white/30"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white font-bold text-sm ring-2 ring-white/30",
        initials ? colorClass : "bg-white/20",
      )}
    >
      {initials || <Briefcase className="h-5 w-5 text-white" />}
    </div>
  );
}
