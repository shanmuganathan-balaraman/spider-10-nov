import { config } from "../config";

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

const logLevelMap: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

interface Logger {
  debug: (message: string, ...args: any[]) => void;
  info: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
}

/**
 * Create a logger instance for a specific module
 */
export function createLogger(module: string): Logger {
  const level = logLevelMap[config.logLevel as keyof typeof logLevelMap] || LogLevel.INFO;

  const shouldLog = (logLevel: LogLevel): boolean => {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(level);
    const messageLevelIndex = levels.indexOf(logLevel);
    return messageLevelIndex >= currentLevelIndex;
  };

  const formatMessage = (logLevel: LogLevel, message: string): string => {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${logLevel}] [${module}] ${message}`;
  };

  return {
    debug: (message: string, ...args: any[]): void => {
      if (shouldLog(LogLevel.DEBUG)) {
        console.log(formatMessage(LogLevel.DEBUG, message), ...args);
      }
    },

    info: (message: string, ...args: any[]): void => {
      if (shouldLog(LogLevel.INFO)) {
        console.log(formatMessage(LogLevel.INFO, message), ...args);
      }
    },

    warn: (message: string, ...args: any[]): void => {
      if (shouldLog(LogLevel.WARN)) {
        console.warn(formatMessage(LogLevel.WARN, message), ...args);
      }
    },

    error: (message: string, ...args: any[]): void => {
      if (shouldLog(LogLevel.ERROR)) {
        console.error(formatMessage(LogLevel.ERROR, message), ...args);
      }
    },
  };
}
