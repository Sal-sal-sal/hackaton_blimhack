import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { Camera, Pencil, Check, X, Loader2, Link as LinkIcon, Briefcase } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id?: number;
  user_id?: number;
  display_name: string;
  bio: string;
  avatar_url: string;
  role: string;
  organization_id?: number | null;
  is_recruiter?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "from-rose-400 to-orange-400",
  "from-purple-400 to-pink-400",
  "from-blue-400 to-cyan-400",
  "from-green-400 to-emerald-400",
  "from-amber-400 to-yellow-300",
];

function getGradient(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function initials(name: string) {
  return (
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?"
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const token = useAppSelector((s) => s.auth.token);
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  const [profile, setProfile] = useState<ProfileData>({ display_name: "", bio: "", avatar_url: "", role: "" });
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load
  useEffect(() => {
    setLoading(true);
    fetch("/api/profiles/me", { headers: authHeaders })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ProfileData | null) => {
        if (data) { setProfile(data); setDraft(data); }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save
  async function saveProfile() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          display_name: draft.display_name || null,
          bio: draft.bio || null,
          avatar_url: draft.avatar_url || null,
          role: draft.role || null,
        }),
      });
      if (!res.ok) throw new Error("Ошибка сохранения");
      const saved: ProfileData = await res.json();
      setProfile(saved);
      setDraft(saved);
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setDraft(profile);
    setEditing(false);
    setError(null);
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, avatar_url: reader.result as string }));
    reader.readAsDataURL(file);
  }

  const displayName = profile.display_name || "Без имени";
  const gradient = getGradient(displayName);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-10">

      {/* ── Cover + Avatar card ─────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        {/* Cover */}
        <div className={cn("h-32 bg-gradient-to-r", gradient)} />

        <div className="px-6 pb-5">
          <div className="flex items-end justify-between">
            {/* Avatar */}
            <div className="relative -mt-10">
              {draft.avatar_url ? (
                <img
                  src={draft.avatar_url}
                  alt="avatar"
                  className="h-20 w-20 rounded-full border-4 border-card object-cover"
                />
              ) : (
                <div className={cn(
                  "h-20 w-20 rounded-full border-4 border-card bg-gradient-to-br flex items-center justify-center text-2xl font-bold text-white",
                  gradient,
                )}>
                  {initials(displayName)}
                </div>
              )}

              {editing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow hover:opacity-90"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-1.5 rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Редактировать
                </button>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Отмена
                  </button>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Сохранить
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Name / bio (view mode) */}
          {!editing && (
            <div className="mt-3">
              <h1 className="text-2xl font-bold leading-tight">{displayName}</h1>
              {profile.role && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Briefcase className="h-3.5 w-3.5" />
                  {profile.role}
                </p>
              )}
              {profile.bio && (
                <p className="mt-3 text-sm leading-relaxed text-foreground/80 whitespace-pre-wrap">
                  {profile.bio}
                </p>
              )}
              {!profile.bio && !profile.role && (
                <p className="mt-2 text-sm italic text-muted-foreground/60">
                  Профиль ещё не заполнен. Нажмите «Редактировать», чтобы добавить информацию.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Edit form ────────────────────────────────────────────────── */}
      {editing && (
        <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Редактировать профиль</h2>

          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
              {error}
            </div>
          )}

          <Field label="Отображаемое имя">
            <input
              type="text"
              value={draft.display_name}
              onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
              placeholder="Ваше имя"
              maxLength={100}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Field>

          <Field label="Должность / роль" icon={<Briefcase className="h-3 w-3" />}>
            <input
              type="text"
              value={draft.role}
              onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))}
              placeholder="Например: Frontend Developer"
              maxLength={100}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
          </Field>

          <Field label="О себе">
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              placeholder="Расскажите о себе…"
              rows={4}
              maxLength={500}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-right text-xs text-muted-foreground">{draft.bio.length}/500</p>
          </Field>

          <Field label="Ссылка на аватар" icon={<LinkIcon className="h-3 w-3" />}>
            <input
              type="url"
              value={draft.avatar_url.startsWith("data:") ? "" : draft.avatar_url}
              onChange={(e) => setDraft((d) => ({ ...d, avatar_url: e.target.value }))}
              placeholder="https://example.com/photo.jpg"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground">
              Или нажмите иконку камеры выше, чтобы загрузить файл с устройства
            </p>
          </Field>
        </div>
      )}

      {/* ── Stats ────────────────────────────────────────────────────── */}
      {!editing && (
        <div className="grid grid-cols-3 divide-x overflow-hidden rounded-2xl border bg-card shadow-sm">
          {[
            { label: "Публикации", value: "0" },
            { label: "Подписчики", value: "0" },
            { label: "Подписки", value: "0" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-5">
              <span className="text-xl font-bold">{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Success toast ─────────────────────────────────────────── */}
      <div className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300",
        success ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )}>
        ✓ Профиль сохранён
      </div>
    </div>
  );
}
