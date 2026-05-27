import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const args = new Map();
for (let i = 2; i < process.argv.length; i += 1) {
  const arg = process.argv[i];
  if (!arg.startsWith("--")) continue;
  const [key, inlineValue] = arg.slice(2).split("=", 2);
  const next = process.argv[i + 1];
  const value = inlineValue ?? (next?.startsWith("--") ? undefined : next);
  args.set(key, value ?? "true");
  if (inlineValue === undefined && value === next) i += 1;
}

const baseUrl = normalizeBaseUrl(args.get("base-url") ?? "http://localhost:5173");
const sourcePath = resolve(root, args.get("source") ?? "public/manifest.json");
const outputPath = resolve(root, args.get("output") ?? "public/manifest.dev.json");

const manifest = JSON.parse(await readFile(sourcePath, "utf8"));
const devManifest = withAbsoluteUrls(manifest, baseUrl);

await writeFile(outputPath, `${JSON.stringify(devManifest, null, 2)}\n`, "utf8");
console.log(`Wrote ${relativeToRoot(outputPath)} for ${baseUrl}`);

function withAbsoluteUrls(manifest, baseUrl) {
  return {
    ...manifest,
    name: `${manifest.name} DEV`,
    icon: toAbsoluteUrl(manifest.icon, baseUrl),
    background_url: toAbsoluteUrl(manifest.background_url, baseUrl),
    action: {
      ...manifest.action,
      icon: toAbsoluteUrl(manifest.action.icon, baseUrl),
      popover: toAbsoluteUrl(manifest.action.popover, baseUrl),
    },
  };
}

function toAbsoluteUrl(value, baseUrl) {
  if (typeof value !== "string" || value === "") return value;
  if (/^https?:\/\//u.test(value)) return value;
  return `${baseUrl}/${value.replace(/^\/+/u, "")}`;
}

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/u, "");
}

function relativeToRoot(path) {
  return path.startsWith(root) ? path.slice(root.length + 1) : path;
}
