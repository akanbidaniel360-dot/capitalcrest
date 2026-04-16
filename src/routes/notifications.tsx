import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Bell, Check } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoading && !user) navigate({ to: "/login" });
  }, [user, isLoading]);

  useEffect(() => {
    if (!user) return;
    supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50).then(({ data }) => setNotifications(data ?? []));
  }, [user]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((n) => n.map((x) => x.id === id ? { ...x, is_read: true } : x));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((n) => n.map((x) => ({ ...x, is_read: true })));
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link to="/dashboard"><Button variant="ghost" size="icon" className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button></Link>
            <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
          </div>
          <Button variant="ghost" size="sm" onClick={markAllRead}>Mark all read</Button>
        </div>
      </header>
      <div className="mx-auto max-w-lg px-4 py-4">
        {notifications.length === 0 ? (
          <div className="py-16 text-center"><Bell className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">No notifications</p></div>
        ) : (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div key={n.id} className={`rounded-xl border bg-card p-4 ${n.is_read ? "border-border opacity-60" : "border-primary/30"}`} onClick={() => !n.is_read && markRead(n.id)}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                  </div>
                  {!n.is_read && <div className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />}
                </div>
                <p className="mt-2 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
