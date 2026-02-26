import { ArrowLeft, Heart, MapPin, ExternalLink, Briefcase, Building2, DollarSign, Clock, Calendar, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SwipeCard } from "@/features/swipe/types";

interface VacancyDetailProps {
  card: SwipeCard;
  onLike: () => void;
  onBack: () => void;
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

function stringToColor(str: string): string {
  const colors = [
    "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
    "bg-pink-500", "bg-teal-500", "bg-indigo-500", "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export function VacancyDetail({ card, onLike, onBack }: VacancyDetailProps) {
  const gradient = stringToGradient(card.subtitle ?? card.title);
  const isHH = card.source === "hh";

  return (
    <div className="flex h-full flex-col">
      {/* Hero section with background */}
      <div className="relative shrink-0 overflow-hidden">
        {card.imageUrl ? (
          <img
            src={card.imageUrl}
            alt=""
            className="h-56 w-full object-cover lg:h-64"
          />
        ) : (
          <div className={cn("h-56 w-full bg-gradient-to-br lg:h-64", gradient)} />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute left-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* HH badge */}
        {isHH && (
          <div className="absolute right-4 top-4 flex items-center gap-2">
            <span className="rounded-full bg-red-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              HH
            </span>
          </div>
        )}

        {/* Title on hero */}
        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <div className="flex items-end gap-3">
            <LogoDetail url={card.logoUrl} name={card.subtitle ?? card.title} />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold leading-tight drop-shadow-md">{card.title}</h1>
              {card.subtitle && (
                <p className="mt-0.5 text-sm text-white/80">{card.subtitle}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-5 p-5">

          {/* Info cards row */}
          <div className="flex flex-wrap gap-3">
            {card.salary && (
              <div className="flex items-center gap-2 rounded-xl bg-green-500/10 px-4 py-2.5">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-700 dark:text-green-400">{card.salary}</span>
              </div>
            )}
            {card.location && (
              <div className="flex items-center gap-2 rounded-xl bg-blue-500/10 px-4 py-2.5">
                <MapPin className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{card.location}</span>
              </div>
            )}
            {card.subtitle && (
              <div className="flex items-center gap-2 rounded-xl bg-purple-500/10 px-4 py-2.5">
                <Building2 className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700 dark:text-purple-400">{card.subtitle}</span>
              </div>
            )}
            {card.experience && (
              <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2.5">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700 dark:text-amber-400">{card.experience}</span>
              </div>
            )}
            {card.schedule && (
              <div className="flex items-center gap-2 rounded-xl bg-cyan-500/10 px-4 py-2.5">
                <Calendar className="h-4 w-4 text-cyan-600" />
                <span className="text-sm font-medium text-cyan-700 dark:text-cyan-400">{card.schedule}</span>
              </div>
            )}
            {card.employment && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 px-4 py-2.5">
                <BadgeCheck className="h-4 w-4 text-rose-600" />
                <span className="text-sm font-medium text-rose-700 dark:text-rose-400">{card.employment}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {card.tags && card.tags.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Навыки</h3>
              <div className="flex flex-wrap gap-2">
                {card.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Full description (HH returns HTML) */}
          {card.description && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">Описание</h3>
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed text-foreground/85 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-1"
                dangerouslySetInnerHTML={{ __html: card.description }}
              />
            </div>
          )}

          {/* HH link */}
          {isHH && card.url && (
            <a
              href={card.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950"
            >
              Открыть на HeadHunter <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="shrink-0 border-t bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-5 py-4">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
          <Button
            className="flex-1 gap-2 bg-green-500 text-white hover:bg-green-600"
            onClick={onLike}
          >
            <Heart className="h-4 w-4" />
            Откликнуться
          </Button>
        </div>
      </div>
    </div>
  );
}

function LogoDetail({ url, name }: { url?: string; name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  const colorClass = stringToColor(name);

  if (url) {
    return (
      <img
        src={url}
        alt={name}
        className="h-14 w-14 shrink-0 rounded-xl object-cover ring-2 ring-white/30"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-white font-bold text-lg ring-2 ring-white/30",
        initials ? colorClass : "bg-white/20",
      )}
    >
      {initials || <Briefcase className="h-6 w-6 text-white" />}
    </div>
  );
}
