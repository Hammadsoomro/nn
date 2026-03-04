import { Layout } from "@/components/Layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { Trash2, Plus, Copy } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function NumbersSorter() {
  const { token, isAdmin, user } = useAuth();
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const [inputNumbers, setInputNumbers] = useState<string>("");
  const [deduplicated, setDeduplicated] = useState<string[]>([]);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !user?.teamId) return;

    const invalidateQueued = (data: { teamId?: string }) => {
      if (data.teamId && data.teamId !== user.teamId) return;
      queryClient.invalidateQueries({ queryKey: ["queued"] });
    };

    const invalidateSettings = (data: { teamId?: string }) => {
      if (data.teamId && data.teamId !== user.teamId) return;
      queryClient.invalidateQueries({ queryKey: ["claim-settings"] });
    };

    socket.on("lines-queued-updated", invalidateQueued);
    socket.on("claim-settings-updated", invalidateSettings);

    return () => {
      socket.off("lines-queued-updated", invalidateQueued);
      socket.off("claim-settings-updated", invalidateSettings);
    };
  }, [socket, queryClient, user?.teamId]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedInput = localStorage.getItem("sorterInput");
    if (savedInput) setInputNumbers(savedInput);

    const savedDeduplicated = localStorage.getItem("sorterDeduplicated");
    if (savedDeduplicated) {
      try {
        setDeduplicated(JSON.parse(savedDeduplicated));
      } catch (error) {
        console.error("Error loading deduplicated lines:", error);
      }
    }
  }, []);

  const [localSettings, setLocalSettings] = useState({
    lineCount: 5,
    cooldownMinutes: 30,
  });

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ["claim-settings"],
    queryFn: () => apiFetch("/api/claim/settings", { token }),
    enabled: !!token,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  // Fetch queued lines count
  const { data: queuedData } = useQuery({
    queryKey: ["queued"],
    queryFn: () => apiFetch("/api/queued", { token }),
    enabled: !!token,
  });

  const queuedCount = queuedData?.lines?.length || 0;

  // Mutations
  const addToQueueMutation = useMutation({
    mutationFn: (lines: string[]) =>
      apiFetch("/api/queued/add", {
        method: "POST",
        body: JSON.stringify({ lines }),
        token,
      }),
    onSuccess: (data) => {
      const added = data.count || 0;
      const skipped = data.skipped || 0;

      if (added > 0) {
        toast.success(`Added ${added} to queue! ${skipped > 0 ? `Skipped ${skipped} duplicates.` : ""}`);
      } else if (skipped > 0) {
        toast.info(`All ${skipped} lines skipped (already in queue/history).`);
      } else {
        toast.info("No lines were added.");
      }

      setDeduplicated([]);
      setInputNumbers("");
      queryClient.invalidateQueries({ queryKey: ["queued"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add to queue");
    }
  });

  const saveSettingsMutation = useMutation({
    mutationFn: (newSettings: { lineCount: number; cooldownMinutes: number }) =>
      apiFetch("/api/claim/settings", {
        method: "PUT",
        body: JSON.stringify(newSettings),
        token,
      }),
    onSuccess: () => {
      toast.success("Settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["claim-settings"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update settings");
    }
  });

  // Debounced Local Storage Sync for Input
  useEffect(() => {
    const timeout = setTimeout(() => {
      localStorage.setItem("sorterInput", inputNumbers);
    }, 500); // 500ms debounce
    return () => clearTimeout(timeout);
  }, [inputNumbers]);

  useEffect(() => {
    localStorage.setItem("sorterDeduplicated", JSON.stringify(deduplicated));
  }, [deduplicated]);

  const deduplicateLines = async () => {
    if (!token) {
      toast.error("Authentication required");
      return;
    }

    const lines = inputNumbers.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      toast.error("Please enter some numbers first");
      return;
    }

    try {
      setIsDeduplicating(true);

      const response = await apiFetch("/api/queued/deduplicate", {
        method: "POST",
        body: JSON.stringify({ lines }),
        token,
      });

      const unique = response.unique || [];
      setDeduplicated(unique);

      if (unique.length === 0) {
        toast.info("All lines already exist in Queued List or History");
      } else {
        toast.success(`${unique.length} unique lines after deduplication`);
      }
    } catch (error) {
      console.error("Error deduplicating lines:", error);
      toast.error("Failed to deduplicate lines");
    } finally {
      setIsDeduplicating(false);
    }
  };

  const clearInput = () => {
    setInputNumbers("");
    setDeduplicated([]);
  };

  const copyToClipboard = () => {
    if (deduplicated.length === 0) return;
    const text = deduplicated.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard!");
    }).catch((err) => {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy to clipboard");
    });
  };

  const addToQueue = async () => {
    if (deduplicated.length === 0) {
      toast.error("Please deduplicate some lines first");
      return;
    }
    addToQueueMutation.mutate(deduplicated);
  };

  const saveSettings = async () => {
    saveSettingsMutation.mutate(localSettings);
  };

  const isLoading = addToQueueMutation.isPending;
  const savingSettings = saveSettingsMutation.isPending;

  return (
    <Layout>
      <div className="min-h-screen p-6 md:p-8 bg-transparent">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                Numbers Sorter 🔢
              </h1>
              <div className="flex items-center gap-3 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                <span className="text-sm font-medium text-muted-foreground">
                  Queued:
                </span>
                <span className="text-2xl font-bold text-primary">
                  {queuedCount}
                </span>
              </div>
            </div>
            <p className="text-muted-foreground">
              Input numbers, deduplicate them, and add to queue
            </p>
          </div>

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Input */}
            <Card className="border-border/50 lg:row-span-2">
              <CardHeader>
                <CardTitle>Input Numbers</CardTitle>
                <CardDescription>
                  Paste your numbers here, one per line
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter numbers here..."
                  value={inputNumbers}
                  onChange={(e) => setInputNumbers(e.target.value)}
                  className="min-h-96 resize-none"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={deduplicateLines}
                    disabled={isDeduplicating}
                    className="flex-1 bg-primary hover:bg-primary/90"
                  >
                    {isDeduplicating ? "Deduplicating..." : "Deduplicate"}
                  </Button>
                  <Button
                    onClick={clearInput}
                    variant="outline"
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Right: Deduplicated Lines */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Deduplicated Lines</CardTitle>
                <CardDescription>
                  {deduplicated.length} unique lines found
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  readOnly
                  value={deduplicated.join("\n")}
                  className="min-h-96 resize-none bg-secondary/50 border-border"
                  placeholder="Deduplicated lines will appear here..."
                />
              </CardContent>
            </Card>

            {/* Bottom: Actions */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={addToQueue}
                  disabled={deduplicated.length === 0 || isLoading}
                  className="w-full bg-primary hover:bg-primary/90 h-10"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isLoading ? "Adding..." : "Add to Queued List"}
                </Button>
                <Button
                  onClick={copyToClipboard}
                  disabled={deduplicated.length === 0}
                  variant="outline"
                  className="w-full h-10"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy All
                </Button>

                {/* Statistics */}
                <div className="mt-6 pt-6 border-t border-border space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Input Lines:
                    </span>
                    <span className="font-semibold text-foreground">
                      {inputNumbers.split("\n").filter((l) => l.trim()).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Unique Lines:
                    </span>
                    <span className="font-semibold text-foreground text-primary">
                      {deduplicated.length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      Duplicates Removed:
                    </span>
                    <span className="font-semibold text-foreground">
                      {Math.max(
                        0,
                        inputNumbers.split("\n").filter((l) => l.trim())
                          .length - deduplicated.length,
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Admin Settings Section */}
          {isAdmin && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle>Claim Settings</CardTitle>
                <CardDescription>
                  Configure how many numbers users can claim at once and the
                  cooldown time
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Line Count Setting */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">
                      Numbers per Claim
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={localSettings.lineCount}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            lineCount: parseInt(e.target.value) || 1,
                          })
                        }
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                      <span className="text-sm text-muted-foreground">
                        lines
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How many numbers each team member can claim at once
                      (1-100)
                    </p>
                  </div>

                  {/* Cooldown Setting */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-foreground">
                      Cooldown Time
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        min="1"
                        max="1440"
                        value={localSettings.cooldownMinutes}
                        onChange={(e) =>
                          setLocalSettings({
                            ...localSettings,
                            cooldownMinutes: parseInt(e.target.value) || 1,
                          })
                        }
                        className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                      />
                      <span className="text-sm text-muted-foreground">
                        minutes
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      How long users must wait before claiming again (1-1440
                      minutes)
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <Button
                    onClick={saveSettings}
                    disabled={savingSettings}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {savingSettings ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
