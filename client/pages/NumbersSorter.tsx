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
import { Trash2, Plus, Copy, Hash, Zap, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function NumbersSorter() {
  const { token, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [inputNumbers, setInputNumbers] = useState<string>("");
  const [deduplicated, setDeduplicated] = useState<string[]>([]);
  const [isDeduplicating, setIsDeduplicating] = useState(false);

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

  const { data: queuedData } = useQuery({
    queryKey: ["queued"],
    queryFn: () => apiFetch("/api/queued", { token }),
    enabled: !!token,
  });

  const queuedCount = queuedData?.lines?.length || 0;

  const addToQueueMutation = useMutation({
    mutationFn: (lines: string[]) =>
      apiFetch("/api/queued/add", {
        method: "POST",
        body: JSON.stringify({ lines }),
        token,
      }),
    onSuccess: () => {
      toast.success("Added to queue successfully!");
      setDeduplicated([]);
      setInputNumbers("");
      queryClient.invalidateQueries({ queryKey: ["queued"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add to queue");
    }
  });

  useEffect(() => {
    localStorage.setItem("sorterInput", inputNumbers);
  }, [inputNumbers]);

  useEffect(() => {
    localStorage.setItem("sorterDeduplicated", JSON.stringify(deduplicated));
  }, [deduplicated]);

  const deduplicateLines = async () => {
    if (!token) return;

    const lines = inputNumbers.split("\n").filter((line) => line.trim());

    if (lines.length === 0) {
      toast.error("Please enter some numbers first");
      return;
    }

    try {
      setIsDeduplicating(true);

      const [queuedResponse, historyResponse] = await Promise.all([
        apiFetch("/api/queued", { token }),
        apiFetch("/api/history", { token })
      ]);

      const queuedLines = new Set(
        (queuedResponse.lines || []).map((line: any) =>
          line.content.trim().toLowerCase(),
        ),
      );

      const historyLines = new Set(
        (historyResponse.entries || []).map((entry: any) =>
          entry.content.trim().toLowerCase(),
        ),
      );

      const seen = new Set<string>();
      const unique: string[] = [];

      lines.forEach((line) => {
        const trimmedLine = line.trim().toLowerCase();
        if (
          !seen.has(trimmedLine) &&
          !queuedLines.has(trimmedLine) &&
          !historyLines.has(trimmedLine)
        ) {
          seen.add(trimmedLine);
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

  const clearInput = () => {
    setInputNumbers("");
    setDeduplicated([]);
  };

  const addToQueue = async () => {
    if (deduplicated.length === 0) {
      toast.error("Please deduplicate some lines first");
      return;
    }
    addToQueueMutation.mutate(deduplicated);
  };

  const copyToClipboard = () => {
    if (deduplicated.length === 0) return;
    navigator.clipboard.writeText(deduplicated.join("\n"));
    toast.success("Copied to clipboard!");
  };

  const isLoading = addToQueueMutation.isPending;

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Numbers Sorter
            </h1>
            <p className="text-muted-foreground font-medium">
              Import, deduplicate, and prepare numbers for the queue.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-primary/10 px-6 py-4 rounded-2xl border border-primary/20 shadow-sm">
             <div className="space-y-0.5">
               <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Currently Queued</p>
               <p className="text-2xl font-extrabold text-primary leading-none">{queuedCount}</p>
             </div>
             <Hash className="h-8 w-8 text-primary/40" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <Card className="xl:col-span-2 border-border/40 shadow-sm overflow-hidden flex flex-col">
            <CardHeader className="bg-muted/30 border-b border-border/40">
              <CardTitle className="text-xl font-bold">Input Source</CardTitle>
              <CardDescription className="text-xs">Paste numbers one per line below</CardDescription>
            </CardHeader>
            <CardContent className="p-6 flex-1 flex flex-col space-y-4">
              <Textarea
                placeholder="000-000-0000..."
                value={inputNumbers}
                onChange={(e) => setInputNumbers(e.target.value)}
                className="flex-1 min-h-[500px] resize-none bg-background border-border/50 focus-visible:ring-primary/20 p-4 font-mono text-sm"
              />
              <div className="flex gap-3">
                <Button
                  onClick={deduplicateLines}
                  disabled={isDeduplicating || !inputNumbers.trim()}
                  className="flex-1 h-12 rounded-xl font-bold"
                >
                  <Zap className="h-4 w-4 mr-2 fill-current" />
                  {isDeduplicating ? "Deduplicating..." : "Run Deduplication"}
                </Button>
                <Button
                  onClick={clearInput}
                  variant="outline"
                  className="px-6 h-12 rounded-xl border-border/60"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-8">
            <Card className="border-border/40 shadow-sm overflow-hidden flex flex-col">
              <CardHeader className="bg-muted/30 border-b border-border/40">
                <CardTitle className="text-xl font-bold">Unique Results</CardTitle>
                <CardDescription className="text-xs">{deduplicated.length} unique items identified</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[400px]">
                  <div className="p-6 space-y-2">
                    {deduplicated.length > 0 ? (
                      deduplicated.map((line, idx) => (
                        <div
                          key={idx}
                          className="p-3 bg-muted/20 rounded-xl border border-border/40 hover:bg-muted/40 transition-all"
                        >
                          <p className="text-xs font-bold text-foreground break-all">
                            {line}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-[300px] opacity-30 space-y-3">
                        <CheckCircle className="h-10 w-10" />
                        <p className="text-sm font-bold">Results will appear here</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold">Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={addToQueue}
                  disabled={deduplicated.length === 0 || isLoading}
                  className="w-full h-14 rounded-xl font-bold text-base shadow-lg shadow-primary/20"
                >
                  <Plus className="h-5 w-5 mr-3" />
                  {isLoading ? "Adding to Queue..." : "Add to Queued List"}
                </Button>
                <Button
                  onClick={copyToClipboard}
                  disabled={deduplicated.length === 0}
                  variant="secondary"
                  className="w-full h-12 rounded-xl font-bold"
                >
                  <Copy className="h-4 w-4 mr-3" />
                  Copy to Clipboard
                </Button>

                <div className="pt-6 border-t border-border/40 space-y-4">
                  <div className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border border-border/40">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Input Count</span>
                    <span className="font-extrabold text-foreground">
                      {inputNumbers.split("\n").filter((l) => l.trim()).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-primary/5 p-3 rounded-xl border border-primary/20">
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Unique Count</span>
                    <span className="font-extrabold text-primary">
                      {deduplicated.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

// Fixed ScrollArea for internal card use
function ScrollArea({ children, className }: { children: React.ReactNode; className?: string }) {
    return (
        <div className={`overflow-y-auto ${className}`}>
            {children}
        </div>
    );
}
