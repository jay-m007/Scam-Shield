import { analyzeLinks, flagInfo } from "./links.js";
import { CATEGORIES } from "./rules.js";
import { adviceFor } from "./advice.js";

export const MAX_CHARS = 5000;
export const LEVELS = {
  clear: "No known scam signs",
  careful: "Be careful",
  scam: "Likely a scam",
};
const K = 70; // higher = signs add up more slowly

function windowAround(t, start, end) {
  let before = t.slice(Math.max(0, start - 40), start);
  const cut = Math.max(before.lastIndexOf("."), before.lastIndexOf("!"), before.lastIndexOf("?"), before.lastIndexOf("\n"));
  before = before.slice(cut + 1);
  let after = t.slice(end, end + 25);
  const stop = after.search(/[.!?\n]/);
  if (stop !== -1) after = after.slice(0, stop);
  return before + t.slice(start, end) + after;
}

function findMatches(t, rule) {
  const found = [];
  for (const re of rule.res) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(t)) !== null) {
      if (m[0].length === 0) { re.lastIndex++; continue; }
      const start = m.index, end = m.index + m[0].length;
      if (!(rule.ignore && rule.ignore.test(windowAround(t, start, end)))) found.push({ start, end });
      if (found.length >= 6) return found;
    }
  }
  return found;
}

function mergeSpans(spans) {
  const s = spans.slice().sort((a, b) => a.start - b.start || b.end - a.end);
  const out = [];
  for (const x of s) {
    const last = out[out.length - 1];
    if (last && x.start <= last.end) last.end = Math.max(last.end, x.end);
    else out.push({ start: x.start, end: x.end });
  }
  return out;
}

// rules: the compiled list from compileRules(). Returns everything the screen needs.
export function analyze(text, rules) {
  const t = String(text == null ? "" : text).slice(0, MAX_CHARS);
  if (t.trim().length < 12) return { level: "empty", score: 0, label: "", text: t, findings: [], links: [], highlights: [], advice: [] };
  const findings = [];
  for (const r of rules) {
    const matches = findMatches(t, r);
    if (matches.length) findings.push({ id: r.id, title: r.title, category: r.category, weight: r.weight, why: r.why, matches });
  }
  const links = analyzeLinks(t);
  const linkFlags = new Map();
  for (const l of links) for (const f of l.flags) {
    const info = flagInfo(f);
    const cur = linkFlags.get(f);
    if (!cur) linkFlags.set(f, { id: f, title: info.title, category: "links", weight: info.weight, why: info.why, matches: [{ start: l.start, end: l.end }] });
    else cur.matches.push({ start: l.start, end: l.end });
  }
  const all = findings.concat([...linkFlags.values()]);
  all.sort((a, b) => b.weight - a.weight);
  let keep = 1;
  for (const f of all) keep *= 1 - Math.min(f.weight, 69) / K;
  const score = Math.round(100 * (1 - keep));
  const level = score >= 45 ? "scam" : score >= 20 ? "careful" : "clear";
  const highlights = mergeSpans(all.flatMap((f) => f.matches));
  return { level, score, label: LEVELS[level], text: t, findings: all, links, highlights, advice: adviceFor(all) };
}

export function categoryLabel(c) { return c === "links" ? "Suspicious link" : CATEGORIES[c] || c; }
