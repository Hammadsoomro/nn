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
import { useState, useEffect, useRef } from "react";
import { Trash2, Plus, Copy, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";

export default function NumbersSorter() {
  const { token, isAdmin } = useAuth();
  const [inputNumbers, setInputNumbers] = useState<string>("");
  const [deduplicated, setDeduplicated] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeduplicating, setIsDeduplicating] = useState(false);
  const [settings, setSettings] = useState({
    lineCount: 5,
    cooldownMinutes: 30,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const socketRef = useRef<Socket | null>(null);

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

  // Load settings from server and initialize Socket.IO
  useEffect(() => {
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    const loadSettings = async () => {
      try {
        const response = await fetch("/api/claim/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setSettings({
            lineCount: data.lineCount || 5,
            cooldownMinutes: data.cooldownMinutes || 30,
          });
        }
      } catch (error) {
        console.error("[NumbersSorter] Error loading settings:", error);
      }
    };

    loadSettings();

    // Listen for real-time claim settings updates
    const handleClaimSettingsUpdated = () => {
      console.log("[NumbersSorter] Claim settings updated, reloading");
      loadSettings();
    };

    socket.on("claim-settings-updated", handleClaimSettingsUpdated);

    return () => {
      socket.off("claim-settings-updated", handleClaimSettingsUpdated);
      socket.disconnect();
    };
  }, [token]);

  // Save to localStorage when input changes
  useEffect(() => {
    localStorage.setItem("sorterInput", inputNumbers);
  }, [inputNumbers]);

  // Save deduplicated lines to localStorage when they change
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

      // Fetch queued lines
      const queuedResponse = await fetch("/api/queued", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const queuedData = queuedResponse.ok ? await queuedResponse.json() : {};
      const queuedLines = new Set(
        (queuedData.lines || []).map((line: any) =>
          line.content.trim().toLowerCase(),
        ),
      );

      // Fetch history entries
      const historyResponse = await fetch("/api/history", {
        headers: { Authorization: `Bearer ${token}` },
      });

      const historyData = historyResponse.ok
        ? await historyResponse.json()
        : {};
      const historyLines = new Set(
        (historyData.entries || []).map((entry: any) =>
          entry.content.trim().toLowerCase(),
        ),
      );

      // Get first 15 words of each line for comparison
      const getFirstWords = (text: string) => {
        return text.split(/\s+/).slice(0, 15).join(" ");
      };

      // Deduplicate: keep only first occurrence of each unique set of first 15 words
      // AND exclude lines that are already in queued list or history
      const seen = new Set<string>();
      const unique: string[] = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim().toLowerCase();
        const key = getFirstWords(trimmedLine);

        // Check if not already seen, and not in queued list or history
        if (
          !seen.has(key) &&
          !queuedLines.has(trimmedLine) &&
          !historyLines.has(trimmedLine)
        ) {
          seen.add(key);
          unique.push(line);
        }
      });

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

  const addToQueue = async () => {
    if (deduplicated.length === 0) {
      toast.error("Please deduplicate some lines first");
      return;
    }

    setIsLoading(true);
    try {
      await apiFetch("/api/queued/add", {
        method: "POST",
        body: JSON.stringify({ lines: deduplicated }),
        token,
      });

      toast.success("Added to queue successfully!");
      setDeduplicated([]);
      setInputNumbers("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add to queue",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const clearInput = () => {
    setInputNumbers("");
    setDeduplicated([]);
  };

  const copyToClipboard = async () => {
    const text = deduplicated.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied to clipboard!");
    } catch (error) {
      alert("Failed to copy");
    }
  };

  const saveSettings = async () => {
    if (!token || !isAdmin) {
      toast.error("Admin access required");
      return;
    }

    try {
      setSavingSettings(true);
      const response = await fetch("/api/claim/settings", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineCount: Math.max(1, Math.min(100, settings.lineCount)),
          cooldownMinutes: Math.max(
            1,
            Math.min(1440, settings.cooldownMinutes),
          ),
        }),
      });

      if (response.ok) {
        toast.success("Settings updated successfully!");
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update settings",
      );
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <Layout>
      <div className="min-h-screen p-6 md:p-8 bg-transparent">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              Numbers Sorter 🔢
            </h1>
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
                <div className="bg-secondary/50 rounded-lg p-4 min-h-64 max-h-96 overflow-y-auto space-y-2 border border-border">
                  {deduplicated.length > 0 ? (
                    deduplicated.map((line, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-background rounded border border-border/50 hover:border-primary/50 transition-colors group"
                      >
                        <p className="text-sm text-foreground break-words">
                          {line}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <p>Deduplicated lines will appear here</p>
                    </div>
                  )}
                </div>
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
                        value={settings.lineCount}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
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
                        value={settings.cooldownMinutes}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
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
