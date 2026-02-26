import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ExternalLink, Loader2, Briefcase, MapPin } from "lucide-react";
import { fetchApi } from "@/lib/fetchApi";

const API = import.meta.env.VITE_API_URL || "/api";

interface Vacancy {
  id: string;
  title: string;
  employer?: string | null;
  employer_logo?: string | null;
  salary?: string | null;
  requirement?: string | null;
  responsibility?: string | null;
  url?: string | null;
  key_skills: string[];
}

const AREAS = [
  { id: 1, name: "Москва" },
  { id: 2, name: "Санкт-Петербург" },
  { id: 3, name: "Екатеринбург" },
  { id: 4, name: "Новосибирск" },
  { id: 66, name: "Нижний Новгород" },
  { id: 88, name: "Казань" },
  { id: 104, name: "Краснодар" },
  { id: 113, name: "Россия (все)" },
];

export default function HHVacanciesPage() {
  const [query, setQuery] = useState("");
  const [area, setArea] = useState(1);
  const [loading, setLoading] = useState(false);
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    if (!query.trim()) return;
    setError("");
    setLoading(true);
    setSearched(true);
    try {
      const resp = await fetchApi(`${API}/career-ai/hh-vacancies?q=${encodeURIComponent(query)}&area=${area}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => null);
        throw new Error(body?.detail || "Ошибка поиска");
      }
      setVacancies(await resp.json());
    } catch (err: any) {
      setError(err.message || "Произошла ошибка");
      setVacancies([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Briefcase className="h-6 w-6" />
          Вакансии HeadHunter
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Поиск вакансий на HeadHunter для анализа рынка
        </p>
      </div>

      {/* Search bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="Поиск вакансий (например: Python developer)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
              className="flex-1"
            />
            <select
              value={area}
              onChange={(e) => setArea(Number(e.target.value))}
              className="rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {AREAS.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              Найти
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && searched && vacancies.length === 0 && !error && (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Search className="h-10 w-10 mb-3" />
          <p>Вакансии не найдены</p>
        </div>
      )}

      {!loading && vacancies.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {vacancies.map((v) => (
            <Card key={v.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    {v.employer_logo ? (
                      <img
                        src={v.employer_logo}
                        alt={v.employer ?? ""}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Briefcase className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm leading-tight truncate">{v.title}</h3>
                      {v.employer && (
                        <p className="text-xs text-muted-foreground mt-0.5">{v.employer}</p>
                      )}
                    </div>
                  </div>
                  {v.url && (
                    <a
                      href={v.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg border p-1.5 text-muted-foreground hover:text-rose-500 hover:border-rose-200 transition-colors"
                      title="Открыть на HH"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {v.salary && (
                  <p className="text-sm font-semibold text-green-600 dark:text-green-400">{v.salary}</p>
                )}

                {v.key_skills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {v.key_skills.slice(0, 6).map((sk) => (
                      <span key={sk} className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">{sk}</span>
                    ))}
                    {v.key_skills.length > 6 && (
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                        +{v.key_skills.length - 6}
                      </span>
                    )}
                  </div>
                )}

                {v.requirement && (
                  <p className="text-xs text-muted-foreground line-clamp-3" dangerouslySetInnerHTML={{ __html: v.requirement }} />
                )}

                {v.url && (
                  <a
                    href={v.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600"
                  >
                    Подробнее на HH <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
