import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Clock, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { formatDateTime } from "@/lib/utils";
import { io, Socket } from "socket.io-client";
import type { HistoryEntry } from "@shared/api";

const ITEMS_PER_PAGE = 100;

export default function History() {
  const { token, user, isAdmin } = useAuth();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEntries, setFilteredEntries] = useState<HistoryEntry[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Initialize Socket.IO connection for real-time updates
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

    // Fetch initial history entries
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
          setError(null);
        } else {
          const errorText = await response.text();
          console.error(
            "[History] Fetch error:",
            response.status,
            errorText,
          );
          setError(
            `Failed to load history (${response.status}). Please try again.`,
          );
        }
      } catch (error) {
        console.error("[History] Error fetching history:", error);
        setError(
          "Failed to load history. Please check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();

    // Listen for real-time updates when new lines are claimed
    const handleClaimedTodayUpdated = () => {
      console.log("[History] Claimed today updated, refreshing history");
      fetchHistory();
    };

    socket.on("claimed-today-updated", handleClaimedTodayUpdated);

    return () => {
      socket.off("claimed-today-updated", handleClaimedTodayUpdated);
      socket.disconnect();
    };
  }, [token]);

  // Filter entries based on search (searches ALL entries, not just current page)
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredEntries(entries);
    } else {
      const filtered = entries.filter((entry) =>
        entry.content.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredEntries(filtered);
    }
    // Reset to first page when search query changes
    setCurrentPage(1);
  }, [searchQuery, entries]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredEntries.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEntries = filteredEntries.slice(startIndex, endIndex);

  // Generate pagination numbers (show max 5 page buttons)
  const getPaginationNumbers = () => {
    const maxButtons = 5;
    const pages: (number | string)[] = [];

    if (totalPages <= maxButtons) {
      // Show all pages if total is less than or equal to maxButtons
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    // Calculate range around current page
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Adjust if we're at the beginning
    if (currentPage <= 2) {
      endPage = Math.min(totalPages - 1, 4);
    }

    // Adjust if we're at the end
    if (currentPage >= totalPages - 1) {
      startPage = Math.max(2, totalPages - 3);
    }

    // Add ellipsis if needed
    if (startPage > 2) {
      pages.push("...");
    }

    // Add page range
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis if needed
    if (endPage < totalPages - 1) {
      pages.push("...");
    }

    // Always show last page
    pages.push(totalPages);

    return pages;
  };

  return (
    <Layout>
      <div className="min-h-screen p-6 md:p-8 bg-transparent">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">History</h1>
            </div>
            <p className="text-muted-foreground">
              Track and search claimed numbers with filters and timestamps
            </p>
          </div>

          {/* Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Total Entries
              </div>
              <div className="text-3xl font-bold text-foreground">
                {entries.length}
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Today's Entries
              </div>
              <div className="text-3xl font-bold text-foreground">
                {
                  entries.filter((e) => {
                    const today = new Date();
                    const entryDate = new Date(e.claimedAt);
                    return entryDate.toDateString() === today.toDateString();
                  }).length
                }
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Searched Results
              </div>
              <div className="text-3xl font-bold text-foreground">
                {filteredEntries.length}
              </div>
            </Card>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search history entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive"
            >
              <p className="font-medium">Error</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Content */}
          {loading ? (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                Loading history...
              </div>
            </Card>
          ) : filteredEntries.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No entries match your search"
                    : "No history entries yet"}
                </p>
              </div>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedEntries.map((entry) => (
                  <Card
                    key={entry._id}
                    className="p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">
                          {entry.content}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Claimed by: {entry.claimedBy}
                        </p>
                      </div>
                      <div className="text-sm text-muted-foreground whitespace-nowrap">
                        {formatDateTime(entry.claimedAt)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, filteredEntries.length)} of{" "}
                    {filteredEntries.length} results
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {getPaginationNumbers().map((page, idx) => (
                      <div key={idx}>
                        {page === "..." ? (
                          <span className="px-2 py-1 text-sm text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            variant={
                              currentPage === page ? "default" : "outline"
                            }
                            size="sm"
                            onClick={() => setCurrentPage(page as number)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
