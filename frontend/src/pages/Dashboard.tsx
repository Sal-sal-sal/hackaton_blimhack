import { Users, FolderKanban, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGetDashboardStatsQuery } from "@/store/apiSlice";

const icons = [Users, FolderKanban, DollarSign, TrendingUp];
const labels = ["Total Users", "Active Projects", "Revenue", "Growth"];

export default function DashboardPage() {
  const { data: stats } = useGetDashboardStatsQuery();

  const values = stats
    ? [stats.totalUsers, stats.activeProjects, stats.revenue, stats.growth]
    : ["-", "-", "-", "-"];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {labels.map((label, i) => {
          const Icon = icons[i];
          return (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{String(values[i])}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {["User signed up", "Project created", "Deployment completed", "Payment received"].map(
                (item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-md border p-3 text-sm"
                  >
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    {item}
                    <span className="ml-auto text-xs text-muted-foreground">just now</span>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <p>Add your charts, tables, or any dashboard widgets here.</p>
            <p className="mt-2">
              This template is ready for you to plug in real data from your backend API via RTK
              Query.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
