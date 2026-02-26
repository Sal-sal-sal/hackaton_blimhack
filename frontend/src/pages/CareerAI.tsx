import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Upload, X, ExternalLink, Loader2, Wand2,
  BookOpen, Lightbulb, Target, TrendingUp, ArrowRight, FileText, Heart,
  CheckCircle2, AlertTriangle, Users,
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip,
} from "recharts";
import { fetchApi } from "@/lib/fetchApi";
import { cn } from "@/lib/utils";
import {
  useAnalyzeFavoritesMutation,
  useGetFavoritesQuery,
  type FavoritesAnalysis,
} from "@/features/favorites/favoritesApi";

const API = import.meta.env.VITE_API_URL || "/api";

// ── Types ────────────────────────────────────────────────────────────────────

interface Vacancy {
  id: string;
  title: string;
  employer?: string | null;
  salary?: string | null;
  requirement?: string | null;
  responsibility?: string | null;
  url?: string | null;
  key_skills: string[];
}

interface ResumeScores {
  competitiveness: number;
  growth_potential: number;
  technical_depth: number;
  practical_experience: number;
  presentation_quality: number;
  job_relevance: number;
}

interface Course {
  title: string;
  platform: string;
  url: string;
}

interface Project {
  title: string;
  description: string;
}

interface CareerDirection {
  title: string;
  description: string;
  match_percent: number;
}

interface Recommendations {
  skills_to_learn: string[];
  courses: Course[];
  projects: Project[];
  career_directions: CareerDirection[];
}

interface ProfessionMatch {
  title: string;
  match_percent: number;
  description: string;
}

interface CategoryScores {
  content: number;
  structure: number;
  formatting: number;
  keywords: number;
  achievements: number;
}

interface MarketComparison {
  axis: string;
  user: number;
  market: number;
}

interface Strength {
  title: string;
  description: string;
}

interface Improvement {
  title: string;
  description: string;
  priority: string;
}

interface Dashboard {
  overall_score: number;
  category_scores: CategoryScores;
  market_position: number;
  market_comparison: MarketComparison[];
  strengths: Strength[];
  improvements: Improvement[];
}

interface ProfileAnalyzeResponse {
  vacancies: Vacancy[];
  ai_feedback: string;
  scores: ResumeScores;
  recommendations: Recommendations;
  professions: ProfessionMatch[];
  dashboard: Dashboard;
}

interface ManualAnalyzeResponse {
  vacancies: Vacancy[];
  ai_feedback: string;
  scores: ResumeScores;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  content: "Контент",
  structure: "Структура",
  formatting: "Форматирование",
  keywords: "Ключевые слова",
  achievements: "Достижения",
};

const BAR_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

function categoryToChartData(scores: CategoryScores) {
  return (Object.keys(CATEGORY_LABELS) as (keyof CategoryScores)[]).map((key, i) => ({
    name: CATEGORY_LABELS[key],
    value: scores[key],
    fill: BAR_COLORS[i],
  }));
}

const SCORE_LABELS: Record<keyof ResumeScores, string> = {
  competitiveness: "Конкурентность",
  growth_potential: "Потенциал роста",
  technical_depth: "Тех. глубина",
  practical_experience: "Опыт",
  presentation_quality: "Презентация",
  job_relevance: "Релевантность",
};

function scoresToChartData(scores: ResumeScores) {
  return (Object.keys(SCORE_LABELS) as (keyof ResumeScores)[]).map((key) => ({
    category: SCORE_LABELS[key],
    value: scores[key],
  }));
}

// ── Component ────────────────────────────────────────────────────────────────

