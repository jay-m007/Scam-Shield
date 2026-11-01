import { test } from "node:test";
import assert from "node:assert/strict";
import { analyzeLinks, defang, registrable } from "../engine/index.js";

const flags = (t) => analyzeLinks(t).flatMap((l) => l.flags);

test("a real bank link is not flagged as a look-alike", () => {
  assert.deepEqual(flags("Pay at https://www.hdfcbank.com/personal/pay"), []);
  assert.deepEqual(flags("Open https://onlinesbi.sbi/ now"), []);
  assert.deepEqual(flags("See https://www.incometax.gov.in/iec/foportal"), []);
});

test("a look-alike of a bank is flagged", () => {
  assert.ok(flags("http://sbi-kyc-update.xyz/login").includes("link-lookalike"));
  assert.ok(flags("https://hdfcbank.com.verify-now.top/x").includes("link-lookalike"));
  assert.ok(flags("https://paytm-kyc.in").includes("link-lookalike"));
});

test("real sub-domains of a real company are fine", () => {
  assert.ok(!flags("https://netbanking.hdfcbank.com/netbanking").includes("link-lookalike"));
  assert.ok(!flags("https://aws.amazon.com/").includes("link-lookalike"));
});

test("raw IP, punycode, apk, shortener, userinfo and risky endings are flagged", () => {
  assert.ok(flags("http://192.168.4.20/pay").includes("link-ip"));
  assert.ok(flags("https://xn--sbi-5ma.com/login").includes("link-punycode"));
  assert.ok(flags("https://files.example.com/KYC.apk").includes("link-apk"));
  assert.ok(flags("bit.ly/3xYz12").includes("link-shortener"));
  assert.ok(flags("https://sbi.co.in@evil.example.com/login").includes("link-userinfo"));
  assert.ok(flags("https://free-gift.top").includes("link-risky-tld"));
  assert.ok(flags("http://example.com/a").includes("link-http"));
});

test("email addresses are not mistaken for links", () => {
  assert.deepEqual(analyzeLinks("Write to help@example.com for support"), []);
});

test("positions point at the link text", () => {
  const t = "Go to http://bad-site.xyz/a now";
  const [l] = analyzeLinks(t);
  assert.equal(t.slice(l.start, l.end), "http://bad-site.xyz/a");
});

test("links are shown defanged so they cannot be tapped", () => {
  assert.equal(defang("https://bad.example.com/x"), "hxxps://bad[.]example[.]com/x");
  const [l] = analyzeLinks("http://sbi-kyc.xyz");
  assert.ok(!l.safe.includes("http://") && !/\w\.\w/.test(l.safe));
});

test("registrable domain handles two-part endings", () => {
  assert.equal(registrable("a.b.sbi.co.in"), "sbi.co.in");
  assert.equal(registrable("www.example.com"), "example.com");
});

test("trailing punctuation is not part of the link", () => {
  const [l] = analyzeLinks("Click http://bad.xyz/a.");
  assert.equal(l.raw, "http://bad.xyz/a");
});
