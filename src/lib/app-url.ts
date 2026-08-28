import "server-only";

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}
