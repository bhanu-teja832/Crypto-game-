type Level = "info" | "warn" | "error" | "debug";

function fmt(level: Level, tag: string, msg: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase().padEnd(5)}] [${tag}] ${msg}`;
}

export const logger = {
  info: (tag: string, msg: string) => console.log(fmt("info", tag, msg)),
  warn: (tag: string, msg: string) => console.warn(fmt("warn", tag, msg)),
  error: (tag: string, msg: string, err?: unknown) => {
    console.error(fmt("error", tag, msg));
    if (err) console.error(err);
  },
  debug: (tag: string, msg: string) => {
    if (process.env.DEBUG) console.debug(fmt("debug", tag, msg));
  },
};
