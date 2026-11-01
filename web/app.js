import { analyze, compileRules, categoryLabel, IF_TOO_LATE, REPORT_LINES, MAX_CHARS } from "./engine/index.js";

// ---- tiny DOM helper: text only, never HTML, so a pasted message can never inject anything ----
function h(tag, props, ...kids) {
  const el = document.createElement(tag);
  if (props) for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  return el;
}
const $ = (id) => document.getElementById(id);

const SAMPLES = [
  { name: "Fake KYC SMS", text: "Dear Customer, your SBI YONO account will be blocked today. Your KYC is pending. Update immediately: http://sbi-kyc-update.xyz/login" },
  { name: "Digital arrest", text: "This is Mumbai Police Cyber Crime. A parcel booked in your name contains drugs and a case has been registered. You are under digital arrest. Do not tell anyone and stay on the video call." },
  { name: "Collect request", text: "I have sent the advance for your item. Just scan this QR code to receive the money. Enter your UPI PIN to accept." },
  { name: "Job offer", text: "Part time job! Earn Rs 4000 per day by liking YouTube videos. Join our Telegram group for daily tasks. No investment needed." },
  { name: "Real bank alert", text: "HDFC Bank: Rs 1,240.00 debited from a/c XX4821 on 02-11-26 at AMAZON. Not you? Call 1800 202 6161. Never share your OTP or PIN with anyone." },
];

let rules = null;
let lastResult = null;

// ---- colour mode ----
function applyMode(m) {
  const root = document.documentElement;
  if (m === "light" || m === "dark") root.setAttribute("data-theme", m); else root.removeAttribute("data-theme");
  $("modeBtn").textContent = m === "light" ? "Light" : m === "dark" ? "Dark" : "Auto";
}
function cycleMode() {
  let cur = "auto";
  try { cur = localStorage.getItem("ss.mode") || "auto"; } catch (e) {}
  const next = cur === "auto" ? "light" : cur === "light" ? "dark" : "auto";
  try { if (next === "auto") localStorage.removeItem("ss.mode"); else localStorage.setItem("ss.mode", next); } catch (e) {}
  applyMode(next);
}

// ---- rendering ----
function strength(w) { return w >= 35 ? ["strong", "Strong sign"] : w >= 20 ? ["warn", "Warning sign"] : ["small", "Small sign"]; }

function markedText(r) {
  const out = h("p", { class: "marked", lang: "en" });
  let pos = 0;
  const t = r.text;
  const ids = (s, e) => r.findings.filter((f) => f.matches.some((m) => m.start < e && m.end > s)).map((f) => f.id).join(" ");
  for (const hl of r.highlights) {
    if (hl.start > pos) out.append(t.slice(pos, hl.start));
    out.append(h("mark", { "data-f": ids(hl.start, hl.end), text: t.slice(hl.start, hl.end) }));
    pos = hl.end;
  }
  if (pos < t.length) out.append(t.slice(pos));
  return out;
}

function findingCard(f) {
  const [cls, label] = strength(f.weight);
  const card = h("li", { class: "finding " + cls, "data-id": f.id, tabindex: "0" },
    h("div", { class: "f-head" },
      h("strong", { class: "f-title", text: f.title }),
      h("span", { class: "tag " + cls, text: label })),
    h("p", { class: "f-why", text: f.why }),
    h("p", { class: "f-cat", text: categoryLabel(f.category) }));
  const on = (v) => () => document.querySelectorAll("mark").forEach((m) => m.classList.toggle("focus", v && m.dataset.f.split(" ").includes(f.id)));
  card.addEventListener("mouseenter", on(true));
  card.addEventListener("mouseleave", on(false));
  card.addEventListener("focus", on(true));
  card.addEventListener("blur", on(false));
  return card;
}

function summaryText(r) {
  const signs = r.findings.slice(0, 5).map((f) => f.title).join("; ");
  return `Scam Shield: ${r.label} (risk ${r.score}/100).` + (signs ? ` Signs: ${signs}.` : "") + " Check a message yourself: https://jay-m007.github.io/Scam-Shield/";
}

async function copy(text, btn) {
  const old = btn.textContent;
  try { await navigator.clipboard.writeText(text); btn.textContent = "Copied"; }
  catch (e) { btn.textContent = "Press and hold to copy"; }
  setTimeout(() => { btn.textContent = old; }, 1800);
}

