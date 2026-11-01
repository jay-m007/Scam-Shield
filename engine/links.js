// Looks at every web address in a message and flags the tricks scammers use. Nothing is ever fetched.
const SHORTENERS = new Set(["bit.ly", "tinyurl.com", "t.co", "goo.gl", "cutt.ly", "rb.gy", "is.gd", "shorturl.at", "ow.ly", "tiny.cc", "rebrand.ly", "t.ly", "s.id", "buff.ly", "lnkd.in", "v.gd"]);
const RISKY_TLDS = new Set(["xyz", "top", "click", "icu", "vip", "club", "live", "site", "online", "info", "cc", "link", "buzz", "rest", "monster", "cyou", "sbs", "shop", "work", "fun", "life", "store", "today", "support", "cfd", "bond"]);
const TWO_PART = new Set(["co.in", "gov.in", "org.in", "net.in", "nic.in", "ac.in", "res.in", "co.uk", "gov.uk", "ac.uk", "com.au", "co.za", "com.sg", "co.nz"]);

// Name used in the domain -> domains that really belong to it.
const BRANDS = {
  sbi: ["sbi.co.in", "onlinesbi.sbi", "sbi.bank.in", "sbicard.com", "sbilife.co.in", "sbimf.com", "sbiyono.sbi"],
  hdfc: ["hdfcbank.com", "hdfc.com", "hdfclife.com", "hdfcergo.com", "hdfcsec.com", "hdfcfund.com", "hdfcbank.bank.in"],
  icici: ["icicibank.com", "icicilombard.com", "iciciprulife.com", "icicidirect.com", "icicipruamc.com"],
  axis: ["axisbank.com", "axismf.com", "axisbank.co.in"],
  kotak: ["kotak.com", "kotak.bank.in", "kotaklife.com"],
  paytm: ["paytm.com", "paytmbank.com", "paytm.in"],
  phonepe: ["phonepe.com"],
  gpay: ["pay.google.com"],
  bhim: ["bhimupi.org.in", "npci.org.in"],
  npci: ["npci.org.in"],
  amazon: ["amazon.in", "amazon.com", "amazon.co.uk", "amazon.jobs", "amazonaws.com", "amazon.science", "amazon.de"],
  flipkart: ["flipkart.com", "flipkartwholesale.com", "flipkarthealthplus.com"],
  irctc: ["irctc.co.in", "irctc.com", "irctctourism.com"],
  incometax: ["incometax.gov.in", "incometaxindia.gov.in"],
  uidai: ["uidai.gov.in"],
  aadhaar: ["uidai.gov.in"],
  epfo: ["epfindia.gov.in", "epfindia.com"],
  jio: ["jio.com", "jiomart.com", "jiocinema.com", "jiosaavn.com", "jiopay.com", "jiofiber.com"],
  airtel: ["airtel.in", "airtel.com", "airtelbank.com", "airtelpaymentsbank.com"],
  bsnl: ["bsnl.co.in"],
  vodafone: ["myvi.in", "vodafone.com", "vodafone.in"],
  indiapost: ["indiapost.gov.in"],
  fedex: ["fedex.com"],
  dhl: ["dhl.com"],
  bluedart: ["bluedart.com"],
  swiggy: ["swiggy.com", "swiggy.in"],
  zomato: ["zomato.com"],
  myntra: ["myntra.com"],
  netflix: ["netflix.com"],
  whatsapp: ["whatsapp.com", "wa.me", "whatsapp.net"],
  google: ["google.com", "google.co.in", "goo.gl", "googleapis.com", "gstatic.com", "withgoogle.com"],
  microsoft: ["microsoft.com", "live.com", "office.com", "microsoftonline.com", "msn.com"],
  apple: ["apple.com", "icloud.com"],
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
  pnb: ["pnbindia.in", "pnb.co.in", "netpnb.com"],
  bob: ["bankofbaroda.in", "bankofbaroda.com"],
  canara: ["canarabank.com", "canarabank.in"],
  rbi: ["rbi.org.in"],
  gst: ["gst.gov.in"],
  digilocker: ["digilocker.gov.in"],
  umang: ["umang.gov.in"],
};

