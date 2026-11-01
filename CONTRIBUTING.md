# Add a scam pattern in two minutes

Scam Shield gets better when people add the scams they see. You do not need to touch any code: **one scam pattern is one small JSON file** in [`rules/`](rules/).

## 1. Copy a rule

Pick a rule that looks like yours, for example [`rules/electricity-bill.json`](rules/electricity-bill.json), and copy it to `rules/<your-id>.json`.

```json
{
  "id": "electricity-bill",
  "title": "Threatens to cut your electricity tonight",
  "category": "impersonation",
  "weight": 30,
  "why": "Power companies do not cut supply at 9:30 tonight because of a text message. ...",
  "patterns": ["\\b(?:electricity|power)\\b[^.!?\\n]{0,60}?\\b(?:disconnect\\w*|tonight)\\b"],
  "examples": ["Your electricity will be disconnected tonight. Call 9876543210."],
  "safe": ["Electricity bill of Rs 840 generated. Due date 12 Nov."]
}
```

| Field | What to write |
|---|---|
| `id` | lowercase words joined by hyphens. The file must be named `<id>.json` |
| `title` | 3-60 characters, what the person sees. Say what the message does, e.g. "Asks you to share an OTP" |
| `category` | `credentials`, `impersonation`, `money`, `pressure`, `malware`, `lure` or `threat` |
| `weight` | 5-45. How strong the sign is on its own. Use 40+ only if the message is almost certainly a scam by itself, 25-35 for a strong warning, 8-15 for a small sign. Signs add up, so several small ones can still reach "Likely a scam" |
| `why` | 1-2 plain sentences that explain the trick to someone who has never heard of it |
| `patterns` | 1-8 regular expressions, case-insensitive. Remember to double every backslash in JSON |
| `ignoreIf` | optional. A regex; the match is skipped if it matches the nearby words. Used to ignore "Do not share your OTP" |
| `examples` | 2-10 scam messages that **must** trigger the rule |
| `safe` | 1-10 genuine messages that look similar and **must not** trigger it |

## 2. Check it

```bash
npm run check-rule rules/<your-id>.json
npm test
```

`check-rule` tells you which example was missed and which safe message set it off. `npm test` also runs every rule against a set of real-looking scam and genuine messages in `tests/corpus.json`, and checks that no rule can hang the page on hostile input.

## 3. Open a pull request

CI runs the same tests. A good pull request:

- adds **one** rule, or improves one
- has a `safe` message, so we know it will not cry wolf. A false alarm that scares people off a genuine bank message does real harm
- uses made-up details in examples (no real names, phone numbers, account numbers or links)

## Tips for good patterns

- Use `\\b` around words so `pan` does not match `panic`.
- Use `[^.!?\\n]{0,60}?` to say "within the same sentence". It keeps rules from joining unrelated sentences and it stays fast.
- Cover Hinglish and Hindi spellings if you see them (`batao`, `turant`, `केवाईसी`).
- Prefer the **action** the scammer wants ("share the OTP", "scan to receive") over a word that also appears in real messages ("OTP", "KYC").

## Other ways to help

- **Missed a scam?** [Open an issue](../../issues/new/choose) with the message (remove personal details first).
- **A genuine message was flagged?** Open a "false alarm" issue.
- Translate the interface or the `why` texts into Hindi, Marathi, Tamil, Bengali and other languages.

## Ground rules

Scam Shield runs entirely in the browser and never sends a message anywhere. Contributions must keep it that way: no analytics, no network calls other than loading its own files.