export default function CareerAIPage() {
  const [searchParams] = useSearchParams();
  const autoMode = searchParams.get("auto") === "1";

  const [mode, setMode] = useState<"auto" | "manual">(autoMode ? "auto" : "manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Auto mode result
  const [profileResult, setProfileResult] = useState<ProfileAnalyzeResponse | null>(null);

  // Manual mode state
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [keywords, setKeywords] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [manualResult, setManualResult] = useState<ManualAnalyzeResponse | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Favorites analysis
  const { data: favorites = [] } = useGetFavoritesQuery();
  const [analyzeFavorites, { isLoading: favLoading }] = useAnalyzeFavoritesMutation();
  const [favResult, setFavResult] = useState<FavoritesAnalysis | null>(null);
  const [favError, setFavError] = useState("");

  useEffect(() => {
    if (autoMode && !profileResult && !loading) {
      handleAutoAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAutoAnalyze() {
    setError("");
    setProfileResult(null);
    setLoading(true);
    try {
      const resp = await fetchApi(`${API}/career-ai/analyze-profile`, { method: "POST" });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.detail || "Ошибка анализа профиля");
      }
      const data: ProfileAnalyzeResponse = await resp.json();
      setProfileResult(data);
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  }

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((p) => [...p, s]);
    setSkillInput("");
  };

  const handleExtractKeywords = async () => {
    if (!resumeText.trim()) return;
    setExtracting(true);
    setError("");
    try {
      const resp = await fetch(`${API}/career-ai/extract-keywords`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText }),
      });
      if (!resp.ok) throw new Error("Ошибка извлечения");
      const data = await resp.json();
      setSkills(data.skills);
      setKeywords(data.keywords.join(", "));
    } catch {
      setError("Не удалось извлечь навыки");
    } finally {
      setExtracting(false);
    }
  };

  const processFile = async (file: File) => {
    if (file.name.endsWith(".csv")) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const resp = await fetch(`${API}/career-ai/parse-csv`, { method: "POST", body: formData });
        if (!resp.ok) throw new Error("Ошибка CSV");
        const data = await resp.json();
        setResumeText(data.raw_text);
        setSkills(data.skills);
        if (data.keywords.length > 0) setKeywords(data.keywords.join(", "));
      } catch {
        setError("Не удалось распарсить файл");
      }
    } else {
      const text = await file.text();
      setResumeText(text);
    }
    setShowForm(true);
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processFile(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };
  const handleDragLeave = () => setIsDragOver(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  };

  const handleManualAnalyze = async () => {
    setError("");
    setManualResult(null);
    setLoading(true);
    const kw = keywords.split(",").map((s) => s.trim()).filter(Boolean);
    try {
      const resp = await fetch(`${API}/career-ai/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText, skills, keywords: kw.length > 0 ? kw : skills }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.detail || "Ошибка анализа");
      }
      setManualResult(await resp.json());
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeFavorites = async () => {
    setFavError("");
    setFavResult(null);
    try {
      const data = await analyzeFavorites().unwrap();
      setFavResult(data);
    } catch (err: any) {
      setFavError(err?.data?.detail || "Ошибка анализа избранного");
    }
  };

  const result = mode === "auto" ? profileResult : manualResult;
  const recommendations = mode === "auto" ? profileResult?.recommendations : null;
  const dashboard = mode === "auto" ? profileResult?.dashboard : null;
  const professions = mode === "auto" ? profileResult?.professions : null;

  const showEmptyState = !result && !loading;

  return (
    <div className="flex flex-col gap-6 pb-8">

      {/* ── Empty state ── */}
      {showEmptyState && (
        <div className="flex flex-col items-center max-w-2xl mx-auto w-full gap-8 pt-4">

          {/* Header */}
          <div className="flex flex-col items-center text-center gap-3">
            <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
              <FileText className="h-8 w-8 text-rose-500" />
            </div>
            <h1 className="text-3xl font-bold">AI Карьерный анализ</h1>
            <p className="text-muted-foreground max-w-md">
              Загрузите резюме и получите детальный анализ с рекомендациями по улучшению
            </p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => { setMode("manual"); setShowForm(false); }}
              className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                mode === "manual" ? "bg-rose-500 text-white shadow-sm" : "border hover:bg-muted"
              }`}
            >
              <Upload className="inline h-4 w-4 mr-1.5" />
              Загрузить резюме
            </button>
            <button
              onClick={() => setMode("auto")}
              className={`rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                mode === "auto" ? "bg-rose-500 text-white shadow-sm" : "border hover:bg-muted"
              }`}
            >
              <Sparkles className="inline h-4 w-4 mr-1.5" />
              Из профиля
            </button>
          </div>

          {/* ── Manual: upload zone ── */}
          {mode === "manual" && !showForm && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.text"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all",
                  isDragOver
                    ? "border-rose-400 bg-rose-50 dark:bg-rose-950/20 scale-[1.01]"
                    : "border-muted-foreground/25 hover:border-rose-300 hover:bg-muted/40",
                )}
              >
                <div className="w-12 h-12 flex items-center justify-center text-muted-foreground">
                  <Upload className="h-10 w-10" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <p className="font-semibold text-base">
                    Перетащите файл сюда или нажмите для выбора
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Поддерживаются форматы:{" "}
                    <span className="text-rose-500 font-medium">CSV, TXT</span>{" "}
                    (макс. 10 МБ)
                  </p>
                </div>
                <Button
                  className="bg-rose-500 hover:bg-rose-600 text-white pointer-events-none"
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
                >
                  Выбрать файл
                </Button>
              </div>

              <button
                className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
                onClick={() => setShowForm(true)}
              >
                Вставить текст вручную
              </button>
            </>
          )}

          {/* ── Manual: detailed form ── */}
          {mode === "manual" && showForm && (
            <div className="w-full space-y-4">
              <div className="space-y-2">
                <Label>Текст резюме</Label>
                <textarea
                  className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
                  placeholder="Вставьте текст резюме..."
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleExtractKeywords} disabled={extracting || !resumeText.trim()}>
                  {extracting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  {extracting ? "Извлекаем..." : "Извлечь навыки"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>
                  <Upload className="h-4 w-4 mr-2" /> Загрузить файл
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Навыки</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Навык (Enter)"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                  />
                  <Button variant="secondary" size="sm" onClick={addSkill}>+</Button>
                </div>
                {skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {skills.map((s) => (
                      <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {s}
                        <button onClick={() => setSkills((p) => p.filter((x) => x !== s))} className="hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Ключевые слова (через запятую)</Label>
                <Input
                  placeholder="По умолчанию = навыки"
                  value={keywords}
                  onChange={(e) => setKeywords(e.target.value)}
                />
              </div>

              <Button
                className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                onClick={handleManualAnalyze}
                disabled={loading || !resumeText.trim()}
              >
                {loading
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Анализируем...</>
                  : <><Sparkles className="h-4 w-4 mr-2" /> Получить анализ</>}
              </Button>
            </div>
          )}

          {/* ── Auto: dashed zone with analyze button ── */}
          {mode === "auto" && (
            <div className="w-full border-2 border-dashed rounded-2xl p-12 flex flex-col items-center gap-4 border-muted-foreground/25">
              <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-rose-500" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-base">Автоматический анализ профиля</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  AI возьмёт данные вашего профиля, навыки и опыт, и найдёт подходящие вакансии
                </p>
              </div>
              <Button
                className="bg-rose-500 hover:bg-rose-600 text-white"
                onClick={handleAutoAnalyze}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Запустить анализ
              </Button>
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Feature cards */}
          <div className="grid grid-cols-3 gap-6 w-full pt-2">
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <p className="font-semibold text-sm">Анализ сильных сторон</p>
              <p className="text-xs text-rose-500">Что работает в вашем резюме</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <Target className="h-5 w-5 text-orange-500" />
              </div>
              <p className="font-semibold text-sm">Выявление слабостей</p>
              <p className="text-xs text-muted-foreground">Области для улучшения</p>
            </div>
            <div className="flex flex-col items-center text-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-green-500" />
              </div>
              <p className="font-semibold text-sm">Рекомендации</p>
              <p className="text-xs text-muted-foreground">Конкретные советы по улучшению</p>
            </div>
          </div>

        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
          </div>
          <p className="font-medium">Анализируем профиль...</p>
          <p className="text-sm text-muted-foreground">Подбираем вакансии и формируем рекомендации</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && !loading && (
        <>
          {/* ═══ Dashboard Header Banner ═══ */}
          {dashboard && (
            <div className="rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-fuchsia-500 p-6 sm:p-8 text-white relative overflow-hidden">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">Анализ завершен!</h1>
                  <p className="text-white/80 mt-1 text-sm sm:text-base">
                    Мы проанализировали ваше резюме и сравнили его с 10,000+ резюме в вашей категории
                  </p>
                </div>
                <div className="flex flex-col items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 shrink-0">
                  <span className="text-3xl sm:text-4xl font-bold">{dashboard.overall_score}</span>
                  <span className="text-[10px] sm:text-xs text-white/80">Общая оценка</span>
                </div>
              </div>
              {/* Reset button */}
              <button
                onClick={() => {
                  if (mode === "auto") setProfileResult(null);
                  else { setManualResult(null); setShowForm(false); setResumeText(""); setSkills([]); }
                }}
                className="absolute top-3 right-3 text-white/60 hover:text-white text-xs underline underline-offset-2"
              >
                Новый анализ
              </button>
            </div>
          )}

          {/* Fallback header for manual mode (no dashboard) */}
          {!dashboard && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-rose-500" />
                </div>
                <h1 className="text-xl font-bold">Результаты анализа</h1>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (mode === "auto") setProfileResult(null);
                  else { setManualResult(null); setShowForm(false); setResumeText(""); setSkills([]); }
                }}
              >
                Новый анализ
              </Button>
            </div>
          )}

          {/* ═══ Category Scores Bar Chart + Radar Chart (2 columns) ═══ */}
          {dashboard && (
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Bar Chart — Оценка по категориям */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    Оценка по категориям
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryToChartData(dashboard.category_scores)} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={[0, 100]}
                          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                          formatter={(value: number) => [`${value}/100`, "Оценка"]}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                          {categoryToChartData(dashboard.category_scores).map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Radar Chart — Сравнение с рынком */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-rose-500" />
                    Сравнение с рынком
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={dashboard.market_comparison} cx="50%" cy="50%" outerRadius="70%">
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="axis" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                        <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Ваше резюме" dataKey="user" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} strokeWidth={2} />
                        <Radar name="Средний показатель" dataKey="market" stroke="#9ca3af" fill="#9ca3af" fillOpacity={0.15} strokeWidth={1.5} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-rose-500" />
                      <span className="text-xs text-muted-foreground">Ваше резюме</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <span className="text-xs text-muted-foreground">Средний показатель</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══ Strengths + Market Position (2 columns) ═══ */}
          {dashboard && (
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Сильные стороны */}
              {dashboard.strengths.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Сильные стороны
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboard.strengths.map((s, i) => (
                        <div key={i} className="flex gap-3">
                          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{s.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Позиция на рынке + Что улучшить */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      Позиция на рынке
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                        Топ {dashboard.market_position}%
                      </span>
                    </div>
                    <div className="mt-3 h-3 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-all"
                        style={{ width: `${100 - dashboard.market_position}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Вы обходите {100 - dashboard.market_position}% кандидатов в вашей категории
                    </p>
                  </CardContent>
                </Card>

                {/* Что улучшить */}
                {dashboard.improvements.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        Что улучшить
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {dashboard.improvements.map((imp, i) => (
                          <div key={i} className="flex gap-3">
                            <span className={cn(
                              "shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white",
                              imp.priority === "high" ? "bg-red-500" :
                              imp.priority === "medium" ? "bg-amber-500" : "bg-gray-400"
                            )}>
                              {i + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium">{imp.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{imp.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ═══ Подходящие профессии ═══ */}
          {professions && professions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-indigo-500" />
                  Подходящие профессии
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {professions.map((prof) => (
                    <div key={prof.title} className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{prof.title}</h4>
                        <span className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold",
                          prof.match_percent >= 70 ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                          prof.match_percent >= 40 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                          "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                        )}>
                          {prof.match_percent}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-muted">
                        <div
                          className={cn(
                            "h-1.5 rounded-full transition-all",
                            prof.match_percent >= 70 ? "bg-green-500" :
                            prof.match_percent >= 40 ? "bg-amber-500" : "bg-red-500"
                          )}
                          style={{ width: `${prof.match_percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{prof.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Skills to learn ═══ */}
          {recommendations && recommendations.skills_to_learn.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-amber-500" />
                  Навыки для изучения
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {recommendations.skills_to_learn.map((skill) => (
                    <span key={skill} className="rounded-lg bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
                      {skill}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Career directions ═══ */}
          {recommendations && recommendations.career_directions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Карьерные направления
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recommendations.career_directions.map((dir) => (
                    <div key={dir.title} className="rounded-xl border p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-sm">{dir.title}</h4>
                        <span className="rounded-full bg-blue-100 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                          {dir.match_percent}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{dir.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Vacancies ═══ */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Вакансии HeadHunter ({result.vacancies.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.vacancies.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{v.title}</p>
                        {v.employer && <p className="text-xs text-muted-foreground">{v.employer}</p>}
                      </div>
                      {v.url && (
                        <a href={v.url} target="_blank" rel="noopener noreferrer" className="shrink-0 text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {v.salary && <p className="text-xs font-medium text-green-600 dark:text-green-400">{v.salary}</p>}
                    {v.key_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.key_skills.map((sk) => (
                          <span key={sk} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">{sk}</span>
                        ))}
                      </div>
                    )}
                    {v.requirement && (
                      <p className="text-xs text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: v.requirement }} />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ═══ Old Radar Chart (for manual mode fallback) ═══ */}
          {!dashboard && result.scores && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Оценка резюме</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={scoresToChartData(result.scores)} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="category" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} />
                      <PolarRadiusAxis angle={90} domain={[0, 10]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                      <Radar dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4">
                  {scoresToChartData(result.scores).map((d) => (
                    <div key={d.category} className="flex items-center justify-between rounded-md border px-3 py-2">
                      <span className="text-xs text-muted-foreground">{d.category}</span>
                      <span className="text-sm font-bold">{d.value}/10</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Courses ═══ */}
          {recommendations && recommendations.courses.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-green-500" />
                  Рекомендуемые курсы
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.courses.map((course) => (
                    <div key={course.title} className="flex items-center justify-between rounded-xl border p-3">
                      <div>
                        <p className="text-sm font-medium">{course.title}</p>
                        <p className="text-xs text-muted-foreground">{course.platform}</p>
                      </div>
                      {course.url && (
                        <a href={course.url} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600">
                          Перейти <ArrowRight className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ Projects ═══ */}
          {recommendations && recommendations.projects.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  Pet-проекты для портфолио
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  {recommendations.projects.map((proj) => (
                    <div key={proj.title} className="rounded-xl border p-4">
                      <h4 className="text-sm font-semibold">{proj.title}</h4>
                      <p className="mt-1 text-xs text-muted-foreground">{proj.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ═══ AI Feedback ═══ */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-анализ
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {result.ai_feedback.split("\n").map((line, i) => (
                  <p key={i} className={line.trim() === "" ? "h-2" : ""}>{line}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Favorites Analysis Section ── */}
      {favorites.length > 0 && (
        <Card className="border-rose-200 dark:border-rose-800/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-500" />
              Анализ понравившихся вакансий
              <span className="rounded-full bg-rose-100 dark:bg-rose-900/30 px-2 py-0.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                {favorites.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!favResult && !favLoading && (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-muted-foreground text-center max-w-md">
                  Сравним ваш профиль с понравившимися вакансиями и покажем, каких навыков не хватает
                </p>
                <Button
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                  onClick={handleAnalyzeFavorites}
                  disabled={favLoading}
                >
                  <Heart className="h-4 w-4 mr-2" />
                  Анализировать избранное
                </Button>
              </div>
            )}

            {favLoading && (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                <p className="text-sm text-muted-foreground">Анализируем ваши навыки и вакансии...</p>
              </div>
            )}

            {favError && <p className="text-sm text-destructive text-center">{favError}</p>}

            {favResult && (
              <div className="space-y-4">
                {/* Per-vacancy match */}
                {favResult.matches.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Совпадение по вакансиям
                    </h4>
                    <div className="space-y-2">
                      {favResult.matches.map((m, i) => (
                        <div key={i} className="rounded-xl border p-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{m.title}</p>
                            <span className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-bold",
                              m.match_percent >= 70 ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" :
                              m.match_percent >= 40 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                              "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                            )}>
                              {m.match_percent}%
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-1.5 rounded-full transition-all",
                                m.match_percent >= 70 ? "bg-green-500" :
                                m.match_percent >= 40 ? "bg-amber-500" : "bg-red-500"
                              )}
                              style={{ width: `${m.match_percent}%` }}
                            />
                          </div>
                          {m.missing_skills.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {m.missing_skills.map((sk) => (
                                <span key={sk} className="rounded bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 text-[10px] text-red-600 dark:text-red-400">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skill gaps */}
                {favResult.gaps.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-amber-500" />
                      Недостающие навыки
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {favResult.gaps.map((g) => (
                        <span
                          key={g.skill}
                          className={cn(
                            "rounded-lg px-2.5 py-1 text-xs font-medium",
                            g.priority === "high" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                            g.priority === "medium" ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400" :
                            "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                          )}
                        >
                          {g.skill} ({g.vacancies_count})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top recommendations */}
                {favResult.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      Топ навыки для изучения
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {favResult.recommendations.map((r, i) => (
                        <span key={r} className="rounded-lg bg-green-100 dark:bg-green-900/30 px-3 py-1.5 text-sm font-medium text-green-700 dark:text-green-400">
                          {i + 1}. {r}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Common themes */}
                {favResult.common_themes.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Общие тематики</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {favResult.common_themes.map((t) => (
                        <span key={t} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <Button variant="outline" size="sm" onClick={handleAnalyzeFavorites} disabled={favLoading}>
                  Обновить анализ
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