const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'`)\]]+|\b[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?){0,4}\.(?:com|in|co|net|org|xyz|top|click|icu|vip|club|live|site|online|info|cc|link|buzz|rest|monster|cyou|sbs|shop|work|fun|life|store|today|support|cfd|bond|ly|gl|me|app|apk|page|gov|bank|sbi)\b(?:\/[^\s<>"'`)\]]*)?/gi;

export function registrable(host) {
  const parts = host.split(".");
  if (parts.length <= 2) return host;
  return TWO_PART.has(parts.slice(-2).join(".")) ? parts.slice(-3).join(".") : parts.slice(-2).join(".");
}

function parse(raw) {
  let s = raw.replace(/[.,;:!?]+$/, "");
  const hasScheme = /^https?:\/\//i.test(s);
  const scheme = hasScheme ? s.slice(0, s.indexOf(":")).toLowerCase() : "";
  s = s.replace(/^https?:\/\//i, "");
  const hostEnd = s.search(/[\/?#]/);
  let hostPart = hostEnd === -1 ? s : s.slice(0, hostEnd);
  const path = hostEnd === -1 ? "" : s.slice(hostEnd);
  hostPart = hostPart.replace(/^[^@]*@/, "").replace(/:\d+$/, "").toLowerCase();
  return { scheme, host: hostPart, path, hadUserinfo: /@/.test(s.slice(0, hostEnd === -1 ? s.length : hostEnd)) };
}

// Makes a link safe to show: it cannot be clicked or tapped by accident.
export function defang(raw) {
  return raw.replace(/^https?:\/\//i, (m) => m.replace("http", "hxxp")).replace(/\./g, "[.]");
}

const FLAGS = {
  "link-lookalike": { title: "Link imitates a trusted name", weight: 40, why: "The address uses a well-known name but does not belong to that company. Scammers register look-alike addresses." },
  "link-ip": { title: "Link is a raw number address", weight: 35, why: "Real companies use their own names in web addresses, not a string of numbers." },
  "link-punycode": { title: "Link hides look-alike letters", weight: 35, why: "The address uses special characters that can look like normal letters, a common trick for fake bank sites." },
  "link-apk": { title: "Link downloads an app file", weight: 40, why: "A link that downloads an .apk file installs an app outside the Play Store. Fake KYC and bill apps steal money this way." },
  "link-shortener": { title: "Link is shortened", weight: 15, why: "Shortened links hide where they go. Banks and agencies rarely use them for urgent messages." },
  "link-risky-tld": { title: "Link ends in a cheap, risky ending", weight: 15, why: "Endings such as .xyz, .top and .click cost very little and are used for a large share of throwaway scam sites." },
  "link-userinfo": { title: "Link hides its real address", weight: 30, why: "Text before an @ in a web address is ignored. Scammers put a trusted name there so the real address looks harmless." },
  "link-hyphens": { title: "Link has many hyphens or digits", weight: 10, why: "Addresses like sbi-kyc-update-2024.com are made up to look official." },
  "link-http": { title: "Link is not secure (http)", weight: 8, why: "The link does not use https, so even a real site would not be protected." },
};

export function flagInfo(id) { return FLAGS[id]; }

function brandTokens(host) {
  // Whole words in the host name: "sbi-kyc.example.xyz" -> sbi, kyc, example, xyz
  return host.split(/[.\-_0-9]+/).filter(Boolean);
}

export function analyzeLinks(text) {
  const out = [];
  const seen = new Set();
  URL_RE.lastIndex = 0;
  let m;
  while ((m = URL_RE.exec(text)) !== null) {
    if (m[0].length === 0) { URL_RE.lastIndex++; continue; }
    const raw = m[0].replace(/[.,;:!?]+$/, "");
    const start = m.index, end = m.index + raw.length;
    // "e.g." and "file.in" style fragments inside an email address are not links
    if (start > 0 && text[start - 1] === "@") continue;
    const key = raw.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const { scheme, host, path, hadUserinfo } = parse(raw);
    if (!host || !host.includes(".")) continue;
    const flags = [];
    const reg = registrable(host);
    const tld = host.split(".").pop();
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) flags.push("link-ip");
    if (host.includes("xn--")) flags.push("link-punycode");
    if (/\.apk(\?|$)/i.test(path) || /\.apk$/i.test(host)) flags.push("link-apk");
    if (SHORTENERS.has(host) || SHORTENERS.has(reg)) flags.push("link-shortener");
    if (hadUserinfo) flags.push("link-userinfo");
    const tokens = brandTokens(host);
    let imitated = null;
    for (const [brand, real] of Object.entries(BRANDS)) {
      const hit = tokens.some((t) => t === brand || (brand.length >= 3 && t.startsWith(brand) && t.length <= brand.length + 8));
      if (!hit) continue;
      if (real.includes(reg) || real.some((d) => host === d || host.endsWith("." + d))) continue;
      imitated = brand;
      break;
    }
    if (imitated) flags.push("link-lookalike");
    if (RISKY_TLDS.has(tld) && !imitated) flags.push("link-risky-tld");
    const hy = (host.match(/-/g) || []).length, dg = (host.match(/\d/g) || []).length;
    if (hy >= 3 || dg >= 5) flags.push("link-hyphens");
    if (scheme === "http") flags.push("link-http");
    out.push({ raw, safe: defang(raw), host, start, end, imitates: imitated, flags });
  }
  return out;
}
