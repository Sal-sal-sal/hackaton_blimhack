import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@example.com");
  const [password, setPassword] = useState("password");
  const [role, setRole] = useState<"candidate" | "employer">("candidate");
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    if (role === "employer") {
      // Seed employer data in backend
      try {
        const base = import.meta.env.VITE_API_URL || "/api";
        await fetch(`${base}/../auth/seed-employer`, { method: "POST" });
      } catch {
        // ignore — seed is best-effort
      }
      login(
        { id: "1", email, name: "Demo Employer", role: "employer" },
        "demo-jwt-token",
      );
    } else {
      login(
        { id: "1", email, name: "Demo User", role: "candidate" },
        "demo-jwt-token",
      );
    }

    navigate("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={role === "candidate" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRole("candidate")}
              >
                Кандидат
              </Button>
              <Button
                type="button"
                variant={role === "employer" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setRole("employer")}
              >
                Работодатель
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo: just click Sign in with any credentials
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
