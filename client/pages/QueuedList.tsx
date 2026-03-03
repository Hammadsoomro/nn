import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { List, Trash2, ChevronLeft, ChevronRight, Hash, User, Clock, AlertCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { io, Socket } from "socket.io-client";
import type { QueuedLine } from "@shared/api";

const ITEMS_PER_PAGE = 50;

export default function QueuedList() {
  const { token, isAdmin } = useAuth();
  const [lines, setLines] = useState<QueuedLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;

    const socket = io(window.location.origin, {
      auth: { token },
      reconnection: true,
    });

    socketRef.current = socket;

    const fetchQueued = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/queued", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setLines(data.lines || []);
        } else {
          setError(`Failed to load queued lines`);
        }
      } catch (error) {
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    };

    fetchQueued();

    socket.on("lines-queued-updated", () => {
      fetchQueued();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  const handleDeleteLine = async (lineId: string) => {
    if (!token) return;

    try {
      setDeletingId(lineId);
      const response = await fetch(`/api/queued/${lineId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setLines(lines.filter((line) => line._id !== lineId));
      }
    } catch (error) {
      console.error("Error deleting line:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(lines.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLines = lines.slice(startIndex, endIndex);

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Queue Management
            </h1>
            <p className="text-muted-foreground font-medium">
              Oversee all numbers currently waiting in the pool.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-primary/10 px-6 py-4 rounded-2xl border border-primary/20 shadow-sm">
             <div className="space-y-0.5">
               <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Total Pool</p>
               <p className="text-2xl font-extrabold text-primary leading-none">{lines.length}</p>
             </div>
             <List className="h-8 w-8 text-primary/40" />
          </div>
        </div>

        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Queued Items</CardTitle>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 rounded-lg"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-bold px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 rounded-lg"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-20 text-muted-foreground font-medium italic">Loading queue...</div>
            ) : lines.length === 0 ? (
              <div className="text-center py-20 opacity-40 space-y-4">
                <div className="h-16 w-16 bg-muted rounded-3xl flex items-center justify-center mx-auto">
                  <List className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-bold">Queue is currently empty</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {paginatedLines.map((line, index) => (
                  <div
                    key={line._id}
                    className="flex items-center justify-between p-5 hover:bg-muted/10 transition-colors group"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground flex-shrink-0">
                        {startIndex + index + 1}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-foreground text-lg leading-none break-all tracking-tight">
                          {line.content}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {line.addedBy || "Admin"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDateTime(line.addedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLine(line._id)}
                        disabled={deletingId === line._id}
                        className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/5 opacity-0 group-hover:opacity-100 transition-all rounded-xl"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
