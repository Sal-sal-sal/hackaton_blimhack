import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, FolderKanban, DollarSign, TrendingUp, Briefcase, Eye, Inbox, UserPlus,
  Sparkles, Target, BookOpen, ArrowRight, UserCircle, Loader2, CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAppSelector } from "@/store";
import { fetchApi } from "@/lib/fetchApi";

const API = import.meta.env.VITE_API_URL || "/api";

// ─── Employer Dashboard ──────────────────────────────────────────────────────

interface EmployerDashboardStats {
  total_vacancies: number;
  total_views: number;
  total_applications: number;
  new_applications: number;
}

function EmployerDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<EmployerDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi(`${API}/employers/dashboard`)
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const cards = stats
    ? [
        { label: "Вакансии", value: stats.total_vacancies, icon: Briefcase },
        { label: "Просмотры", value: stats.total_views, icon: Eye },
        { label: "Отклики", value: stats.total_applications, icon: Inbox },
        { label: "Новые отклики", value: stats.new_applications, icon: UserPlus },
      ]
    : [
        { label: "Вакансии", value: "-", icon: Briefcase },
        { label: "Просмотры", value: "-", icon: Eye },
        { label: "Отклики", value: "-", icon: Inbox },
        { label: "Новые отклики", value: "-", icon: UserPlus },
      ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Кабинет работодателя</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{String(card.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Быстрые действия</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/create-job")}>
              <Briefcase className="mr-2 h-4 w-4" /> Создать вакансию
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/applications")}>
              <Inbox className="mr-2 h-4 w-4" /> Все отклики
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/hh-vacancies")}>
              <Target className="mr-2 h-4 w-4" /> Вакансии HH
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/company")}>
              <FolderKanban className="mr-2 h-4 w-4" /> Профиль компании
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Подсказки</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Используйте раздел «Отклики» для управления откликами кандидатов.</p>
            <p className="mt-2">В профиле компании можно указать отрасль, ссылки на соц. сети и описание.</p>
            <p className="mt-2">Раздел «Вакансии HH» позволяет искать вакансии на HeadHunter.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Candidate Dashboard ─────────────────────────────────────────────────────

interface CandidateProfileData {
  title: string | null;
  city: string | null;
  career_interests: string[];
  github_url: string | null;
  portfolio_url: string | null;
}

interface ResumeData {
  id: number;
  skills: { name: string }[];
  work_experience: any[];
  education: any[];
}

function CandidateDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CandidateProfileData | null>(null);
  const [resumes, setResumes] = useState<ResumeData[]>([]);
  const [displayProfile, setDisplayProfile] = useState<{ display_name: string; bio: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetchApi(`${API}/candidates/profile`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      fetchApi(`${API}/candidates/resumes`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      fetchApi(`${API}/profiles/me`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]).then(([cp, res, dp]) => {
      setProfile(cp);
      setResumes(res);
      setDisplayProfile(dp);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Calculate profile completeness
  const resume = resumes[0] || null;
  const skillCount = resume?.skills?.length || 0;
  const expCount = resume?.work_experience?.length || 0;
  const eduCount = resume?.education?.length || 0;
  const interestCount = profile?.career_interests?.length || 0;

  const completenessItems = [
    { label: "Имя", done: !!displayProfile?.display_name },
    { label: "О себе", done: !!displayProfile?.bio },
    { label: "Должность", done: !!profile?.title },
    { label: "Город", done: !!profile?.city },
    { label: "Навыки", done: skillCount > 0 },
    { label: "Опыт", done: expCount > 0 },
    { label: "Образование", done: eduCount > 0 },
    { label: "Интересы", done: interestCount > 0 },
  ];
  const completedCount = completenessItems.filter((i) => i.done).length;
  const completeness = Math.round((completedCount / completenessItems.length) * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Панель кандидата</h1>

      {/* Stats cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Заполненность</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-500">{completeness}%</div>
            <div className="mt-2 h-2 rounded-full bg-muted">
              <div className="h-2 rounded-full bg-rose-500 transition-all" style={{ width: `${completeness}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Навыки</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{skillCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Опыт работы</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Интересы</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{interestCount}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Profile completeness details */}
        <Card>
          <CardHeader><CardTitle>Заполненность профиля</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completenessItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`h-4 w-4 ${item.done ? "text-green-500" : "text-muted-foreground/30"}`} />
                  <span className={item.done ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
            {completeness < 100 && (
              <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/profile")}>
                <UserCircle className="mr-2 h-4 w-4" /> Заполнить профиль
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick actions */}
        <Card>
          <CardHeader><CardTitle>Быстрые действия</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/profile")}>
              <UserCircle className="mr-2 h-4 w-4" /> Мой профиль
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/career-ai?auto=1")}>
              <Sparkles className="mr-2 h-4 w-4" /> AI анализ профиля
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/career-ai")}>
              <Target className="mr-2 h-4 w-4" /> Ручной анализ резюме
            </Button>
            <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/swipe")}>
              <Briefcase className="mr-2 h-4 w-4" /> Просмотр вакансий
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Top skills */}
      {skillCount > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Мои навыки</span>
              <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resume!.skills.slice(0, 12).map((s) => (
                <span key={s.name} className="rounded-lg bg-muted px-3 py-1 text-xs font-medium">{s.name}</span>
              ))}
              {skillCount > 12 && <span className="rounded-lg bg-muted px-3 py-1 text-xs text-muted-foreground">+{skillCount - 12}</span>}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const role = useAppSelector((s) => s.auth.user?.role);

  if (role === "employer") {
    return <EmployerDashboard />;
  }
  return <CandidateDashboard />;
}
