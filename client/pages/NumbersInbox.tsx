import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

interface ClaimedNumber {
  _id: string;
  content: string;
  claimedAt: string;
  cooldownUntil: string;
}

export default function NumbersInbox() {
  const { token, user } = useAuth();
  const [claimedNumbers, setClaimedNumbers] = useState<ClaimedNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [settings, setSettings] = useState({
    lineCount: 5,
    cooldownMinutes: 30,
  });
  const [canClaim, setCanClaim] = useState(false);
  const [queuedLinesAvailable, setQueuedLinesAvailable] = useState(true);
  const [cooldownTimer, setCooldownTimer] = useState<string>("");

  // Fetch claim settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;

      try {
        const response = await fetch("/api/claim/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
      }
    };

    fetchSettings();
  }, [token]);

  // Fetch claimed numbers and check queued lines availability
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;

      try {
        setLoading(true);

        // Fetch claimed numbers
        const claimResponse = await fetch("/api/claim/numbers", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (claimResponse.ok) {
          const data = await claimResponse.json();
          setClaimedNumbers(data);

          // Check if user can claim (no active cooldown)
          const hasActiveCooldown = data.some((num: ClaimedNumber) => {
            return new Date(num.cooldownUntil) > new Date();
          });
          setCanClaim(!hasActiveCooldown);
        }

        // Fetch queued lines to check availability
        const queueResponse = await fetch("/api/queued", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (queueResponse.ok) {
          const queueData = await queueResponse.json();
          console.log("Queued lines fetched:", queueData);
          setQueuedLinesAvailable(
            Array.isArray(queueData.lines) && queueData.lines.length > 0,
          );
        } else {
          console.error("Failed to fetch queued lines:", queueResponse.status);
          setQueuedLinesAvailable(false);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setQueuedLinesAvailable(false);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // Update remaining cooldown time for main button
  useEffect(() => {
    const interval = setInterval(() => {
      if (claimedNumbers.length === 0) {
        setCooldownTimer("");
        return;
      }

      // Get the first claimed number's cooldown time
      const firstCooldown = claimedNumbers[0];
      const cooldownTime = new Date(firstCooldown.cooldownUntil);
      const now = new Date();
      const diff = cooldownTime.getTime() - now.getTime();

      if (diff <= 0) {
        setCooldownTimer("");
        setCanClaim(true);
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setCooldownTimer(`${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [claimedNumbers]);

  const handleClaimNumbers = async () => {
    if (!token || claiming || !canClaim) return;

    try {
      setClaiming(true);

      // Release previous claims
      if (claimedNumbers.length > 0) {
        await fetch("/api/claim/release", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      // Claim new numbers
      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setClaimedNumbers(data.claimedLines);
        setCanClaim(false);
        toast.success(`${data.claimedCount} numbers claimed successfully!`);
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to claim numbers");
      }
    } catch (error) {
      console.error("Error claiming numbers:", error);
      toast.error("Failed to claim numbers");
    } finally {
      setClaiming(false);
    }
  };

  const formatCooldownDuration = (minutes: number) => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)} seconds`;
    } else if (minutes < 60) {
      return `${Math.round(minutes)} minute${Math.round(minutes) !== 1 ? "s" : ""}`;
    } else {
      const hours = Math.round(minutes / 60);
      return `${hours} hour${hours !== 1 ? "s" : ""}`;
    }
  };

  const totalClaimed = claimedNumbers.length;

  return (
    <Layout>
      <div className="min-h-screen p-6 md:p-8 bg-transparent">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Numbers Inbox
              </h1>
            </div>
            <p className="text-muted-foreground">
              Claim {settings.lineCount} numbers at a time with{" "}
              {formatCooldownDuration(settings.cooldownMinutes)} cooldown
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Total Claimed
              </div>
              <div className="text-3xl font-bold text-foreground">
                {totalClaimed}
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">Status</div>
              <div
                className={`text-3xl font-bold ${canClaim ? "text-green-600" : "text-red-600"}`}
              >
                {canClaim ? "Ready" : "Cooldown"}
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Claim Settings
              </div>
              <div className="text-sm text-foreground">
                {settings.lineCount} lines per claim •{" "}
                {settings.cooldownMinutes} min cooldown
              </div>
            </Card>
          </div>

          {/* Claim Button Section */}
          <Card className="p-8 mb-8 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <div className="flex flex-col items-center gap-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Ready to Claim Numbers?
                </h2>
                <p className="text-muted-foreground">
                  {!queuedLinesAvailable
                    ? "No lines available in queue"
                    : canClaim
                      ? `Click the button below to claim ${settings.lineCount} new numbers`
                      : `Cooldown active: ${cooldownTimer || "Loading..."}`}
                </p>
              </div>

              {(() => {
                let buttonClass = "";
                let buttonEmoji = "";
                let buttonText = "";
                let isDisabled = false;

                if (!queuedLinesAvailable) {
                  buttonClass =
                    "bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed";
                  buttonEmoji = "⚪️";
                  buttonText = "No Lines Available";
                  isDisabled = true;
                } else if (!canClaim && cooldownTimer) {
                  buttonClass = "bg-red-600 hover:bg-red-700 text-white";
                  buttonEmoji = "🔴";
                  buttonText = `Cooldown: ${cooldownTimer}`;
                  isDisabled = true;
                } else if (canClaim) {
                  buttonClass = "bg-green-600 hover:bg-green-700 text-white";
                  buttonEmoji = "🟢";
                  buttonText = `Claim ${settings.lineCount} Numbers`;
                  isDisabled = false;
                } else {
                  buttonClass =
                    "bg-gray-400 hover:bg-gray-400 text-white cursor-not-allowed";
                  buttonEmoji = "⚪️";
                  buttonText = "No Lines Available";
                  isDisabled = true;
                }

                return (
                  <Button
                    onClick={handleClaimNumbers}
                    disabled={isDisabled || claiming || loading}
                    size="lg"
                    className={`${buttonClass} px-8 py-6 text-lg font-semibold`}
                  >
                    <span className="mr-2">{buttonEmoji}</span>
                    {claiming ? (
                      <>
                        <Clock className="h-5 w-5 mr-2 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      buttonText
                    )}
                  </Button>
                );
              })()}
            </div>
          </Card>

          {/* Claimed Numbers Section */}
          {loading ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                Loading claimed numbers...
              </div>
            </Card>
          ) : claimedNumbers.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  No numbers claimed yet. Click the Claim button to get started!
                </p>
              </div>
            </Card>
          ) : (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">
                Your Claimed Numbers ({claimedNumbers.length}/
                {settings.lineCount})
              </h2>
              <div className="space-y-3">
                {claimedNumbers.map((number, index) => (
                  <Card
                    key={number._id}
                    className="p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-lg break-words">
                            {number.content}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Claimed at: {formatDateTime(number.claimedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
