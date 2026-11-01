import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, validateRule, compileRules } from "../engine/index.js";
import { loadRuleFiles } from "./helpers.js";

const files = loadRuleFiles();

test("there are rule files", () => assert.ok(files.length >= 20));

test("every rule file is valid and named after its id", () => {
  const seen = new Set();
  for (const { file, rule } of files) {
    assert.deepEqual(validateRule(rule), [], file);
    assert.equal(file, rule.id + ".json", "file name must be <id>.json");
    assert.ok(!seen.has(rule.id), "duplicate id " + rule.id);
    seen.add(rule.id);
  }
});

for (const { rule } of files) {
  test(`rule ${rule.id}: its examples trigger it and its safe messages do not`, () => {
    const [compiled] = compileRules([rule]);
    for (const ex of rule.examples) {
      const r = analyze(ex, [compiled]);
      assert.ok(r.findings.some((f) => f.id === rule.id), "should trigger: " + ex);
    }
    for (const s of rule.safe) {
      const r = analyze(s, [compiled]);
      assert.ok(!r.findings.some((f) => f.id === rule.id), "should NOT trigger: " + s);
    }
  });
}

test("a bad rule is rejected with clear reasons", () => {
  const bad = { id: "Bad Id", title: "x", category: "nope", weight: 99, why: "short", patterns: ["("], examples: ["a"], safe: [] };
  const problems = validateRule(bad);
  assert.ok(problems.length >= 6);
  assert.throws(() => compileRules([bad]), /Bad Id/);
});

test("a pattern that matches an empty message is rejected", () => {
  const r = { ...files[0].rule, patterns: ["x*y*"] };
  assert.ok(validateRule(r).some((p) => /empty/.test(p)));
});

test("rules stay fast on hostile input (no catastrophic backtracking)", () => {
  const compiled = compileRules(files.map((f) => f.rule));
  const nasty = [
    "a ".repeat(2500), "share ".repeat(800), "otp ".repeat(1200), "account ".repeat(600) + "will be",
    "kyc " + "pending ".repeat(600), ("a".repeat(30) + " ").repeat(150), "!".repeat(5000), "1".repeat(5000),
    "http://" + "a.".repeat(2000), ("do not " + "x ".repeat(5)).repeat(300),
  ];
  for (const s of nasty) {
    const t0 = performance.now();
    analyze(s, compiled);
    const ms = performance.now() - t0;
    assert.ok(ms < 400, `took ${Math.round(ms)}ms on ${s.slice(0, 20)}...`);
  }
});

test("slim rules (as published in rules.json) compile without examples", () => {
  const { examples, safe, ...slim } = files[0].rule;
  assert.equal(compileRules([slim], { slim: true }).length, 1);
  assert.throws(() => compileRules([slim]), /examples/);
});
