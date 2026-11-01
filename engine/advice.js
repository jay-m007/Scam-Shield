const TIPS = {
  credentials: "Never share an OTP, UPI PIN, CVV or password with anyone. Real banks and apps never ask for them.",
  impersonation: "Do not reply or click. Find the official number on the company's website or on the back of your card, and call that instead.",
  money: "You never need to pay, scan or enter a PIN to receive money. A genuine payment arrives without any action from you.",
  threat: "No police or agency arrests people over a call or video call, or asks for money to close a case. Hang up and tell someone you trust.",
  malware: "Do not install apps from links or messages, and never let a caller control your phone with AnyDesk, TeamViewer or similar.",
  lure: "Real jobs, loans and prizes do not ask you to pay first, or to do paid tasks on Telegram or WhatsApp.",
  pressure: "Pressure is part of the trick. Stop, wait ten minutes, and talk to someone you trust before doing anything.",
  links: "Do not open the link. Type the official website yourself, or use the company's own app.",
};
const ORDER = ["threat", "malware", "credentials", "money", "impersonation", "lure", "links", "pressure"];

export function adviceFor(findings) {
  const have = new Set(findings.map((f) => f.category));
  return ORDER.filter((c) => have.has(c)).map((c) => TIPS[c]);
}

export const IF_TOO_LATE = [
  "Call 1930 (National Cyber Crime Helpline) straight away. Money reported quickly can sometimes be frozen.",
  "Tell your bank to block the card, UPI or account involved.",
  "Report on cybercrime.gov.in and keep screenshots of the messages and payment.",
  "Change the passwords and PINs you shared, and remove any app you were asked to install.",
];

export const REPORT_LINES = [
  { label: "Cyber Crime Helpline", value: "1930" },
  { label: "Report online", value: "cybercrime.gov.in" },
  { label: "Report spam calls and SMS", value: "sancharsaathi.gov.in" },
];
