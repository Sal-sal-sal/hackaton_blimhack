import { useState } from "react";
import { Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SwipeCard as SwipeCardType } from "@/features/swipe/types";

interface SwipeCardProps {
  card: SwipeCardType;
  isTop: boolean;
  stackIndex: number; // 0 = top, 1 = second, 2 = third
  style?: React.CSSProperties;
  direction?: "left" | "right" | null;
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: () => void;
}

/** Generate a deterministic color from a string (company name, etc.) */
function stringToColor(str: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const SCALE_MAP = [1, 0.95, 0.9];
const TRANSLATE_Y_MAP = [0, 14, 28];

export function SwipeCard({
  card,
  isTop,
  stackIndex,
  style,
  direction,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}: SwipeCardProps) {
  const scale = SCALE_MAP[stackIndex] ?? 0.85;
  const translateY = TRANSLATE_Y_MAP[stackIndex] ?? 42;

  const backgroundStyle: React.CSSProperties = isTop
    ? { ...style, zIndex: 10 - stackIndex }
    : {
        transform: `scale(${scale}) translateY(${translateY}px)`,
        transition: "transform 0.3s ease",
        zIndex: 10 - stackIndex,
      };

  return (
    <div
      className={cn(
        "absolute inset-0 rounded-2xl border bg-card shadow-lg overflow-hidden select-none",
        isTop ? "cursor-grab active:cursor-grabbing" : "pointer-events-none",
      )}
      style={backgroundStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* LIKE overlay */}
      {isTop && direction === "right" && (
        <div className="absolute top-8 left-6 z-20 rotate-[-20deg] border-4 border-green-400 rounded-lg px-4 py-2 pointer-events-none">
          <span className="text-2xl font-black uppercase text-green-400">LIKE</span>
        </div>
      )}

      {/* NOPE overlay */}
      {isTop && direction === "left" && (
        <div className="absolute top-8 right-6 z-20 rotate-[20deg] border-4 border-red-400 rounded-lg px-4 py-2 pointer-events-none">
          <span className="text-2xl font-black uppercase text-red-400">NOPE</span>
        </div>
      )}

      {/* Card body */}
      <div className="flex flex-col h-full p-6">
        {/* Header: logo + title */}
        <div className="flex items-start gap-3 mb-4">
          <Logo url={card.logoUrl} name={card.subtitle ?? card.title} />
          <div className="min-w-0">
            <h2 className="text-xl font-bold leading-tight truncate">{card.title}</h2>
            {card.subtitle && (
              <p className="text-sm text-muted-foreground truncate">{card.subtitle}</p>
            )}
          </div>
        </div>

        {/* Salary */}
        {card.salary && (
          <div className="mb-3 inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary w-fit">
            {card.salary}
          </div>
        )}

        {/* Description */}
        {card.description && (
          <p className="text-sm text-muted-foreground flex-1 overflow-hidden line-clamp-5 mb-4">
            {card.description}
          </p>
        )}

        {/* Tech tags */}
        {card.tags && card.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-auto pt-2">
            {card.tags.slice(0, 6).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
            {card.tags.length > 6 && (
              <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                +{card.tags.length - 6}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Logo with image fallback — shows initials if image fails or is absent */
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
        className="w-12 h-12 rounded-xl object-cover shrink-0"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-white font-bold text-lg",
        initials ? colorClass : "bg-primary/10",
      )}
    >
      {initials || <Briefcase className="h-6 w-6 text-primary" />}
    </div>
  );
}
