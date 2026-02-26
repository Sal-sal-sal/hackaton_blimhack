import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Loader2, BarChart3, Users, Target, AlertTriangle,
  CheckCircle2, XCircle, ChevronDown, ChevronUp, UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/fetchApi";

const API = import.meta.env.VITE_API_URL || "/api";

interface ScoredCandidate {
  candidate_id: number;
  name: string;
  score: number;
  reasoning: string;
  matching_skills: string[];
  missing_skills: string[];
  hard_skills_score: number;
  experience_score: number;
  soft_skills_score: number;
  skill_gap_analysis: string;
  recommendation: string;
}

interface AnalysisResult {
  vacancy_title: string;
  scored_candidates: ScoredCandidate[];
}

function ScoreBar({ label, value, max = 100 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color =
    pct >= 70 ? "bg-emerald-500" :
    pct >= 40 ? "bg-amber-500" :
    "bg-rose-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function OverallChart({ candidates }: { candidates: ScoredCandidate[] }) {
  if (candidates.length === 0) return null;
  const maxScore = Math.max(...candidates.map((c) => c.score), 1);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold">
        <BarChart3 className="h-5 w-5 text-rose-500" />
        Рейтинг кандидатов
      </h3>
      <div className="space-y-3">
        {candidates.map((c, i) => (
          <div key={c.candidate_id} className="flex items-center gap-3">
            <span className="w-6 text-right text-sm font-bold text-muted-foreground">
              {i + 1}
            </span>
            <div className="flex-1">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-medium truncate max-w-[200px]">
                  {c.name || `Кандидат #${c.candidate_id}`}
                </span>
                <span className={cn(
                  "text-sm font-bold",
                  c.score >= 70 ? "text-emerald-600" :
                  c.score >= 40 ? "text-amber-600" :
                  "text-rose-600",
                )}>
                  {c.score}%
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    c.score >= 70 ? "bg-emerald-500" :
                    c.score >= 40 ? "bg-amber-500" :
                    "bg-rose-500",
                  )}
                  style={{ width: `${(c.score / maxScore) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CandidateCard({ candidate, navigate }: { candidate: ScoredCandidate; navigate: (path: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  const recIcon =
    candidate.recommendation === "interview"
      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      : candidate.recommendation === "reject"
        ? <XCircle className="h-4 w-4 text-rose-500" />
        : <AlertTriangle className="h-4 w-4 text-amber-500" />;

  const recLabel =
    candidate.recommendation === "interview" ? "Пригласить на интервью"
      : candidate.recommendation === "reject" ? "Не подходит"
        : "Рассмотреть";

  const recBg =
    candidate.recommendation === "interview" ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : candidate.recommendation === "reject" ? "bg-rose-50 text-rose-700 border-rose-200"
        : "bg-amber-50 text-amber-700 border-amber-200";

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between p-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white",
            candidate.score >= 70 ? "bg-emerald-500" :
            candidate.score >= 40 ? "bg-amber-500" :
            "bg-rose-500",
          )}>
            {candidate.score}
          </div>
          <div>
            <p className="font-semibold">{candidate.name || `Кандидат #${candidate.candidate_id}`}</p>
            <div className={cn("mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium", recBg)}>
              {recIcon}
              {recLabel}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/user/${candidate.candidate_id}`)}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
          >
            <UserCircle className="h-3.5 w-3.5" />
            Профиль
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:bg-muted"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Score bars (always visible) */}
      <div className="grid grid-cols-3 gap-4 border-t px-5 py-4">
        <ScoreBar label="Hard Skills" value={candidate.hard_skills_score} />
        <ScoreBar label="Опыт" value={candidate.experience_score} />
        <ScoreBar label="Soft Skills" value={candidate.soft_skills_score} />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="space-y-4 border-t px-5 py-4">
          {/* Reasoning */}
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Обоснование</p>
            <p className="text-sm leading-relaxed text-foreground/80">{candidate.reasoning}</p>
          </div>

          {/* Skills */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Подходящие навыки</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.matching_skills.length > 0 ? candidate.matching_skills.map((s) => (
                  <span key={s} className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">{s}</span>
                )) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Недостающие навыки</p>
              <div className="flex flex-wrap gap-1.5">
                {candidate.missing_skills.length > 0 ? candidate.missing_skills.map((s) => (
                  <span key={s} className="rounded-md bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700">{s}</span>
                )) : <span className="text-xs text-muted-foreground">—</span>}
              </div>
            </div>
          </div>

          {/* Skill gap */}
          {candidate.skill_gap_analysis && (
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Анализ навыков</p>
              <p className="text-sm leading-relaxed text-foreground/80">{candidate.skill_gap_analysis}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CandidateAnalysisPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("job");

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    runAnalysis(Number(jobId));
  }, [jobId]);

  async function runAnalysis(jobPostId: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi(`${API}/career-ai/score-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: jobPostId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Ошибка анализа");
      }
      const data: AnalysisResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  if (!jobId) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Target className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Выберите вакансию</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Перейдите в раздел «Мои вакансии» и нажмите «AI Анализ» на нужной вакансии.
          </p>
          <button
            onClick={() => navigate("/my-jobs")}
            className="mt-4 rounded-xl bg-rose-500 px-6 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
          >
            Мои вакансии
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card py-16 shadow-sm">
          <Loader2 className="h-10 w-10 animate-spin text-rose-500" />
          <div className="text-center">
            <p className="font-semibold">AI анализирует кандидатов...</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Сравниваем навыки, опыт и soft skills с требованиями вакансии
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-500" />
          <h2 className="text-lg font-semibold">Ошибка анализа</h2>
          <p className="mt-1 text-sm text-destructive">{error}</p>
          <button
            onClick={() => runAnalysis(Number(jobId))}
            className="mt-4 rounded-xl bg-rose-500 px-6 py-2 text-sm font-semibold text-white hover:bg-rose-600 transition-colors"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const sorted = [...result.scored_candidates].sort((a, b) => b.score - a.score);
  const avgScore = sorted.length > 0
    ? Math.round(sorted.reduce((sum, c) => sum + c.score, 0) / sorted.length)
    : 0;
  const goodCount = sorted.filter((c) => c.recommendation === "interview").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 pb-10">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate("/my-jobs")}
          className="mb-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          ← Мои вакансии
        </button>
        <h1 className="text-2xl font-bold">AI Анализ кандидатов</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Вакансия: <span className="font-medium text-foreground">{result.vacancy_title}</span>
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sorted.length}</p>
              <p className="text-xs text-muted-foreground">Кандидатов</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100">
              <Target className="h-5 w-5 text-rose-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}%</p>
              <p className="text-xs text-muted-foreground">Средний балл</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{goodCount}</p>
              <p className="text-xs text-muted-foreground">Рекомендованы</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <OverallChart candidates={sorted} />

      {/* Candidate list */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
          <Users className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">Нет откликов</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Пока никто не откликнулся на эту вакансию
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Users className="h-5 w-5 text-rose-500" />
            Кандидаты ({sorted.length})
          </h2>
          {sorted.map((c) => (
            <CandidateCard key={c.candidate_id} candidate={c} navigate={navigate} />
          ))}
        </div>
      )}
    </div>
  );
}
