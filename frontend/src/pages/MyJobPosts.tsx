import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Eye, Heart, Inbox, Archive, Sparkles } from "lucide-react";
import { fetchApi } from "@/lib/fetchApi";

const API = import.meta.env.VITE_API_URL || "/api";

interface JobPost {
  id: number;
  title: string;
  description: string;
  tech_stack: string[];
  salary_min: number | null;
  salary_max: number | null;
  views_count: number;
  likes_count: number;
  created_at: string;
}

function formatSalary(min: number | null, max: number | null): string {
  if (min && max) return `${Math.round(min / 1000)}k – ${Math.round(max / 1000)}k ₽`;
  if (min) return `от ${Math.round(min / 1000)}k ₽`;
  if (max) return `до ${Math.round(max / 1000)}k ₽`;
  return "Не указана";
}

export default function MyJobPostsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Get org
        const orgRes = await fetchApi(`${API}/organizations/my`);
        if (!orgRes.ok) {
          throw new Error("Организация не найдена. Попробуйте перелогиниться как работодатель.");
        }
        const org = await orgRes.json();
        setOrgId(org.id);

        // Get jobs for this org
        const jobsRes = await fetchApi(`${API}/job-posts/?organization_id=${org.id}`);
        if (!jobsRes.ok) throw new Error("Ошибка загрузки вакансий");
        const data = await jobsRes.json();
        setJobs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl p-4">
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Мои вакансии</h1>
        <Button onClick={() => navigate("/create-job")}>
          <Plus className="mr-2 h-4 w-4" />
          Создать вакансию
        </Button>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Вакансий пока нет</p>
            <Button
              className="mt-4"
              onClick={() => navigate("/create-job")}
            >
              Создать первую вакансию
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Card key={job.id}>
              <CardHeader>
                <CardTitle className="text-lg">{job.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                  {job.description}
                </p>

                {job.tech_stack.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1">
                    {job.tech_stack.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-4 w-4" />
                    {job.views_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Inbox className="h-4 w-4" />
                    {job.likes_count} откликов
                  </span>
                </div>

                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/applications?job=${job.id}`)}
                  >
                    <Inbox className="mr-1 h-4 w-4" />
                    Отклики ({job.likes_count})
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/candidate-analysis?job=${job.id}`)}
                    className="bg-rose-500 text-white hover:bg-rose-600"
                  >
                    <Sparkles className="mr-1 h-4 w-4" />
                    AI Анализ
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    title="Архивировать"
                  >
                    <Archive className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
