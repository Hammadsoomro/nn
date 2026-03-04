import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import type { User, AuthResponse, UserRole } from "@shared/api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error("Failed to restore auth:", error);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (text.trim().startsWith("<!DOCTYPE")) {
          throw new Error("API configuration error: Redirected to SPA. Please check Netlify settings.");
        }
        throw new Error(`Server returned unexpected format: ${contentType || "unknown"}`);
      }

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      const authData: AuthResponse = data;
      setToken(authData.token);
      setUser(authData.user);

      localStorage.setItem("token", authData.token);
      localStorage.setItem("user", JSON.stringify(authData.user));
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, name }),
        });

        let data;
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          const text = await response.text();
          if (text.trim().startsWith("<!DOCTYPE")) {
            throw new Error("API configuration error: Redirected to SPA. Please check Netlify settings.");
          }
          throw new Error(`Server returned unexpected format: ${contentType || "unknown"}`);
        }

        if (!response.ok) {
          throw new Error(data.error || "Signup failed");
        }

        const authData: AuthResponse = data;
        setToken(authData.token);
        setUser(authData.user);

        localStorage.setItem("token", authData.token);
        localStorage.setItem("user", JSON.stringify(authData.user));
      } catch (error) {
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  const value: AuthContextType = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      signup,
      logout,
      isAuthenticated: !!user && !!token,
      isAdmin: user?.role === "admin",
    }),
    [user, token, isLoading, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
