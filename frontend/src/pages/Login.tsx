import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import {
  Briefcase, Search, ArrowLeft, Check,
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "/api";

type Role = "candidate" | "employer";
type Step = "role" | "credentials";
type Mode = "login" | "register";

export default function LoginPage() {
  const [step, setStep] = useState<Step>("role");
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

  function handleContinue() {
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-muted/30 p-4">
      {/* Theme toggle */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border bg-card shadow-lg">
          {/* Logo header */}
          <div className="flex flex-col items-center gap-3 px-8 pt-10 pb-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500 shadow-md">
              <span className="text-2xl font-bold text-white">W</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight">
              Work<span className="text-rose-500">Swipe</span>
            </h1>
          </div>

          {/* ── Step 1: Role selection ─────────────────────────── */}
          {step === "role" && (
            <div className="px-8 pb-8">
              <h2 className="mb-5 text-center text-lg font-semibold">Вход</h2>

              {/* Role options — HH-style bordered rows */}
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => setRole("candidate")}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all",
                    role === "candidate"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    role === "candidate" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    <Search className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Я ищу работу</p>
                    <p className="text-xs text-muted-foreground">Профиль соискателя</p>
                  </div>
                  {role === "candidate" && (
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setRole("employer")}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-xl border-2 px-4 py-4 text-left transition-all",
                    role === "employer"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-muted-foreground/30",
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    role === "employer" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">Я ищу сотрудников</p>
                    <p className="text-xs text-muted-foreground">Профиль работодателя</p>
                  </div>
                  {role === "employer" && (
                    <Check className="h-5 w-5 shrink-0 text-primary" />
                  )}
                </button>
              </div>

              {/* Action buttons */}
              <div className="mt-6 space-y-3">
                <Button
                  onClick={handleContinue}
                  className="w-full"
                  size="lg"
                >
                  Войти
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setMode("register"); handleContinue(); }}
                  className="w-full"
                  size="lg"
                >
                  Зарегистрироваться
                </Button>
              </div>
            </div>
          )}

          {/* ── Step 2: Credentials ────────────────────────────── */}
          {step === "credentials" && (
            <div className="px-8 pb-8">
              {/* Role badge */}
              <div className="mb-5 flex items-center justify-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {role === "candidate" ? <Search className="h-3.5 w-3.5" /> : <Briefcase className="h-3.5 w-3.5" />}
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  {role === "candidate" ? "Соискатель" : "Работодатель"}
                </span>
              </div>

              {/* Login / Register tabs */}
              <div className="mb-5 flex rounded-lg border bg-muted/50 p-1">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); }}
                  className={cn(
                    "flex-1 rounded-md py-2 text-center text-sm font-medium transition-all",
                    mode === "login"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Вход
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(null); }}
                  className={cn(
                    "flex-1 rounded-md py-2 text-center text-sm font-medium transition-all",
                    mode === "register"
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Регистрация
                </button>
              </div>

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
                  className="w-full"
                  size="lg"
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
          )}
        </div>

        {/* Footer text */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Нажимая «Войти» или «Зарегистрироваться», вы принимаете условия использования
        </p>
      </div>
    </div>
  );
}
