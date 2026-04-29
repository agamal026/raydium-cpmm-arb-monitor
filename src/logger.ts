import type { LogLevel } from "./types.js";

const severity: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

export class Logger {
  constructor(private readonly level: LogLevel, private readonly jsonMode = false) {}

  debug(message: string, fields: Record<string, unknown> = {}) { this.emit("debug", message, fields); }
  info(message: string, fields: Record<string, unknown> = {}) { this.emit("info", message, fields); }
  warn(message: string, fields: Record<string, unknown> = {}) { this.emit("warn", message, fields); }
  error(message: string, fields: Record<string, unknown> = {}) { this.emit("error", message, fields); }

  private emit(level: LogLevel, message: string, fields: Record<string, unknown>): void {
    if (severity[level] < severity[this.level]) return;
    const row = { ts: new Date().toISOString(), level, message, ...fields };
    const line = JSON.stringify(row);
    if (this.jsonMode) {
      console.error(line);
    } else if (level === "error" || level === "warn") {
      console.error(line);
    } else {
      console.error(line);
    }
  }
}
