import { spawn } from "node:child_process";

const command = process.argv[2];
if (!new Set(["dev", "build", "start"]).has(command)) {
  console.error("Usage: node scripts/run-vinext.mjs <dev|build|start>");
  process.exit(1);
}

const isWindows = process.platform === "win32";
const executable = isWindows ? "node_modules\\.bin\\vinext.cmd" : "node_modules/.bin/vinext";
const launcher = isWindows ? (process.env.ComSpec || "cmd.exe") : executable;
const args = isWindows ? ["/d", "/s", "/c", executable, command] : [command];

const child = spawn(launcher, args, {
  stdio: "inherit",
  env: { ...process.env, WRANGLER_LOG_PATH: ".wrangler/wrangler.log" },
  shell: false,
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code) => process.exit(code ?? 1));
