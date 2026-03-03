import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Clock, Search, ChevronLeft, ChevronRight, Hash, User, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { io, Socket } from "socket.io-client";
import type { HistoryEntry } from "@shared/api";

const ITEMS_PER_PAGE = 50;

export default function History() {
  const { token, user, isAdmin } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEntries, setFilteredEntries] = useState<HistoryEntry[]>([]);
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

    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/api/history", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setEntries(data.entries || []);
          setFilteredEntries(data.entries || []);
        } else {
          setError(`Failed to load history`);
        }
      } catch (error) {
        setError("Connection error");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    socket.on("claimed-today-updated", () => {
      fetchHistory();
    });

    return () => {
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries);
    } else {
      const filtered = entries.filter((entry) =>
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredEntries(filtered);
    }
    setCurrentPage(1);
  }, [searchQuery, entries]);

  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

  return (
    <Layout>
      <div className="p-6 md:p-10 max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              History
            </h1>
            <p className="text-muted-foreground font-medium">
              A comprehensive log of all claimed numbers and activities.
            </p>
          </div>
          <div className="flex items-center gap-4 bg-primary/10 px-6 py-4 rounded-2xl border border-primary/20 shadow-sm">
             <div className="space-y-0.5">
               <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Total Entries</p>
               <p className="text-2xl font-extrabold text-primary leading-none">{entries.length}</p>
             </div>
             <Calendar className="h-8 w-8 text-primary/40" />
          </div>
        </div>

        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Search through history logs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 bg-card border-border/40 rounded-2xl shadow-sm focus-visible:ring-primary/20 text-base font-medium"
          />
        </div>

        <Card className="border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/40 p-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold">Activity Logs</CardTitle>
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
              <div className="text-center py-20 text-muted-foreground font-medium italic">Loading history...</div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-20 opacity-40 space-y-4">
                <div className="h-16 w-16 bg-muted rounded-3xl flex items-center justify-center mx-auto">
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="font-bold">No history records found</p>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {paginatedEntries.map((entry) => (
                  <div
                    key={entry._id}
                    className="flex items-center justify-between p-5 hover:bg-muted/10 transition-colors group"
                  >
                    <div className="flex items-center gap-5 min-w-0">
                      <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center text-xs font-bold text-secondary-foreground flex-shrink-0">
                        <Hash className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <p className="font-bold text-foreground text-lg leading-none break-all tracking-tight">
                          {entry.content}
                        </p>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" /> {entry.claimedBy || "System"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatDateTime(entry.claimedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
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
