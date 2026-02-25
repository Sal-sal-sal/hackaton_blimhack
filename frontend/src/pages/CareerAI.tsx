import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Upload, X, ExternalLink, Loader2, Wand2 } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

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

interface AnalyzeResponse {
  vacancies: Vacancy[];
  ai_feedback: string;
  scores: ResumeScores;
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

export default function CareerAIPage() {
  const [resumeText, setResumeText] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) {
      setSkills((prev) => [...prev, s]);
    }
    setSkillInput("");
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addSkill();
    }
  };

  const handleExtractKeywords = async () => {
    if (!resumeText.trim()) return;
    setExtracting(true);
    setError("");
    try {
      const resp = await fetch("/api/career-ai/extract-keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_text: resumeText }),
      });
      if (!resp.ok) throw new Error("Ошибка извлечения");
      const data = await resp.json();
      setSkills(data.skills);
      setKeywords(data.keywords.join(", "));
    } catch {
      setError("Не удалось извлечь навыки из резюме");
    } finally {
      setExtracting(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch("/api/career-ai/parse-csv", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error("Ошибка загрузки CSV");
      const data = await resp.json();
      setResumeText(data.raw_text);
      setSkills(data.skills);
      if (data.keywords.length > 0) {
        setKeywords(data.keywords.join(", "));
      }
    } catch {
      setError("Не удалось распарсить CSV");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleAnalyze = async () => {
    setError("");
    setResult(null);
    setLoading(true);

    const kw = keywords
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      const resp = await fetch("/api/career-ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_text: resumeText,
          skills,
          keywords: kw.length > 0 ? kw : skills,
        }),
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.detail || "Ошибка анализа");
      }
      const data: AnalyzeResponse = await resp.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6" />
          AI Карьерный анализ
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Загрузите резюме, укажите навыки — AI сравнит с вакансиями HeadHunter и даст рекомендации
        </p>
      </div>

      {/* Input section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ваше резюме</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Resume textarea */}
          <div className="space-y-2">
            <Label>Текст резюме</Label>
            <textarea
              className="w-full min-h-[160px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
              placeholder="Вставьте текст резюме или загрузите CSV..."
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
            />
          </div>

          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExtractKeywords}
              disabled={extracting || !resumeText.trim()}
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-2" />
              )}
              {extracting ? "Извлекаем..." : "Извлечь навыки из резюме"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              Загрузить CSV
            </Button>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Навыки</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Добавить навык (Enter)"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
              />
              <Button variant="secondary" size="sm" onClick={addSkill}>
                Добавить
              </Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {s}
                    <button onClick={() => removeSkill(s)} className="hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <Label>Ключевые слова для поиска (через запятую)</Label>
            <Input
              placeholder="По умолчанию = навыки"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
            />
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleAnalyze}
            disabled={loading || !resumeText.trim()}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Анализируем...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Получить анализ
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <>
          {/* Vacancies */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Вакансии HeadHunter ({result.vacancies.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {result.vacancies.map((v) => (
                <Card key={v.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-sm">{v.title}</p>
                        {v.employer && (
                          <p className="text-xs text-muted-foreground">{v.employer}</p>
                        )}
                      </div>
                      {v.url && (
                        <a
                          href={v.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    {v.salary && (
                      <p className="text-xs font-medium text-green-600 dark:text-green-400">
                        {v.salary}
                      </p>
                    )}
                    {v.key_skills.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {v.key_skills.map((sk) => (
                          <span
                            key={sk}
                            className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium"
                          >
                            {sk}
                          </span>
                        ))}
                      </div>
                    )}
                    {v.requirement && (
                      <p
                        className="text-xs text-muted-foreground line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: v.requirement }}
                      />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Radar Chart */}
          {result.scores && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Оценка резюме</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={scoresToChartData(result.scores)} cx="50%" cy="50%" outerRadius="75%">
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 10]}
                        tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Radar
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
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

          {/* AI Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI-рекомендации
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {result.ai_feedback.split("\n").map((line, i) => (
                  <p key={i} className={line.trim() === "" ? "h-2" : ""}>
                    {line}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
