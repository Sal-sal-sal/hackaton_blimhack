import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare, UserPlus, Check, Sparkles, Loader2,
  TrendingUp, AlertTriangle, ChevronDown, ChevronUp, BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fetchApi } from "@/lib/fetchApi";

const API = import.meta.env.VITE_API_URL || "/api";

interface Application {
  id: number;
  user_id: number;
  user_email: string;
  candidate_name: string | null;
  candidate_title: string | null;
  resume_title: string | null;
  status: string | null;
  created_at: string;
}

interface JobPost {
  id: number;
  title: string;
}

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

interface ScoreResult {
  vacancy_title: string;
  scored_candidates: ScoredCandidate[];
}

function StatusBadge({ status }: { status: string | null }) {
  if (status === "invited") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
        <Check className="h-3 w-3" />
        Приглашен
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
      Новый
    </span>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 70
      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      : score >= 40
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";

  return (
    <span className={cn("rounded-full px-2.5 py-1 text-sm font-bold", color)}>
      {score}%
    </span>
  );
}

function RecommendationBadge({ rec }: { rec: string }) {
  if (rec === "invite") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <Check className="h-3 w-3" />
        Рекомендуем
      </span>
    );
  }
  if (rec === "reject") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
        <AlertTriangle className="h-3 w-3" />
        Не подходит
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
      Рассмотреть
    </span>
  );
}

