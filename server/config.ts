/**
 * Server configuration and environment validation
 * Validates critical environment variables at startup
 */

import { createLogger } from "./logger";

const logger = createLogger("Config");

interface ServerConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  mongodbUri: string;
  jwtSecret: string;
  frontendUrl: string;
}

/**
 * Validates all required environment variables at server startup
 * Fails fast with clear error messages if any required variable is missing
 */
export const validateEnvironment = (): ServerConfig => {
  const errors: string[] = [];

  // Required environment variables
  const mongodbUri = process.env.MONGODB_URI;
  if (!mongodbUri || mongodbUri.trim() === "") {
    errors.push("MONGODB_URI environment variable is not set");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim() === "") {
    errors.push(
      "JWT_SECRET environment variable is not set (required for authentication)",
    );
  }

  if (jwtSecret && jwtSecret.length < 32) {
    errors.push(
      "JWT_SECRET must be at least 32 characters long for production security",
    );
  }

  // Optional but recommended
  const frontendUrl = process.env.FRONTEND_URL;
  if (!frontendUrl && process.env.NODE_ENV === "production") {
    logger.warn(
      "FRONTEND_URL is not set in production - CORS may not work correctly",
    );
  }

  // Fail fast if critical variables are missing
  if (errors.length > 0) {
    const errorMessage = [
      "",
      "❌ ENVIRONMENT CONFIGURATION ERROR",
      "=" * 50,
      ...errors.map((e) => `  • ${e}`),
      "=" * 50,
      "",
      "Please set the missing environment variables and restart the server.",
      "",
    ].join("\n");

    logger.error(errorMessage);
    process.exit(1);
  }

  const config: ServerConfig = {
    port: parseInt(process.env.PORT || "3000", 10),
    nodeEnv: (process.env.NODE_ENV || "development") as
      | "development"
      | "production"
      | "test",
    mongodbUri: mongodbUri!,
    jwtSecret: jwtSecret!,
    frontendUrl: frontendUrl || "http://localhost:8080",
  };

  logger.info("✓ Environment configuration validated successfully");

  return config;
};

let cachedConfig: ServerConfig | null = null;

/**
 * Get the validated server configuration
 * Caches the result to avoid re-validation
 */
export const getConfig = (): ServerConfig => {
  if (!cachedConfig) {
    cachedConfig = validateEnvironment();
  }
  return cachedConfig;
};

/**
 * Get JWT secret safely - guaranteed to be set after validateEnvironment()
 */
export const getJwtSecret = (): string => {
  const config = getConfig();
  return config.jwtSecret;
};

/**
 * Get MongoDB URI safely
 */
export const getMongodbUri = (): string => {
  const config = getConfig();
  return config.mongodbUri;
};

/**
 * Check if running in production
 */
export const isProduction = (): boolean => {
  return getConfig().nodeEnv === "production";
};

/**
 * Check if running in development
 */
export const isDevelopment = (): boolean => {
  return getConfig().nodeEnv === "development";
};
