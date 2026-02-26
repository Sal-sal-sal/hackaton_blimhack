import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera, Pencil, Check, X, Loader2, Link as LinkIcon, Briefcase,
  MapPin, MessageCircle, Bookmark, Globe, GraduationCap, Plus, Trash2,
  Sparkles, Github, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppSelector } from "@/store";
import { fetchApi } from "@/lib/fetchApi";
import { SkillPicker } from "@/components/ui/skill-picker";

const API = import.meta.env.VITE_API_URL || "/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProfileData {
  id?: number;
  user_id?: number;
  display_name: string;
  bio: string;
  avatar_url: string;
  role: string;
}

interface CandidateProfileData {
  id?: number;
  user_id?: number;
  title: string | null;
  age: number | null;
  city: string | null;
  career_interests: string[];
  github_url: string | null;
  portfolio_url: string | null;
}

interface SkillItem {
  name: string;
  level: string | null;
  years: number | null;
}

interface WorkExperienceItem {
  company: string;
  role: string;
  start: string;
  end: string | null;
  description: string | null;
}

interface EducationItem {
  institution: string;
  degree: string;
  field: string | null;
  year: number | null;
}

interface ResumeData {
  id: number;
  title: string;
  skills: SkillItem[];
  work_experience: WorkExperienceItem[];
  education: EducationItem[];
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
  return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
}

