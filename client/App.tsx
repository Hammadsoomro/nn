import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";

// Lazy load components for performance
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NumbersSorter = lazy(() => import("./pages/NumbersSorter"));
const NumbersInbox = lazy(() => import("./pages/NumbersInbox"));
const QueuedList = lazy(() => import("./pages/QueuedList"));
const History = lazy(() => import("./pages/History"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <ThemeProvider>
        <AuthProvider>
          <SocketProvider>
            <ErrorBoundary>
                <BrowserRouter>
                  <Suspense fallback={<PageLoader />}>
                    <Routes>
                      {/* Public Routes */}
                      <Route path="/login" element={<Login />} />
                      <Route path="/signup" element={<Signup />} />

                      {/* Protected Routes */}
                      <Route
                        path="/dashboard"
                        element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        }
                      />

                      {/* Admin Only Routes */}
                      <Route
                        path="/sorter"
                        element={
                          <ProtectedRoute adminOnly>
                            <NumbersSorter />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/queued"
                        element={
                          <ProtectedRoute adminOnly>
                            <QueuedList />
                          </ProtectedRoute>
                        }
                      />

                      {/* Member Routes */}
                      <Route
                        path="/inbox"
                        element={
                          <ProtectedRoute>
                            <NumbersInbox />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/history"
                        element={
                          <ProtectedRoute>
                            <History />
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/settings"
                        element={
                          <ProtectedRoute>
                            <Settings />
                          </ProtectedRoute>
                        }
                      />

                      {/* Catch All */}
                      <Route
                        path="/"
                        element={<Navigate to="/dashboard" replace />}
                      />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </Suspense>
                </BrowserRouter>
              </ErrorBoundary>
          </SocketProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

// Store root globally to prevent createRoot from being called multiple times during HMR
declare global {
  interface Window {
    __reactRoot?: ReturnType<typeof createRoot>;
  }
}

const rootElement = document.getElementById("root");
if (rootElement) {
  if (!window.__reactRoot) {
    window.__reactRoot = createRoot(rootElement);
  }
  window.__reactRoot.render(<App />);
}