function render(r) {
  const box = $("result");
  box.replaceChildren();
  lastResult = r;
  if (r.level === "empty") {
    box.append(h("p", { class: "note", text: "Paste the whole message first. A few words are not enough to judge." }));
    return;
  }
  const lead = {
    scam: `${r.findings.length} sign${r.findings.length === 1 ? "" : "s"} of a scam found. Do not reply, click or pay.`,
    careful: `${r.findings.length} warning sign${r.findings.length === 1 ? "" : "s"} found. Check before you do anything.`,
    clear: "Nothing in this message matches a known scam pattern.",
  }[r.level];
  const head = h("div", { class: "verdict " + r.level },
    h("div", { class: "stamp " + r.level, role: "img", "aria-label": r.label }, h("span", { text: r.label })),
    h("div", { class: "v-text" },
      h("p", { class: "v-lead", text: lead }),
      r.level === "clear"
        ? h("p", { class: "v-sub", text: "That does not prove it is safe. If it asks for money, an OTP or a PIN, call the company on the number from its official website." })
        : h("p", { class: "v-sub", text: `Risk ${r.score} out of 100. Tap a sign below to see the words it came from.` })));
  box.append(head);

  box.append(h("section", { class: "card" }, h("h2", { text: "Your message" }), markedText(r)));

  if (r.findings.length) {
    box.append(h("section", { class: "card" }, h("h2", { text: "Why it looks like this" }),
      h("ul", { class: "findings" }, r.findings.map(findingCard))));
  }

  if (r.links.length) {
    box.append(h("section", { class: "card" }, h("h2", { text: "Links in this message" }),
      h("p", { class: "muted small", text: "Shown with dots in brackets so you cannot tap them by accident. Never open a link from a message you do not trust." }),
      h("ul", { class: "links" }, r.links.map((l) =>
        h("li", null,
          h("code", { text: l.safe }),
          l.flags.length
            ? h("ul", { class: "l-flags" }, l.flags.map((id) => { const f = r.findings.find((x) => x.id === id); return h("li", { text: f ? f.title : id }); }))
            : h("p", { class: "muted small", text: "Nothing odd about this address itself." }))))));
  }

  if (r.advice.length) {
    box.append(h("section", { class: "card do" }, h("h2", { text: "What to do" }), h("ul", null, r.advice.map((a) => h("li", { text: a })))));
  }

  const late = h("details", { class: "card late" }, h("summary", { text: "Already clicked, paid or shared something?" }),
    h("ol", null, IF_TOO_LATE.map((s) => h("li", { text: s }))));
  const report = h("div", { class: "report" }, REPORT_LINES.map((x) => h("p", null, h("span", { class: "muted", text: x.label + ": " }), h("strong", { text: x.value }))));
  if (r.level !== "clear") box.append(late);
  box.append(h("section", { class: "card" }, h("h2", { text: "Report it" }), report));

  const copyBtn = h("button", { class: "btn", type: "button", text: "Copy a short summary" });
  copyBtn.addEventListener("click", () => copy(summaryText(r), copyBtn));
  const again = h("button", { class: "btn ghost", type: "button", text: "Check another message" });
  again.addEventListener("click", () => { $("msg").value = ""; updateCount(); box.replaceChildren(); $("msg").focus(); window.scrollTo({ top: 0, behavior: "smooth" }); });
  box.append(h("div", { class: "row end" }, copyBtn, again));
  head.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function check() {
  if (!rules) return;
  render(analyze($("msg").value, rules));
}

function updateCount() {
  const n = $("msg").value.length;
  $("count").textContent = n ? `${n} / ${MAX_CHARS}` : "";
}

async function boot() {
  try { applyMode(localStorage.getItem("ss.mode") || "auto"); } catch (e) { applyMode("auto"); }
  $("modeBtn").addEventListener("click", cycleMode);
  $("checkBtn").addEventListener("click", check);
  $("clearBtn").addEventListener("click", () => { $("msg").value = ""; updateCount(); $("result").replaceChildren(); $("msg").focus(); });
  $("msg").addEventListener("input", updateCount);
  $("msg").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); check(); } });
  $("msg").addEventListener("paste", () => setTimeout(() => { updateCount(); check(); }, 0));
  const chips = $("samples");
  for (const s of SAMPLES) {
    chips.append(h("button", { class: "chip", type: "button", text: s.name, onclick: () => { $("msg").value = s.text; updateCount(); check(); } }));
  }
  try {
    const res = await fetch("rules.json");
    if (!res.ok) throw new Error("HTTP " + res.status);
    const list = await res.json();
    rules = compileRules(list, { slim: true });
    $("ruleCount").textContent = `${rules.length} scam patterns checked, all stored in this page.`;
  } catch (e) {
    $("result").append(h("p", { class: "note bad", text: "The scam patterns could not be loaded. Reload the page." }));
  }
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
}
boot();
