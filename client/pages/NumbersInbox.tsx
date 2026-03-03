import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Hash, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

interface ClaimedNumber {
  _id: string;
  content: string;
  claimedAt: string;
  cooldownUntil: string;
}

export default function NumbersInbox() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [cooldownTimer, setCooldownTimer] = useState<string>("");

  const { data: settings = { lineCount: 5, cooldownMinutes: 30 } } = useQuery({
    queryKey: ["claim-settings"],
    queryFn: () => apiFetch("/api/claim/settings", { token }),
    enabled: !!token,
  });

  const { data: claimedNumbers = [], isLoading: loadingClaims } = useQuery<ClaimedNumber[]>({
    queryKey: ["claimed-numbers"],
    queryFn: () => apiFetch("/api/claim/numbers", { token }),
    enabled: !!token,
  });

  const { data: queuedData } = useQuery({
    queryKey: ["queued"],
    queryFn: () => apiFetch("/api/queued", { token }),
    enabled: !!token,
  });

  const queuedLinesAvailable = (queuedData?.lines?.length || 0) > 0;

  const canClaim = !claimedNumbers.some((num: ClaimedNumber) => {
    return new Date(num.cooldownUntil) > new Date();
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (claimedNumbers.length > 0) {
        await apiFetch("/api/claim/release", {
          method: "POST",
          token,
        });
      }
      return apiFetch("/api/claim", {
        method: "POST",
        token,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["claimed-numbers"] });
      queryClient.invalidateQueries({ queryKey: ["queued"] });
      toast.success(`${data.claimedCount} numbers claimed successfully!`);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to claim numbers");
    }
  });

  useEffect(() => {
    const interval = setInterval(() => {
      if (claimedNumbers.length === 0) {
        setCooldownTimer("");
        return;
      }

      const firstCooldown = claimedNumbers[0];
      const cooldownTime = new Date(firstCooldown.cooldownUntil);
      const now = new Date();
      const diff = cooldownTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCooldownTimer("");
        queryClient.invalidateQueries({ queryKey: ["claimed-numbers"] });
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCooldownTimer(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [claimedNumbers, queryClient]);

  const handleClaimNumbers = () => {
    if (!token || claimMutation.isPending || !canClaim) return;
    claimMutation.mutate();
  };

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Numbers Inbox
          </h1>
          <p className="text-muted-foreground font-medium">
            Claim available numbers and manage your workload.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Hash className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Claimed</p>
                <p className="text-2xl font-extrabold text-foreground">{claimedNumbers.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`h-12 w-12 rounded-2xl ${canClaim ? "bg-emerald-500/10" : "bg-rose-500/10"} flex items-center justify-center`}>
                {canClaim ? <CheckCircle className="h-6 w-6 text-emerald-600" /> : <Clock className="h-6 w-6 text-rose-600" />}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</p>
                <p className={`text-2xl font-extrabold ${canClaim ? "text-emerald-600" : "text-rose-600"}`}>
                  {canClaim ? "Ready" : "Cooldown"}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center">
                <RefreshCw className="h-6 w-6 text-blue-600" />
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batch Size</p>
                <p className="text-2xl font-extrabold text-foreground">{settings.lineCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/40 p-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-bold">Claim New Numbers</CardTitle>
                <CardDescription className="text-sm font-medium">
                  {!queuedLinesAvailable
                    ? "The queue is currently empty."
                    : canClaim
                      ? `You can claim ${settings.lineCount} new numbers now.`
                      : `You can claim again in ${cooldownTimer}.`}
                </CardDescription>
              </div>
              <Button
                onClick={handleClaimNumbers}
                disabled={!queuedLinesAvailable || !canClaim || claimMutation.isPending}
                size="lg"
                className={`h-14 px-10 rounded-xl font-bold text-base shadow-lg transition-all ${
                   canClaim && queuedLinesAvailable ? "bg-primary hover:bg-primary/90 shadow-primary/20" : ""
                }`}
              >
                {claimMutation.isPending ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-3 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Hash className="h-5 w-5 mr-3" />
                    {canClaim ? `Claim ${settings.lineCount} Numbers` : cooldownTimer}
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              <h3 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-[0.2em]">Active Workload</h3>
              {loadingClaims ? (
                <div className="text-center py-10 text-muted-foreground font-medium">Loading claimed numbers...</div>
              ) : claimedNumbers.length === 0 ? (
                <div className="text-center py-12 bg-muted/20 rounded-2xl border border-dashed border-border/60">
                  <div className="space-y-3 opacity-40">
                    <AlertCircle className="h-10 w-10 mx-auto text-muted-foreground" />
                    <p className="text-sm font-bold">No active numbers</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {claimedNumbers.map((number, index) => (
                    <div
                      key={number._id}
                      className="flex items-center gap-4 p-5 border border-border/40 rounded-2xl bg-muted/10 hover:bg-muted/20 transition-all group"
                    >
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0 group-hover:scale-110 transition-transform">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold text-foreground break-all leading-tight tracking-tight">
                          {number.content}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase mt-1">
                          Claimed {formatDateTime(number.claimedAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