const CAREER_INTEREST_OPTIONS = [
  "Frontend", "Backend", "Fullstack", "Data Science", "ML/AI",
  "DevOps", "Mobile", "QA", "UI/UX", "Product Management",
  "Cybersecurity", "Blockchain", "Game Dev", "Embedded",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const navigate = useNavigate();
  const authRole = useAppSelector((s) => s.auth.user?.role);

  const [profile, setProfile] = useState<ProfileData>({ display_name: "", bio: "", avatar_url: "", role: "" });
  const [draft, setDraft] = useState<ProfileData>(profile);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileData | null>(null);
  const [candidateDraft, setCandidateDraft] = useState<CandidateProfileData | null>(null);
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Experience add
  const [showExpForm, setShowExpForm] = useState(false);
  const [newExp, setNewExp] = useState<WorkExperienceItem>({ company: "", role: "", start: "", end: null, description: null });
  // Education add
  const [showEduForm, setShowEduForm] = useState(false);
  const [newEdu, setNewEdu] = useState<EducationItem>({ institution: "", degree: "", field: null, year: null });
  // Career interest custom
  const [customInterest, setCustomInterest] = useState("");

  const isCandidate = authRole === "candidate";

  // Load data
  useEffect(() => {
    setLoading(true);
    const loads: Promise<void>[] = [];

    loads.push(
      fetchApi(`${API}/profiles/me`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (data) { setProfile(data); setDraft(data); } })
        .catch(() => {})
    );

    if (isCandidate) {
      loads.push(
        fetchApi(`${API}/candidates/profile`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (data) { setCandidateProfile(data); setCandidateDraft(data); } })
          .catch(() => {})
      );
      loads.push(
        fetchApi(`${API}/candidates/resumes`)
          .then((r) => (r.ok ? r.json() : []))
          .then(setResumes)
          .catch(() => {})
      );
    }

    Promise.all(loads).finally(() => setLoading(false));
  }, [isCandidate]);

  // Save all
  async function saveAll() {
    setSaving(true);
    setError(null);
    try {
      // Save profile
      const profileRes = await fetchApi(`${API}/profiles/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: draft.display_name || null,
          bio: draft.bio || null,
          avatar_url: draft.avatar_url || null,
          role: draft.role || null,
        }),
      });
      if (!profileRes.ok) throw new Error("Ошибка сохранения профиля");
      const saved = await profileRes.json();
      setProfile(saved);
      setDraft(saved);

      // Save candidate profile
      if (isCandidate && candidateDraft) {
        const method = candidateProfile?.id ? "PATCH" : "POST";
        const cpRes = await fetchApi(`${API}/candidates/profile`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: candidateDraft.title,
            age: candidateDraft.age,
            city: candidateDraft.city,
            career_interests: candidateDraft.career_interests,
            github_url: candidateDraft.github_url,
            portfolio_url: candidateDraft.portfolio_url,
          }),
        });
        if (cpRes.ok) {
          const cpData = await cpRes.json();
          setCandidateProfile(cpData);
          setCandidateDraft(cpData);
        }
      }

      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  // Resume operations
  async function saveResume(resume: ResumeData) {
    const res = await fetchApi(`${API}/candidates/resumes/${resume.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        skills: resume.skills,
        work_experience: resume.work_experience,
        education: resume.education,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setResumes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    }
  }

  async function createResumeIfNeeded(): Promise<ResumeData> {
    if (resumes.length > 0) return resumes[0];
    // Create candidate profile first if needed
    if (!candidateProfile?.id) {
      const cpRes = await fetchApi(`${API}/candidates/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: candidateDraft?.title || "Мой профиль" }),
      });
      if (cpRes.ok) {
        const cpData = await cpRes.json();
        setCandidateProfile(cpData);
        setCandidateDraft(cpData);
      }
    }
    const res = await fetchApi(`${API}/candidates/resumes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Основное резюме", skills: [], work_experience: [], education: [] }),
    });
    if (!res.ok) throw new Error("Не удалось создать резюме");
    const newResume = await res.json();
    setResumes([newResume]);
    return newResume;
  }

  // Update skills via SkillPicker
  async function handleSkillsChange(names: string[]) {
    const resume = await createResumeIfNeeded();
    const updated = {
      ...resume,
      skills: names.map((name) => {
        const existing = resume.skills.find((s: SkillItem) => s.name === name);
        return existing || { name, level: null, years: null };
      }),
    };
    await saveResume(updated);
  }

  // Add experience
  async function addExperience() {
    if (!newExp.company || !newExp.role) return;
    const resume = await createResumeIfNeeded();
    const updated = { ...resume, work_experience: [...resume.work_experience, newExp] };
    await saveResume(updated);
    setNewExp({ company: "", role: "", start: "", end: null, description: null });
    setShowExpForm(false);
  }

  async function removeExperience(idx: number) {
    if (resumes.length === 0) return;
    const resume = resumes[0];
    const updated = { ...resume, work_experience: resume.work_experience.filter((_, i) => i !== idx) };
    await saveResume(updated);
  }

  // Add education
  async function addEducation() {
    if (!newEdu.institution || !newEdu.degree) return;
    const resume = await createResumeIfNeeded();
    const updated = { ...resume, education: [...resume.education, newEdu] };
    await saveResume(updated);
    setNewEdu({ institution: "", degree: "", field: null, year: null });
    setShowEduForm(false);
  }

  async function removeEducation(idx: number) {
    if (resumes.length === 0) return;
    const resume = resumes[0];
    const updated = { ...resume, education: resume.education.filter((_, i) => i !== idx) };
    await saveResume(updated);
  }

  // Career interests
  function toggleInterest(interest: string) {
    if (!candidateDraft) return;
    const current = candidateDraft.career_interests || [];
    const updated = current.includes(interest)
      ? current.filter((i) => i !== interest)
      : [...current, interest];
    setCandidateDraft({ ...candidateDraft, career_interests: updated });
  }

  function addCustomInterest() {
    const val = customInterest.trim();
    if (!val || !candidateDraft) return;
    if (!candidateDraft.career_interests.includes(val)) {
      setCandidateDraft({ ...candidateDraft, career_interests: [...candidateDraft.career_interests, val] });
    }
    setCustomInterest("");
  }

  function cancelEdit() {
    setDraft(profile);
    setCandidateDraft(candidateProfile);
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
  const resume = resumes[0] || null;
  const skills = resume?.skills || [];
  const experience = resume?.work_experience || [];
  const education = resume?.education || [];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">

      {/* ── Hero Card ──────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className={cn("h-36 bg-linear-to-r", gradient)} />

        <div className="px-6 pb-6">
          <div className="flex items-end justify-between">
            <div className="relative -mt-12">
              {(editing ? draft.avatar_url : profile.avatar_url) ? (
                <img
                  src={editing ? draft.avatar_url : profile.avatar_url}
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
              {editing && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0.5 right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-rose-500 text-white shadow hover:bg-rose-600"
                  >
                    <Camera className="h-3.5 w-3.5" />
                  </button>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {!editing ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Редактировать
                  </button>
                  {isCandidate && (
                    <button
                      onClick={() => navigate("/career-ai?auto=1")}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-rose-600 transition-colors"
                    >
                      <Sparkles className="h-4 w-4" />
                      Анализ профиля
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={cancelEdit}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                  >
                    <X className="h-3.5 w-3.5" />
                    Отмена
                  </button>
                  <button
                    onClick={saveAll}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Сохранить
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <h1 className="text-2xl font-bold leading-tight">{displayName}</h1>
            {(candidateProfile?.title || profile.role) && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="h-3.5 w-3.5" />
                {candidateProfile?.title || profile.role}
              </p>
            )}
            {candidateProfile?.city && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {candidateProfile.city}
              </p>
            )}
            <div className="flex gap-3 mt-2">
              {candidateProfile?.github_url && (
                <a href={candidateProfile.github_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-rose-500 transition-colors">
                  <Github className="h-4 w-4" /> GitHub
                </a>
              )}
              {candidateProfile?.portfolio_url && (
                <a href={candidateProfile.portfolio_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-rose-500 transition-colors">
                  <ExternalLink className="h-4 w-4" /> Портфолио
                </a>
              )}
            </div>
          </div>

          {isCandidate && (
            <div className="mt-5 grid grid-cols-3 divide-x rounded-xl border">
              {[
                { label: "Навыки", value: String(skills.length) },
                { label: "Опыт", value: String(experience.length) },
                { label: "Интересы", value: String(candidateProfile?.career_interests?.length || 0) },
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

      {/* ── Edit form ───────────────────────────────────────────────── */}
      {editing && (
        <div className="space-y-5 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="font-semibold">Редактировать профиль</h2>
          {error && <div className="rounded-lg bg-destructive/10 px-4 py-2.5 text-sm text-destructive">{error}</div>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Имя</label>
              <input
                type="text" value={draft.display_name}
                onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Должность</label>
              <input
                type="text" value={candidateDraft?.title || draft.role}
                onChange={(e) => {
                  if (candidateDraft) setCandidateDraft({ ...candidateDraft, title: e.target.value });
                  else setDraft((d) => ({ ...d, role: e.target.value }));
                }}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
            {isCandidate && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Город</label>
                  <input
                    type="text" value={candidateDraft?.city || ""}
                    onChange={(e) => candidateDraft && setCandidateDraft({ ...candidateDraft, city: e.target.value })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Возраст</label>
                  <input
                    type="number" value={candidateDraft?.age || ""}
                    onChange={(e) => candidateDraft && setCandidateDraft({ ...candidateDraft, age: e.target.value ? Number(e.target.value) : null })}
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">GitHub URL</label>
                  <input
                    type="url" value={candidateDraft?.github_url || ""}
                    onChange={(e) => candidateDraft && setCandidateDraft({ ...candidateDraft, github_url: e.target.value || null })}
                    placeholder="https://github.com/username"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Портфолио URL</label>
                  <input
                    type="url" value={candidateDraft?.portfolio_url || ""}
                    onChange={(e) => candidateDraft && setCandidateDraft({ ...candidateDraft, portfolio_url: e.target.value || null })}
                    placeholder="https://myportfolio.com"
                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
                  />
                </div>
              </>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">О себе</label>
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              rows={4} maxLength={500}
              className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>
        </div>
      )}

      {/* ── Content sections ──────────────────────────────────────── */}
      {!editing && isCandidate && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">

          {/* Left column */}
          <div className="space-y-6">

            {/* About */}
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="mb-3 text-base font-semibold">О себе</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                {profile.bio || "Расскажите о себе — добавьте описание в редакторе профиля."}
              </p>
            </section>

            {/* Experience Timeline */}
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Briefcase className="h-4 w-4 text-rose-500" />
                  Опыт работы
                </h2>
                <button onClick={() => setShowExpForm(true)} className="flex items-center gap-1 text-sm text-rose-500 hover:text-rose-600">
                  <Plus className="h-4 w-4" /> Добавить
                </button>
              </div>

              {showExpForm && (
                <div className="mb-5 space-y-3 rounded-xl border bg-muted/30 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input placeholder="Компания" value={newExp.company} onChange={(e) => setNewExp({ ...newExp, company: e.target.value })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                    <input placeholder="Должность" value={newExp.role} onChange={(e) => setNewExp({ ...newExp, role: e.target.value })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                    <input placeholder="Начало (2020-01)" value={newExp.start} onChange={(e) => setNewExp({ ...newExp, start: e.target.value })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                    <input placeholder="Конец (2023-01 или пусто)" value={newExp.end || ""} onChange={(e) => setNewExp({ ...newExp, end: e.target.value || null })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <textarea placeholder="Описание" value={newExp.description || ""} onChange={(e) => setNewExp({ ...newExp, description: e.target.value || null })}
                    rows={2} className="w-full resize-none rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  <div className="flex gap-2">
                    <button onClick={addExperience} className="rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-600">Добавить</button>
                    <button onClick={() => setShowExpForm(false)} className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-muted">Отмена</button>
                  </div>
                </div>
              )}

              <div className="relative space-y-0">
                {experience.length > 0 && <div className="absolute bottom-2 left-[7px] top-2 w-px bg-rose-200" />}
                {experience.map((exp, i) => (
                  <div key={i} className={cn("relative pl-7 group", i < experience.length - 1 && "pb-7")}>
                    <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-rose-500 bg-card" />
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold leading-tight">{exp.role}</p>
                          <p className="mt-0.5 text-sm text-rose-500">{exp.company}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{exp.start} — {exp.end || "н.в."}</p>
                        </div>
                        <button onClick={() => removeExperience(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      {exp.description && <p className="mt-2 text-sm leading-relaxed text-foreground/70">{exp.description}</p>}
                    </div>
                  </div>
                ))}
                {experience.length === 0 && <p className="text-sm text-muted-foreground">Нет опыта работы</p>}
              </div>
            </section>

            {/* Education */}
            <section className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <GraduationCap className="h-4 w-4 text-rose-500" />
                  Образование
                </h2>
                <button onClick={() => setShowEduForm(true)} className="flex items-center gap-1 text-sm text-rose-500 hover:text-rose-600">
                  <Plus className="h-4 w-4" /> Добавить
                </button>
              </div>

              {showEduForm && (
                <div className="mb-5 space-y-3 rounded-xl border bg-muted/30 p-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input placeholder="Учебное заведение" value={newEdu.institution} onChange={(e) => setNewEdu({ ...newEdu, institution: e.target.value })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                    <input placeholder="Степень (BS, MS, PhD)" value={newEdu.degree} onChange={(e) => setNewEdu({ ...newEdu, degree: e.target.value })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                    <input placeholder="Специальность" value={newEdu.field || ""} onChange={(e) => setNewEdu({ ...newEdu, field: e.target.value || null })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                    <input placeholder="Год окончания" type="number" value={newEdu.year || ""} onChange={(e) => setNewEdu({ ...newEdu, year: e.target.value ? Number(e.target.value) : null })}
                      className="rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-500" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addEducation} className="rounded-lg bg-rose-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-rose-600">Добавить</button>
                    <button onClick={() => setShowEduForm(false)} className="rounded-lg border px-4 py-1.5 text-sm font-medium hover:bg-muted">Отмена</button>
                  </div>
                </div>
              )}

              <div className="relative space-y-0">
                {education.length > 0 && <div className="absolute bottom-2 left-[7px] top-2 w-px bg-rose-200" />}
                {education.map((edu, i) => (
                  <div key={i} className="relative pl-7 group">
                    <div className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-rose-500 bg-card" />
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold leading-tight">{edu.degree}{edu.field ? `, ${edu.field}` : ""}</p>
                        <p className="mt-0.5 text-sm text-rose-500">{edu.institution}</p>
                        {edu.year && <p className="mt-0.5 text-xs text-muted-foreground">{edu.year}</p>}
                      </div>
                      <button onClick={() => removeEducation(i)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {education.length === 0 && <p className="text-sm text-muted-foreground">Нет образования</p>}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Skills */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Навыки</h3>
              <SkillPicker
                value={skills.map((s) => s.name)}
                onChange={handleSkillsChange}
                min={3}
                max={50}
              />
            </section>

            {/* Career Interests */}
            <section className="rounded-2xl border bg-card p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold">Карьерные интересы</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {CAREER_INTEREST_OPTIONS.map((interest) => {
                  const selected = candidateProfile?.career_interests?.includes(interest);
                  return (
                    <button
                      key={interest}
                      onClick={async () => {
                        if (!candidateProfile?.id) return;
                        const current = candidateProfile.career_interests || [];
                        const updated = selected ? current.filter((i) => i !== interest) : [...current, interest];
                        const res = await fetchApi(`${API}/candidates/profile`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ career_interests: updated }),
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setCandidateProfile(data);
                          setCandidateDraft(data);
                        }
                      }}
                      className={cn(
                        "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
                        selected ? "bg-rose-500 text-white" : "bg-muted text-foreground/70 hover:bg-muted/80",
                      )}
                    >
                      {interest}
                    </button>
                  );
                })}
              </div>
              <div className="flex gap-1.5">
                <input
                  placeholder="Свой вариант"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomInterest(); } }}
                  className="flex-1 rounded-lg border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-rose-500"
                />
                <button onClick={addCustomInterest} className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-600">+</button>
              </div>
              {/* Show custom interests not in options */}
              {candidateProfile?.career_interests?.filter((i) => !CAREER_INTEREST_OPTIONS.includes(i)).map((i) => (
                <span key={i} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-rose-500 px-3 py-1 text-xs font-medium text-white mr-1">
                  {i}
                </span>
              ))}
            </section>

            {/* Analyze CTA */}
            <button
              onClick={() => navigate("/career-ai?auto=1")}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-rose-500 to-orange-400 px-5 py-4 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
            >
              <Sparkles className="h-5 w-5" />
              Анализ профиля с AI
            </button>
          </div>
        </div>
      )}

      {/* Employer view: minimal */}
      {!editing && !isCandidate && (
        <section className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="mb-3 text-base font-semibold">О себе</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
            {profile.bio || "Расскажите о себе — добавьте описание в редакторе профиля."}
          </p>
        </section>
      )}

      {/* Success toast */}
      <div className={cn(
        "pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-all duration-300",
        success ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
      )}>
        Профиль сохранён
      </div>
    </div>
  );
}
