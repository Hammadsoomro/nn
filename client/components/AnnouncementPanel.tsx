import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Send, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export function AnnouncementPanel() {
  const { token, isAdmin } = useAuth();
  const [announcement, setAnnouncement] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastAnnouncement, setLastAnnouncement] = useState<{
    text: string;
    timestamp: string;
  } | null>(null);

  const handleSendAnnouncement = async () => {
    if (!token || !isAdmin) {
      toast.error("Admin access required");
      return;
    }

    if (!announcement.trim()) {
      toast.error("Please enter an announcement message");
      return;
    }

    if (announcement.trim().length > 500) {
      toast.error("Announcement must be 500 characters or less");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/announcements/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: announcement.trim(),
        }),
      });

      if (response.ok) {
        setLastAnnouncement({
          text: announcement.trim(),
          timestamp: new Date().toLocaleTimeString(),
        });
        setAnnouncement("");
        toast.success("Announcement sent to all team members!");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to send announcement");
      }
    } catch (error) {
      console.error("Error sending announcement:", error);
      toast.error("Failed to send announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Team Announcements</CardTitle>
          <CardDescription>
            Send announcements to all team members via the navbar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-primary/50 bg-primary/5">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Announcements will appear as a sliding notification in the navbar
              for all team members in real-time.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Announcement Message
              </label>
              <Textarea
                placeholder="Type your announcement here... (max 500 characters)"
                value={announcement}
                onChange={(e) => setAnnouncement(e.target.value.slice(0, 500))}
                className="min-h-24 resize-none"
                disabled={loading}
              />
              <div className="flex justify-between items-center text-xs text-muted-foreground">
                <span></span>
                <span>{announcement.length}/500</span>
              </div>
            </div>

            <Button
              onClick={handleSendAnnouncement}
              disabled={!announcement.trim() || loading}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4 mr-2" />
              {loading ? "Sending..." : "Send Announcement"}
            </Button>
          </div>

          {lastAnnouncement && (
            <div className="mt-6 pt-6 border-t border-border space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle className="h-4 w-4 text-green-600" />
                Last Announcement Sent
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <p className="text-sm text-foreground break-words">
                  {lastAnnouncement.text}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Sent at {lastAnnouncement.timestamp}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
