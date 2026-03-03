/**
 * Production-grade logger for server-side logging
 * Automatically gates logs based on NODE_ENV and log level
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (message: string, data?: any) => void;
  info: (message: string, data?: any) => void;
  warn: (message: string, data?: any) => void;
  error: (message: string, error?: any) => void;
}

const isProduction = process.env.NODE_ENV === "production";
const isDevelopment = process.env.NODE_ENV === "development";

// Only show debug logs in development
const shouldLog = (level: LogLevel): boolean => {
  if (level === "debug") return isDevelopment;
  if (level === "info") return !isProduction;
  return true; // Always log warn and error
};

const formatTimestamp = (): string => {
  return new Date().toISOString();
};

const createLogger = (namespace: string): Logger => ({
  debug: (message: string, data?: any) => {
    if (shouldLog("debug")) {
      console.debug(
        `[${formatTimestamp()}] [${namespace}] DEBUG: ${message}`,
        data || "",
      );
    }
  },
  info: (message: string, data?: any) => {
    if (shouldLog("info")) {
      console.log(
        `[${formatTimestamp()}] [${namespace}] INFO: ${message}`,
        data || "",
      );
    }
  },
  warn: (message: string, data?: any) => {
    if (shouldLog("warn")) {
      console.warn(
        `[${formatTimestamp()}] [${namespace}] WARN: ${message}`,
        data || "",
      );
    }
  },
  error: (message: string, error?: any) => {
    console.error(
      `[${formatTimestamp()}] [${namespace}] ERROR: ${message}`,
      error || "",
    );
  },
});

export { createLogger };
export type { Logger };
