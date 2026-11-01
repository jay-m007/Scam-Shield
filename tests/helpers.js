import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compileRules } from "../engine/index.js";
const here = dirname(fileURLToPath(import.meta.url));
export const rulesDir = join(here, "..", "rules");
export function loadRuleFiles() {
  return readdirSync(rulesDir).filter((f) => f.endsWith(".json")).sort().map((f) => ({ file: f, rule: JSON.parse(readFileSync(join(rulesDir, f), "utf8")) }));
}
export const rules = () => compileRules(loadRuleFiles().map((x) => x.rule));
export const corpus = () => JSON.parse(readFileSync(join(here, "corpus.json"), "utf8"));
