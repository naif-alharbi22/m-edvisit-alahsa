// Copies static assets next to the standalone server so `npm start` serves them
// (the Docker image does the same in its runtime stage).
import { cpSync, existsSync, rmSync } from "node:fs";

const standalone = ".next/standalone";
if (!existsSync(standalone)) {
  console.error("No standalone output found — run `next build` first.");
  process.exit(1);
}
cpSync("public", `${standalone}/public`, { recursive: true });
cpSync(".next/static", `${standalone}/.next/static`, { recursive: true });
// Never ship local env files inside the build output.
for (const f of [".env", ".env.local", ".env.production"]) rmSync(`${standalone}/${f}`, { force: true });
console.log("Standalone output ready: node .next/standalone/server.js");
