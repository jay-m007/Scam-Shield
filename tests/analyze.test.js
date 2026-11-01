import { test } from "node:test";
import assert from "node:assert/strict";
import { analyze, LEVELS } from "../engine/index.js";
import { rules, corpus } from "./helpers.js";

const R = rules();
const c = corpus();

test("every scam in the corpus is called a likely scam", () => {
  const wrong = c.scam.map((t) => [analyze(t, R), t]).filter(([r]) => r.level !== "scam").map(([r, t]) => `${r.level}/${r.score}: ${t.slice(0, 70)}`);
  assert.deepEqual(wrong, []);
});

test("no genuine message in the corpus is flagged, not even as 'be careful'", () => {
  const wrong = c.legit.map((t) => [analyze(t, R), t]).filter(([r]) => r.level !== "clear").map(([r, t]) => `${r.level}/${r.score} [${r.findings.map((f) => f.id)}]: ${t.slice(0, 70)}`);
  assert.deepEqual(wrong, []);
});

test("empty and very short input gives no verdict", () => {
  for (const t of ["", "   ", "hi", null, undefined]) assert.equal(analyze(t, R).level, "empty");
});

test("labels match the levels", () => {
  const r = analyze(c.scam[0], R);
  assert.equal(r.label, LEVELS.scam);
});

test("score is 0-100 and adding more signs never lowers it", () => {
  const a = analyze("Your KYC is pending, account will be blocked. Click http://x.com now", R);
  const b = analyze("Your KYC is pending, account will be blocked. Click http://sbi-kyc.xyz now and share the OTP", R);
  assert.ok(a.score >= 0 && b.score <= 100);
  assert.ok(b.score >= a.score);
});

test("highlights are sorted, inside the text and never overlap", () => {
  for (const t of c.scam) {
    const r = analyze(t, R);
    assert.ok(r.highlights.length > 0, t);
    let prev = 0;
    for (const h of r.highlights) {
      assert.ok(h.start >= prev && h.end > h.start && h.end <= r.text.length);
      prev = h.end;
    }
  }
});

test("advice is given for what was found and nothing for clean messages", () => {
  assert.ok(analyze(c.scam[3], R).advice.length >= 1);
  assert.equal(analyze(c.legit[0], R).advice.length, 0);
});

test("input is capped so a huge paste cannot freeze the page", () => {
  const r = analyze("a".repeat(100000) + " kyc pending", R);
  assert.ok(r.text.length <= 5000);
});

test("negated warnings are not treated as requests", () => {
  assert.equal(analyze("Please do not share your OTP with anyone. It is valid for 5 minutes only.", R).level, "clear");
  assert.equal(analyze("Please do not delay, share your OTP right now so we can verify you.", R).level, "scam");
});

test("Hindi and Hinglish scam text is caught", () => {
  assert.notEqual(analyze("Sir aapka account block ho jayega, OTP batao abhi turant.", R).level, "clear");
});
