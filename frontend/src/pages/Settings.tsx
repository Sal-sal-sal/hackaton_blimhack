import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/hooks/useTheme";

export default function SettingsPage() {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the app</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="dark-mode">Dark mode</Label>
            <Switch id="dark-mode" checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="email-notif">Email notifications</Label>
            <Switch id="email-notif" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="push-notif">Push notifications</Label>
            <Switch id="push-notif" />
          </div>
        </CardContent>
      </Card>

      <Button onClick={() => toast.success("Settings saved!")}>Save changes</Button>
    </div>
  );
}
