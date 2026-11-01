// Copies the web page and the engine into site/ and bundles rules/*.json into site/rules.json. No bundler, no dependencies.
import { cpSync, mkdirSync, rmSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileRules } from "../engine/index.js";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "site");
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(join(root, "web"), out, { recursive: true });
cpSync(join(root, "engine"), join(out, "engine"), { recursive: true });
const dir = join(root, "rules");
const list = readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
compileRules(list); // refuses to build if any rule is invalid
// The page only needs what it shows; the examples stay in the repo for the tests.
const slim = list.map(({ examples, safe, ...r }) => r);
writeFileSync(join(out, "rules.json"), JSON.stringify(slim));
for (const f of ["index.html", "app.js", "style.css", "engine/index.js", "sw.js", "rules.json"]) {
  if (!existsSync(join(out, f))) { console.error("Build is missing " + f); process.exit(1); }
}
console.log(`Built site/ with ${list.length} rules ->`, out);
