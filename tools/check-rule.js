// Try a new rule before you open a pull request:  npm run check-rule rules/my-rule.json
import { readFileSync } from "node:fs";
import { validateRule, compileRules, analyze } from "../engine/index.js";
const file = process.argv[2];
if (!file) { console.error("Usage: npm run check-rule rules/<your-rule>.json"); process.exit(1); }
const rule = JSON.parse(readFileSync(file, "utf8"));
const problems = validateRule(rule);
if (problems.length) { console.error("Problems:\n- " + problems.join("\n- ")); process.exit(1); }
const [c] = compileRules([rule]);
let bad = 0;
for (const ex of rule.examples) { const ok = analyze(ex, [c]).findings.length > 0; if (!ok) bad++; console.log((ok ? "ok   " : "MISS ") + "example: " + ex); }
for (const s of rule.safe) { const ok = analyze(s, [c]).findings.length === 0; if (!ok) bad++; console.log((ok ? "ok   " : "FALSE ALARM ") + "safe:    " + s); }
console.log(bad ? `\n${bad} problem(s). Fix the rule and run this again.` : "\nLooks good. Now run: npm test");
process.exit(bad ? 1 : 0);
