import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/app/Layout";
import { ProtectedRoute } from "@/app/ProtectedRoute";

const DashboardPage = lazy(() => import("@/pages/Dashboard"));
const SettingsPage = lazy(() => import("@/pages/Settings"));
const ProfilePage = lazy(() => import("@/pages/Profile"));
const ChatPage = lazy(() => import("@/pages/Chat"));
const SwipePage = lazy(() => import("@/pages/Swipe"));
const LoginPage = lazy(() => import("@/pages/Login"));
const MyJobPostsPage = lazy(() => import("@/pages/MyJobPosts"));
const CreateJobPostPage = lazy(() => import("@/pages/CreateJobPost"));
const CareerAIPage = lazy(() => import("@/pages/CareerAI"));
const ApplicationsPage = lazy(() => import("@/pages/Applications"));
const CompanyProfilePage = lazy(() => import("@/pages/CompanyProfile"));
const HHVacanciesPage = lazy(() => import("@/pages/HHVacancies"));
const NotFoundPage = lazy(() => import("@/pages/NotFound"));

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/swipe" element={<SwipePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/my-jobs" element={<MyJobPostsPage />} />
            <Route path="/create-job" element={<CreateJobPostPage />} />
            <Route path="/career-ai" element={<CareerAIPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/company" element={<CompanyProfilePage />} />
            <Route path="/company/:orgId" element={<CompanyProfilePage />} />
            <Route path="/hh-vacancies" element={<HHVacanciesPage />} />
          </Route>
        </Route>

        {/* Redirects & 404 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
