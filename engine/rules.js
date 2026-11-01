// Rule files live in rules/*.json, one scam pattern per file. This module checks them and turns them into regexes.
export const CATEGORIES = {
  credentials: "Asks for secrets",
  impersonation: "Pretends to be someone you trust",
  money: "Money trick",
  pressure: "Pressure tactic",
  malware: "Tries to take control of your phone",
  lure: "Too-good-to-be-true offer",
  threat: "Threat or blackmail",
};

const ID = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// Returns a list of problems (empty list = the rule is fine).
export function validateRule(r, opts = {}) {
  const bad = [];
  if (!r || typeof r !== "object" || Array.isArray(r)) return ["rule must be an object"];
  const slim = !!opts.slim; // the published rules.json leaves out the examples; the repo files always have them
  const allowed = new Set(["id", "title", "category", "weight", "patterns", "ignoreIf", "why", "examples", "safe"]);
  for (const k of Object.keys(r)) if (!allowed.has(k)) bad.push(`unknown field "${k}"`);
  if (typeof r.id !== "string" || r.id.length < 2 || r.id.length > 40 || !ID.test(r.id)) bad.push("id must be lowercase words joined by hyphens, 2-40 characters");
  if (typeof r.title !== "string" || r.title.length < 3 || r.title.length > 60) bad.push("title must be 3-60 characters");
  if (!Object.hasOwn(CATEGORIES, r.category)) bad.push("category must be one of: " + Object.keys(CATEGORIES).join(", "));
  if (!Number.isInteger(r.weight) || r.weight < 5 || r.weight > 45) bad.push("weight must be a whole number from 5 to 45");
  if (typeof r.why !== "string" || r.why.length < 20 || r.why.length > 300) bad.push("why must be 20-300 characters and explain the trick in plain words");
  if (!Array.isArray(r.patterns) || r.patterns.length < 1 || r.patterns.length > 8) bad.push("patterns must be a list of 1-8 regular expressions");
  else {
    r.patterns.forEach((p, i) => {
      if (typeof p !== "string" || p.length < 3 || p.length > 500) return bad.push(`patterns[${i}] must be a string of 3-500 characters`);
      let re;
      try { re = new RegExp(p, "i"); } catch (e) { return bad.push(`patterns[${i}] is not a valid regular expression: ${e.message}`); }
      if (re.test("")) bad.push(`patterns[${i}] matches an empty message`);
    });
  }
  if (r.ignoreIf !== undefined) {
    if (typeof r.ignoreIf !== "string" || r.ignoreIf.length > 500) bad.push("ignoreIf must be a regular expression string of at most 500 characters");
    else { try { new RegExp(r.ignoreIf, "i"); } catch (e) { bad.push("ignoreIf is not a valid regular expression: " + e.message); } }
  }
  const list = (name, min, max) => {
    const v = r[name];
    if (!Array.isArray(v) || v.length < min || v.length > max || v.some((s) => typeof s !== "string" || s.length < 3 || s.length > 600)) bad.push(`${name} must be a list of ${min}-${max} messages (3-600 characters each)`);
  };
  if (!slim) { list("examples", 2, 10); list("safe", 1, 10); }
  return bad;
}

export function compileRule(r) {
  return {
    id: r.id, title: r.title, category: r.category, weight: r.weight, why: r.why,
    res: r.patterns.map((p) => new RegExp(p, "gi")),
    ignore: r.ignoreIf ? new RegExp(r.ignoreIf, "i") : null,
  };
}

export function compileRules(list, opts = {}) {
  const seen = new Set();
  return list.map((r) => {
    const bad = validateRule(r, opts);
    if (bad.length) throw new Error(`Rule "${r && r.id}": ${bad.join("; ")}`);
    if (seen.has(r.id)) throw new Error(`Duplicate rule id "${r.id}"`);
    seen.add(r.id);
    return compileRule(r);
  });
}
