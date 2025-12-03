import { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { List, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { io, Socket } from "socket.io-client";
import type { QueuedLine } from "@shared/api";

const ITEMS_PER_PAGE = 100;

export default function QueuedList() {
  const { token, isAdmin } = useAuth();
  const [lines, setLines] = useState<QueuedLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

    // Fetch initial queued lines
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
          setError(null);
        } else {
          const errorText = await response.text();
          console.error(
            "[QueuedList] Fetch error:",
            response.status,
            errorText,
          );
          setError(
            `Failed to load queued lines (${response.status}). Please try again.`,
          );
        }
      } catch (error) {
        console.error("[QueuedList] Error fetching queued lines:", error);
        setError(
          "Failed to load queued lines. Please check your connection and try again.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchQueued();

    // Listen for real-time updates
    const handleLinesQueued = (data: { count: number }) => {
      console.log("[QueuedList] Lines queued updated:", data.count);
      // Re-fetch the list to get the updated data
      fetchQueued();
    };

    socket.on("lines-queued-updated", handleLinesQueued);

    return () => {
      socket.off("lines-queued-updated", handleLinesQueued);
      socket.disconnect();
    };
  }, [token]);

  // Reset to first page when lines change
  useEffect(() => {
    setCurrentPage(1);
  }, [lines]);

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

  // Calculate pagination
  const totalPages = Math.ceil(lines.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedLines = lines.slice(startIndex, endIndex);

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
              <List className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">
                Queued List
              </h1>
            </div>
            <p className="text-muted-foreground">
              View and manage numbers waiting to be claimed by team members
            </p>
          </div>

          {/* Stats Card */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Total in Queue
              </div>
              <div className="text-3xl font-bold text-foreground">
                {lines.length}
              </div>
            </Card>
            <Card className="p-6">
              <div className="text-sm text-muted-foreground mb-1">
                Waiting to Claim
              </div>
              <div className="text-3xl font-bold text-primary">
                {lines.length}
              </div>
            </Card>
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
                Loading queued lines...
              </div>
            </Card>
          ) : lines.length === 0 ? (
            <Card className="p-8">
              <div className="text-center">
                <List className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-muted-foreground">No items in queue</p>
              </div>
            </Card>
          ) : (
            <>
              <div className="space-y-3">
                {paginatedLines.map((line, index) => (
                  <Card
                    key={line._id}
                    className="p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-semibold flex-shrink-0">
                          {startIndex + index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground text-lg">
                            {line.content}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Added by: {line.addedBy}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            {formatDateTime(line.addedAt)}
                          </p>
                        </div>
                      </div>
                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteLine(line._id)}
                          disabled={deletingId === line._id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {deletingId === line._id ? "Deleting..." : "Delete"}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to{" "}
                    {Math.min(endIndex, lines.length)} of {lines.length} results
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
