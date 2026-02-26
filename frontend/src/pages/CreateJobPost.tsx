import { useState, useRef, type FormEvent, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fetchApi } from "@/lib/fetchApi";
import { ImagePlus, X, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "/api";

export default function CreateJobPostPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [techStack, setTechStack] = useState("");
  const [conditions, setConditions] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  // Image upload state
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload to backend
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetchApi(`${API}/job-posts/upload-image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Не удалось загрузить изображение");
      }

      const data = await res.json();
      setImageUrl(data.url);
    } catch {
      setError("Ошибка загрузки изображения");
      setImagePreview(null);
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveImage() {
    setImageUrl(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get organization_id for current user
      const orgRes = await fetchApi(`${API}/organizations/my`);
      if (!orgRes.ok) {
        throw new Error("Не удалось получить организацию. Убедитесь, что employer засеян.");
      }
      const org = await orgRes.json();

      const body = {
        organization_id: org.id,
        title,
        description,
        requirements: requirements || null,
        tech_stack: techStack
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
        salary_min: salaryMin ? Number(salaryMin) : null,
        salary_max: salaryMax ? Number(salaryMax) : null,
        image_url: imageUrl,
      };

      const res = await fetchApi(`${API}/job-posts/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.detail || "Ошибка создания вакансии");
      }

      navigate("/my-jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <Card>
        <CardHeader>
          <CardTitle>Создать вакансию</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ── Background image upload ── */}
            <div className="space-y-2">
              <Label>Фото на задний фон</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageSelect}
                className="hidden"
              />

              {imagePreview ? (
                <div className="relative overflow-hidden rounded-xl border">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-48 w-full object-cover"
                  />
                  {/* Uploading overlay */}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin text-white" />
                    </div>
                  )}
                  {/* Remove button */}
                  {!uploading && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                  {/* Success indicator */}
                  {imageUrl && !uploading && (
                    <div className="absolute bottom-2 left-2 rounded-full bg-green-500/90 px-2.5 py-0.5 text-xs font-medium text-white">
                      Загружено
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/30 text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/50 hover:text-foreground"
                >
                  <ImagePlus className="h-8 w-8" />
                  <span className="text-sm font-medium">Нажмите, чтобы выбрать изображение</span>
                  <span className="text-xs">JPG, PNG, WebP или GIF</span>
                </button>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Senior Frontend Developer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Описание</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Описание вакансии..."
                required
                rows={4}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="requirements">Требования</Label>
              <textarea
                id="requirements"
                value={requirements}
                onChange={(e) => setRequirements(e.target.value)}
                placeholder="Опыт работы от 3 лет..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conditions">Условия работы</Label>
              <textarea
                id="conditions"
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="Удалённая работа, гибкий график, ДМС..."
                rows={3}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="techStack">Технологии (через запятую)</Label>
              <Input
                id="techStack"
                value={techStack}
                onChange={(e) => setTechStack(e.target.value)}
                placeholder="React, TypeScript, Node.js"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salaryMin">Зарплата от</Label>
                <Input
                  id="salaryMin"
                  type="number"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  placeholder="100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salaryMax">Зарплата до</Label>
                <Input
                  id="salaryMax"
                  type="number"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  placeholder="200000"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={loading || uploading}>
                {loading ? "Создание..." : "Создать вакансию"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/my-jobs")}
              >
                Отмена
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
