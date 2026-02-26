import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Loader2, Briefcase, MapPin, Globe, GraduationCap,
  Github, ExternalLink, ArrowLeft, MessageCircle, User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/fetchApi";

const API = import.meta.env.VITE_API_URL || "/api";

interface ProfileData {
  display_name: string;
  bio: string;
  avatar_url: string;
  role: string;
}

interface CandidateData {
  title: string | null;
  age: number | null;
  city: string | null;
  career_interests: string[];
  github_url: string | null;
  portfolio_url: string | null;
}

interface SkillItem { name: string; level: string | null; years: number | null }
interface WorkItem { company: string; role: string; start: string; end: string | null; description: string | null }
interface EduItem { institution: string; degree: string; field: string | null; year: number | null }

interface ResumeData {
  skills: SkillItem[];
  work_experience: WorkItem[];
  education: EduItem[];
}

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
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);

    const loadProfile = fetchApi(`${API}/profiles/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => {});

    const loadCandidate = fetchApi(`${API}/candidates/profile/${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setCandidate)
      .catch(() => {});

    const loadResumes = fetchApi(`${API}/candidates/resumes/${userId}/public`)
      .then((r) => (r.ok ? r.json() : []))
      .then((resumes: ResumeData[]) => {
        if (resumes.length > 0) setResume(resumes[0]);
      })
      .catch(() => {});

    Promise.all([loadProfile, loadCandidate, loadResumes])
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl p-4">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <User className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">Профиль не найден</p>
          <p className="mt-1 text-sm text-muted-foreground">Пользователь не существует или профиль не создан</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 flex items-center gap-1.5 mx-auto text-sm text-rose-500 hover:text-rose-600"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Назад
          </button>
        </div>
      </div>
    );
  }

  const displayName = profile.display_name || "Без имени";
  const gradient = getGradient(displayName);
  const skills = resume?.skills || [];
  const experience = resume?.work_experience || [];
  const education = resume?.education || [];
  const isCandidate = !!candidate;

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">

      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Назад
      </button>

      {/* ── Hero Card ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className={cn("h-36 bg-linear-to-r", gradient)} />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between">
            {/* Avatar */}
            <div className="relative -mt-12">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="h-24 w-24 rounded-full border-4 border-card object-cover ring-2 ring-border"
                />
              ) : (
                <div className={cn(
                  "h-24 w-24 rounded-full border-4 border-card bg-linear-to-br flex items-center justify-center text-2xl font-bold text-white ring-2 ring-border",
                  gradient,
                )}>
                  {initials(displayName)}
                </div>
              )}
            </div>

            {/* Action button — read only */}
            <button className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 transition-colors">
              <MessageCircle className="h-4 w-4" />
              Написать
            </button>
          </div>

          {/* Name + info — identical to Profile.tsx */}
          <div className="mt-3 space-y-1">
            <h1 className="text-2xl font-bold leading-tight">{displayName}</h1>
            {(candidate?.title || profile.role) && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                {candidate?.title || profile.role}
              </p>
            )}
            {candidate?.city && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {candidate.city}
                {candidate.age ? ` · ${candidate.age} лет` : ""}
              </p>
            )}
            {!candidate?.city && candidate?.age && (
              <p className="text-sm text-muted-foreground">{candidate.age} лет</p>
            )}
            <div className="flex gap-3 mt-2">
              {candidate?.github_url && (
                <a href={candidate.github_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-rose-500 transition-colors">
                  <Github className="h-4 w-4" /> GitHub
                </a>
              )}
              {candidate?.portfolio_url && (
                <a href={candidate.portfolio_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-rose-500 transition-colors">
                  <ExternalLink className="h-4 w-4" /> Портфолио
                </a>
              )}
            </div>
          </div>

          {/* Stats — same as Profile.tsx */}
          {isCandidate && (
            <div className="mt-5 grid grid-cols-3 divide-x rounded-xl border">
              {[
                { label: "Навыки", value: String(skills.length) },
                { label: "Опыт", value: String(experience.length) },
                { label: "Интересы", value: String(candidate?.career_interests?.length || 0) },
              ].map((s) => (
                <div key={s.label} className="flex flex-col items-center py-3">
                  <span className="text-lg font-bold text-rose-500">{s.value}</span>
                  <span className="text-xs text-muted-foreground">{s.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Content (same layout as Profile.tsx view mode, no edit controls) ── */}
      {isCandidate && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* Left column */}
          <div className="space-y-6">

            {/* About */}
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">О себе</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {profile.bio || "Пользователь ещё не добавил информацию о себе."}
              </p>
            </section>

            {/* Experience Timeline — same as Profile.tsx but no add/delete buttons */}
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                <Briefcase className="h-4 w-4 text-rose-500" />
                Опыт работы
              </h2>
              <div className="relative space-y-0">
                {experience.length > 0 && <div className="absolute bottom-2 left-[7px] top-2 w-px bg-rose-200" />}
                {experience.map((exp, i) => (
                  <div key={i} className={cn("relative pl-7", i < experience.length - 1 && "pb-7")}>
                    <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-rose-500 bg-card" />
                    <p className="text-sm font-semibold leading-tight">{exp.role}</p>
                    <p className="mt-0.5 text-sm text-rose-500">{exp.company}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{exp.start} — {exp.end || "н.в."}</p>
                    {exp.description && (
                      <p className="mt-2 text-sm leading-relaxed text-foreground/70">{exp.description}</p>
                    )}
                  </div>
                ))}
                {experience.length === 0 && <p className="text-sm text-muted-foreground">Нет опыта работы</p>}
              </div>
            </section>

            {/* Education — same as Profile.tsx but no add/delete buttons */}
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold">
                <GraduationCap className="h-4 w-4 text-rose-500" />
                Образование
              </h2>
              <div className="relative space-y-0">
                {education.length > 0 && <div className="absolute bottom-2 left-[7px] top-2 w-px bg-rose-200" />}
                {education.map((edu, i) => (
                  <div key={i} className="relative pl-7">
                    <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-rose-500 bg-card" />
                    <p className="text-sm font-semibold leading-tight">{edu.degree}{edu.field ? `, ${edu.field}` : ""}</p>
                    <p className="mt-0.5 text-sm text-rose-500">{edu.institution}</p>
                    {edu.year && <p className="mt-0.5 text-xs text-muted-foreground">{edu.year}</p>}
                  </div>
                ))}
                {education.length === 0 && <p className="text-sm text-muted-foreground">Нет образования</p>}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Skills — read-only tags (no SkillPicker) */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Навыки</h3>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <span key={s.name} className="rounded-lg bg-muted px-3 py-1 text-xs font-medium text-foreground/80">
                      {s.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Навыки не указаны</p>
              )}
            </section>

            {/* Career Interests — read-only tags (no toggle buttons) */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
                <Globe className="h-3.5 w-3.5 text-rose-500" />
                Карьерные интересы
              </h3>
              {candidate?.career_interests && candidate.career_interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {candidate.career_interests.map((interest) => (
                    <span key={interest} className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-medium text-rose-700">
                      {interest}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Интересы не указаны</p>
              )}
            </section>
          </div>
        </div>
      )}

      {/* Non-candidate — just bio */}
      {!isCandidate && (
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">О себе</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {profile.bio || "Пользователь ещё не добавил информацию о себе."}
          </p>
        </section>
      )}
    </div>
  );
}
