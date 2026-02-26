import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Briefcase, Search, ArrowLeft, ArrowRight,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "/api";

type Role = "candidate" | "employer";
type Mode = "login" | "register";

const ROLES: { value: Role; title: string; subtitle: string; icon: React.ReactNode; gradient: string; border: string }[] = [
  {
    value: "candidate",
    title: "Я ищу работу",
    subtitle: "Просматривайте вакансии, откликайтесь и находите идеальное место",
    icon: <Search className="h-8 w-8" />,
    gradient: "from-rose-500 to-pink-500",
    border: "border-rose-200 hover:border-rose-400",
  },
  {
    value: "employer",
    title: "Я ищу сотрудников",
    subtitle: "Публикуйте вакансии, свайпайте кандидатов и нанимайте лучших",
    icon: <Briefcase className="h-8 w-8" />,
    gradient: "from-violet-500 to-indigo-500",
    border: "border-violet-200 hover:border-violet-400",
  },
];

export default function LoginPage() {
  const [step, setStep] = useState<"role" | "credentials">("role");
  const [mode, setMode] = useState<Mode>("login");
  const [role, setRole] = useState<Role>("candidate");

  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Employer registration fields
  const [companyName, setCompanyName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [jobTitle, setJobTitle] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  function handleRoleSelect(r: Role) {
    setRole(r);
    setStep("credentials");
    setError(null);
  }

  function handleBack() {
    setStep("role");
    setError(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        // Login via backend
        const res = await fetch(`${API}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.detail || "Ошибка входа");
        }

        const user = await res.json();
        login(
          { id: String(user.id), email: user.email, name: user.name, role: user.role },
          user.token,
        );
      } else {
        // Register
        if (role === "employer") {
          const res = await fetch(`${API}/auth/register-employer`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              password,
              company_name: companyName,
              display_name: displayName || undefined,
              job_title: jobTitle || undefined,
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.detail || "Ошибка регистрации");
          }

          const user = await res.json();
          login(
            { id: String(user.id), email: user.email, name: user.name, role: user.role },
            user.token,
          );
        } else {
          const res = await fetch(`${API}/auth/register-candidate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.detail || "Ошибка регистрации");
          }

          const user = await res.json();
          login(
            { id: String(user.id), email: user.email, name: user.name, role: user.role },
            user.token,
          );
        }
      }

      navigate("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Неизвестная ошибка");
    } finally {
      setLoading(false);
    }
  }

  const selectedRole = ROLES.find((r) => r.value === role)!;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-lg space-y-6">
        {/* Logo */}
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Work<span className="text-rose-500">Swipe</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {step === "role"
              ? "Выберите, как вы хотите использовать платформу"
              : mode === "login"
                ? "Войдите в свой аккаунт"
                : "Создайте аккаунт"}
          </p>
        </div>

        {/* ── Step 1: Role selection ─────────────────────────── */}
        {step === "role" && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => handleRoleSelect(r.value)}
                className={cn(
                  "group relative flex flex-col items-center gap-4 rounded-2xl border-2 bg-card p-8 text-center shadow-sm transition-all duration-200",
                  r.border,
                  "hover:shadow-md hover:-translate-y-0.5",
                )}
              >
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-sm",
                  r.gradient,
                )}>
                  {r.icon}
                </div>
                <div>
                  <p className="text-base font-semibold">{r.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {r.subtitle}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2: Credentials ────────────────────────────── */}
        {step === "credentials" && (
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            {/* Role indicator bar */}
            <div className={cn(
              "flex items-center gap-3 bg-linear-to-r px-6 py-4 text-white",
              selectedRole.gradient,
            )}>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                {selectedRole.icon}
              </div>
              <div>
                <p className="text-sm font-semibold">{selectedRole.title}</p>
                <p className="text-xs text-white/70">{selectedRole.subtitle}</p>
              </div>
            </div>

            {/* Login / Register tabs */}
            <div className="flex border-b">
              <button
                type="button"
                onClick={() => { setMode("login"); setError(null); }}
                className={cn(
                  "flex-1 py-3 text-center text-sm font-medium transition-colors",
                  mode === "login"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Вход
              </button>
              <button
                type="button"
                onClick={() => { setMode("register"); setError(null); }}
                className={cn(
                  "flex-1 py-3 text-center text-sm font-medium transition-colors",
                  mode === "register"
                    ? "border-b-2 border-primary text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Регистрация
              </button>
            </div>

            <div className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Минимум 4 символа"
                    required
                    minLength={4}
                  />
                </div>

                {/* Employer registration extra fields */}
                {mode === "register" && role === "employer" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Название компании *</Label>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="ООО Рога и Копыта"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Ваше имя</Label>
                      <Input
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Иван Иванов"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Должность</Label>
                      <Input
                        id="jobTitle"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="HR-менеджер"
                      />
                    </div>
                  </>
                )}

                {error && (
                  <p className="text-sm text-destructive">{error}</p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "w-full text-white shadow-sm",
                    role === "candidate"
                      ? "bg-rose-500 hover:bg-rose-600"
                      : "bg-violet-500 hover:bg-violet-600",
                  )}
                >
                  {loading
                    ? "Загрузка..."
                    : mode === "login"
                      ? "Войти"
                      : "Зарегистрироваться"}
                </Button>
              </form>

              {/* Back to role selection */}
              <button
                type="button"
                onClick={handleBack}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Выбрать другую роль
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
