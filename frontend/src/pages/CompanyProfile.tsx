import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, Heart, BadgeCheck, Globe, ExternalLink } from "lucide-react";
import { fetchApi } from "@/lib/fetchApi";

const API = import.meta.env.VITE_API_URL || "/api";

interface Organization {
  id: number;
  name: string;
  description: string | null;
  website_url: string | null;
  logo_url: string | null;
  industry: string | null;
  social_links: Record<string, string> | null;
  is_verified: boolean;
  created_at: string;
}

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

export default function CompanyProfilePage() {
  const { orgId } = useParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        let resolvedOrgId = orgId;

        // If no orgId in URL, load current user's org
        if (!resolvedOrgId) {
          const myRes = await fetchApi(`${API}/organizations/my`);
          if (!myRes.ok) throw new Error("Организация не найдена");
          const myOrg = await myRes.json();
          resolvedOrgId = String(myOrg.id);
        }

        const res = await fetchApi(`${API}/organizations/${resolvedOrgId}/public`);
        if (!res.ok) throw new Error("Ошибка загрузки профиля компании");
        const data = await res.json();
        setOrg(data.organization);
        setJobs(data.job_posts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orgId]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">{error || "Компания не найдена"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      {/* Company Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="h-16 w-16 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-2xl font-bold text-primary">
                {org.name.charAt(0)}
              </div>
            )}

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{org.name}</h1>
                {org.is_verified && (
                  <BadgeCheck className="h-5 w-5 text-blue-500" />
                )}
              </div>

              {org.industry && (
                <p className="text-sm text-muted-foreground">{org.industry}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-3">
                {org.website_url && (
                  <a
                    href={org.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Globe className="h-4 w-4" />
                    Сайт
                  </a>
                )}

                {org.social_links &&
                  Object.entries(org.social_links).map(([name, url]) => (
                    <a
                      key={name}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {name}
                    </a>
                  ))}
              </div>
            </div>
          </div>

          {org.description && (
            <p className="mt-4 text-sm text-muted-foreground">{org.description}</p>
          )}
        </CardContent>
      </Card>

      {/* Active Vacancies */}
      <div>
        <h2 className="mb-4 text-xl font-semibold">
          Вакансии ({jobs.length})
        </h2>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Нет активных вакансий</p>
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
                      <Heart className="h-4 w-4" />
                      {job.likes_count}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
