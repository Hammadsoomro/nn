/**
 * Production-grade logger for client-side logging
 * Automatically gates logs based on environment and log level
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (message: string, ...data: any[]) => void;
  info: (message: string, ...data: any[]) => void;
  warn: (message: string, ...data: any[]) => void;
  error: (message: string, ...data: any[]) => void;
}

const isProduction = import.meta.env.PROD;
const isDevelopment = import.meta.env.DEV;

// Only show debug logs in development
const shouldLog = (level: LogLevel): boolean => {
  if (level === "debug") return isDevelopment;
  if (level === "info") return !isProduction;
  return true; // Always log warn and error
};

const formatTimestamp = (): string => {
  return new Date().toLocaleTimeString();
};

const createLogger = (namespace: string): Logger => ({
  debug: (message: string, ...data: any[]) => {
    if (shouldLog("debug")) {
      console.debug(
        `[${formatTimestamp()}] [${namespace}] DEBUG: ${message}`,
        ...data,
      );
    }
  },
  info: (message: string, ...data: any[]) => {
    if (shouldLog("info")) {
      console.log(
        `[${formatTimestamp()}] [${namespace}] INFO: ${message}`,
        ...data,
      );
    }
  },
  warn: (message: string, ...data: any[]) => {
    if (shouldLog("warn")) {
      console.warn(
        `[${formatTimestamp()}] [${namespace}] WARN: ${message}`,
        ...data,
      );
    }
  },
  error: (message: string, ...data: any[]) => {
    console.error(
      `[${formatTimestamp()}] [${namespace}] ERROR: ${message}`,
      ...data,
    );
  },
});

export { createLogger };
export type { Logger };
