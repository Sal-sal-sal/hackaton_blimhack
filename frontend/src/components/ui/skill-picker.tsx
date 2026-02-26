import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { SKILL_TREE, ALL_SKILLS } from "@/data/skills";

interface SkillPickerProps {
  /** Currently selected skill names */
  value: string[];
  /** Called when skills change (add or remove) */
  onChange: (skills: string[]) => void;
  /** Min skills required — used for validation hint (default 0) */
  min?: number;
  /** Max skills allowed (default 50) */
  max?: number;
  /** Disable editing */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Optional className for outer wrapper */
  className?: string;
}

interface FilteredItem {
  type: "header" | "skill";
  label: string;
  isCustom?: boolean;
}

export function SkillPicker({
  value,
  onChange,
  min = 0,
  max = 50,
  disabled = false,
  placeholder = "Начните вводить навык...",
  className,
}: SkillPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [hlIndex, setHlIndex] = useState(0);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Filtered suggestions
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const items: FilteredItem[] = [];
    const selectedSet = new Set(value.map((v) => v.toLowerCase()));

    for (const cat of SKILL_TREE) {
      const matches = cat.skills.filter(
        (s) => s.toLowerCase().includes(q) && !selectedSet.has(s.toLowerCase()),
      );
      if (matches.length > 0) {
        items.push({ type: "header", label: cat.label });
        for (const name of matches) {
          items.push({ type: "skill", label: name });
        }
      }
    }

    // Custom skill option if no exact match
    const trimmed = query.trim();
    const exactExists =
      ALL_SKILLS.has(trimmed) ||
      [...ALL_SKILLS].some((s) => s.toLowerCase() === q) ||
      selectedSet.has(q);

    if (trimmed.length >= 2 && !exactExists) {
      items.push({ type: "skill", label: trimmed, isCustom: true });
    }

    return items;
  }, [query, value]);

  // Selectable items (skills only, not headers) for keyboard navigation
  const selectableItems = useMemo(
    () => filtered.filter((i) => i.type === "skill"),
    [filtered],
  );

  // Clamp highlight index when list changes
  useEffect(() => {
    if (hlIndex >= selectableItems.length) {
      setHlIndex(Math.max(0, selectableItems.length - 1));
    }
  }, [selectableItems.length, hlIndex]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (!open || selectableItems.length === 0) return;
    const highlighted = selectableItems[hlIndex];
    if (!highlighted) return;
    const idx = filtered.indexOf(highlighted);
    const el = dropdownRef.current?.children[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [hlIndex, open, selectableItems, filtered]);

  const addSkill = useCallback(
    (name: string) => {
      if (value.length >= max) return;
      if (!value.includes(name)) onChange([...value, name]);
      setQuery("");
      setOpen(false);
      setHlIndex(0);
      inputRef.current?.focus();
    },
    [value, max, onChange],
  );

  const removeSkill = useCallback(
    (name: string) => {
      onChange(value.filter((s) => s !== name));
    },
    [value, onChange],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || selectableItems.length === 0) {
      if (e.key === "Enter") e.preventDefault();
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHlIndex((i) => (i + 1) % selectableItems.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHlIndex((i) => (i - 1 + selectableItems.length) % selectableItems.length);
        break;
      case "Enter":
        e.preventDefault();
        if (selectableItems[hlIndex]) addSkill(selectableItems[hlIndex].label);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
    }
  }

  const atMax = value.length >= max;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {value.map((name) => {
            const isCustom = !ALL_SKILLS.has(name);
            return (
              <span
                key={name}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  isCustom
                    ? "bg-muted text-foreground/70 border border-dashed border-muted-foreground/30"
                    : "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800",
                )}
              >
                {name}
                {isCustom && (
                  <span className="text-[10px] opacity-50 ml-0.5">свой</span>
                )}
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => removeSkill(name)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={query}
        disabled={disabled || atMax}
        placeholder={atMax ? `Максимум ${max} навыков` : placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHlIndex(0);
        }}
        onFocus={() => {
          if (query.trim()) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
      />

      {/* Dropdown */}
      {open && filtered.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border bg-card shadow-lg"
        >
          {filtered.map((item, i) => {
            if (item.type === "header") {
              return (
                <div
                  key={`h-${item.label}`}
                  className="px-3 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground select-none"
                >
                  {item.label}
                </div>
              );
            }

            const selectIdx = selectableItems.indexOf(item);
            const isHighlighted = selectIdx === hlIndex;

            return (
              <button
                key={item.isCustom ? `custom-${item.label}` : item.label}
                type="button"
                className={cn(
                  "w-full text-left px-3 py-1.5 text-xs transition-colors",
                  isHighlighted
                    ? "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                    : "hover:bg-muted/50",
                )}
                onMouseEnter={() => setHlIndex(selectIdx)}
                onClick={() => addSkill(item.label)}
              >
                {item.isCustom ? (
                  <span>
                    + Добавить &quot;{item.label}&quot;{" "}
                    <span className="text-muted-foreground">(свой навык)</span>
                  </span>
                ) : (
                  item.label
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Counter */}
      <div
        className={cn(
          "mt-1 text-[10px]",
          value.length < min ? "text-orange-500" : "text-muted-foreground",
        )}
      >
        {value.length} / {max} навыков
        {min > 0 && value.length < min && ` (мин. ${min})`}
      </div>
    </div>
  );
}