function SubScoreBar({ label, score, weight }: { label: string; score: number; weight: string }) {
  const barColor =
    score >= 70 ? "bg-green-500" :
    score >= 40 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {label} <span className="text-muted-foreground/60">{weight}</span>
        </span>
        <span className="font-bold">{score}%</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn("h-1.5 rounded-full transition-all", barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobFilter = searchParams.get("job");

  const [applications, setApplications] = useState<Application[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // AI scoring state
  const [scoring, setScoring] = useState(false);
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [scoreError, setScoreError] = useState("");
  const [expandedCandidate, setExpandedCandidate] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const orgRes = await fetchApi(`${API}/organizations/my`);
        if (orgRes.ok) {
          const org = await orgRes.json();
          const jobsRes = await fetchApi(`${API}/job-posts/?organization_id=${org.id}`);
          if (jobsRes.ok) {
            setJobs(await jobsRes.json());
          }
        }

        let url = `${API}/applications/`;
        if (jobFilter) {
          url = `${API}/applications/job/${jobFilter}`;
        }
        const res = await fetch(url);
        if (!res.ok) throw new Error("Ошибка загрузки откликов");
        setApplications(await res.json());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobFilter]);

  // Reset AI scores when job filter changes
  useEffect(() => {
    setScoreResult(null);
    setScoreError("");
  }, [jobFilter]);

  async function handleInvite(appId: number) {
    try {
      const res = await fetchApi(`${API}/applications/${appId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "invited" }),
      });
      if (!res.ok) throw new Error("Ошибка");
      setApplications((prev) =>
        prev.map((a) => (a.id === appId ? { ...a, status: "invited" } : a))
      );
    } catch {
      // silent
    }
  }

  async function handleChat(userId: number) {
    try {
      const res = await fetchApi(`${API}/chats/direct/${userId}`, { method: "POST" });
      if (res.ok) {
        navigate("/chat");
      }
    } catch {
      navigate("/chat");
    }
  }

  async function handleAISort() {
    if (!jobFilter) return;
    setScoring(true);
    setScoreError("");
    setScoreResult(null);
    try {
      const res = await fetchApi(`${API}/career-ai/score-candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_post_id: Number(jobFilter) }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || "Ошибка AI-сортировки");
      }
      const data: ScoreResult = await res.json();
      setScoreResult(data);
    } catch (err: any) {
      setScoreError(err.message || "Произошла ошибка");
    } finally {
      setScoring(false);
    }
  }

  const filtered = applications.filter((a) => {
    if (statusFilter === "new") return a.status === null;
    if (statusFilter === "invited") return a.status === "invited";
    return true;
  });

  // If AI scored, sort the filtered list by score
  const scoreMap = new Map<number, ScoredCandidate>();
  if (scoreResult) {
    for (const sc of scoreResult.scored_candidates) {
      scoreMap.set(sc.candidate_id, sc);
    }
  }

  const displayList = scoreResult
    ? [...filtered].sort((a, b) => {
        const sa = scoreMap.get(a.user_id)?.score ?? -1;
        const sb = scoreMap.get(b.user_id)?.score ?? -1;
        return sb - sa;
      })
    : filtered;

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl font-bold">Отклики</h1>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={jobFilter || ""}
          onChange={(e) => {
            const v = e.target.value;
            navigate(v ? `/applications?job=${v}` : "/applications");
          }}
        >
          <option value="">Все вакансии</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>

        <select
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Все статусы</option>
          <option value="new">Новые</option>
          <option value="invited">Приглашенные</option>
        </select>

        {/* AI Sort button — only when a specific job is selected */}
        {jobFilter && filtered.length > 0 && (
          <Button
            size="sm"
            variant={scoreResult ? "outline" : "default"}
            className={cn(!scoreResult && "bg-violet-600 hover:bg-violet-700 text-white")}
            onClick={handleAISort}
            disabled={scoring}
          >
            {scoring ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Анализируем...
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-4 w-4" />
                {scoreResult ? "Пересортировать AI" : "Сортировать с AI"}
              </>
            )}
          </Button>
        )}
      </div>

      {/* AI scoring info banner */}
      {scoring && (
        <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
          <div>
            <p className="text-sm font-medium text-violet-800 dark:text-violet-300">
              AI анализирует кандидатов...
            </p>
            <p className="text-xs text-violet-600 dark:text-violet-400">
              Оцениваем hard skills (×0.5), опыт (×0.3) и soft skills (×0.2) каждого кандидата
            </p>
          </div>
        </div>
      )}

      {scoreError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{scoreError}</p>
        </div>
      )}

      {/* Score result header */}
      {scoreResult && !scoring && (
        <div className="flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/30 p-3">
          <Sparkles className="h-4 w-4 text-violet-600 shrink-0" />
          <p className="text-sm text-violet-800 dark:text-violet-300">
            Кандидаты отсортированы по соответствию вакансии «{scoreResult.vacancy_title}»
          </p>
        </div>
      )}

      {displayList.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Откликов пока нет</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {displayList.map((app, index) => {
            const sc = scoreMap.get(app.user_id);
            const isExpanded = expandedCandidate === app.user_id;

            return (
              <Card key={app.id} className={cn(sc && "border-l-4", sc && (
                sc.score >= 70 ? "border-l-green-500" :
                sc.score >= 40 ? "border-l-amber-500" : "border-l-red-400"
              ))}>
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Rank number when scored */}
                    {sc && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold">
                        {index + 1}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium truncate">
                          {app.candidate_name || app.user_email}
                        </span>
                        <StatusBadge status={app.status} />
                        {sc && <ScoreBadge score={sc.score} />}
                        {sc && <RecommendationBadge rec={sc.recommendation} />}
                      </div>
                      {app.resume_title && (
                        <p className="text-sm text-muted-foreground truncate">{app.resume_title}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(app.created_at).toLocaleDateString("ru-RU")}
                      </p>
                    </div>

                    <div className="flex gap-2 shrink-0">
                      {sc && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpandedCandidate(isExpanded ? null : app.user_id)}
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      )}
                      {app.status !== "invited" && (
                        <Button size="sm" onClick={() => handleInvite(app.id)}>
                          <UserPlus className="mr-1 h-4 w-4" />
                          Пригласить
                        </Button>
                      )}
                      <Button size="sm" variant="outline" onClick={() => handleChat(app.user_id)}>
                        <MessageSquare className="mr-1 h-4 w-4" />
                        Чат
                      </Button>
                    </div>
                  </div>

                  {/* Expanded AI analysis */}
                  {sc && isExpanded && (
                    <div className="mt-3 space-y-4 border-t pt-3">
                      {/* Pro arguments */}
                      <p className="text-sm text-muted-foreground">{sc.reasoning}</p>

                      {/* Overall score bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-foreground">Общее соответствие</span>
                          <span className="font-bold text-lg">{sc.score}%</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-muted">
                          <div
                            className={cn(
                              "h-2.5 rounded-full transition-all",
                              sc.score >= 70 ? "bg-green-500" :
                              sc.score >= 40 ? "bg-amber-500" : "bg-red-500"
                            )}
                            style={{ width: `${sc.score}%` }}
                          />
                        </div>
                      </div>

                      {/* Three weighted sub-scores */}
                      <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                          Оценка по категориям
                        </p>
                        <SubScoreBar label="Тех. навыки" score={sc.hard_skills_score} weight="(×0.5)" />
                        <SubScoreBar label="Опыт" score={sc.experience_score} weight="(×0.3)" />
                        <SubScoreBar label="Soft skills" score={sc.soft_skills_score} weight="(×0.2)" />
                      </div>

                      {/* Skill gap analysis */}
                      {sc.skill_gap_analysis && (
                        <div className="flex gap-2.5 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3">
                          <BookOpen className="h-4 w-4 shrink-0 text-blue-500 mt-0.5" />
                          <div>
                            <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 mb-0.5">
                              Анализ пробелов
                            </p>
                            <p className="text-sm text-blue-800 dark:text-blue-300">
                              {sc.skill_gap_analysis}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Matching skills */}
                      {sc.matching_skills.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Совпадающие навыки
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {sc.matching_skills.map((s) => (
                              <span key={s} className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[11px] font-medium text-green-700 dark:text-green-400">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Missing skills */}
                      {sc.missing_skills.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Недостающие навыки
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {sc.missing_skills.map((s) => (
                              <span key={s} className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:text-red-400">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
