# DYOE Trust Methodology

How we decide what's trustworthy — stated plainly, because in a trust business the method *is* the product. If you're going to rely on "DYOE says it's safe," you deserve to know exactly how we got there, and how we handle being wrong.

Live API: https://agents.dyoeway.org · Spec: [SPEC.md](./SPEC.md)

---

## 1. What a Trust Check actually measures

`/verify` assesses whether a counterparty (website, business, wallet, endpoint) is a real, legitimate entity — **not** whether a specific offer is good. We lean on **hard, hard-to-fake signals**, not surface polish:

- **HTTPS** — is traffic encrypted? (No encryption on a payee → hard red flag.)
- **Domain age** (RDAP) — how long has it existed? *This is the single strongest signal.* Brand-new domains (<30 days) are the #1 counterparty-scam pattern.
- **Reachability** — does it resolve and respond?
- **Contactability** — email / phone / contact path present?
- **Red flags** — brand-new domain, no HTTPS, unreachable, known-bad patterns.

## 2. How the verdict is computed

Verdict is one of `safe` / `caution` / `avoid`, chosen from the hard anchors — **not** from a content score that a defended site can't earn:

- **`avoid`** — no HTTPS, brand-new domain, or a genuine (non-defended) error on an unproven domain.
- **`caution`** — new-ish domain (30–90 days), or a weak/unestablished site with mixed signals.
- **`safe`** — long-lived, encrypted, reachable domains with no danger flags.

**A site blocking our scanner is not a scam signal.** Large legitimate sites (exchanges, big brands) commonly block bots. We label that `bot_protected` (neutral) and score on domain age + HTTPS + reachability instead — because punishing the most-defended sites would make the whole system wrong. (This was a real bug we found and fixed; see §6.)

Every verdict ships as a **signed attestation** with the evidence, a **confidence** value (lower when we couldn't fully read the page), a timestamp, and a signature. You can audit our reasoning, not just our conclusion.

## 3. How approvals work (`/approve`)

Guardian evaluates a proposed action against trust + policy:
- Counterparty fails the trust check (`avoid`) → **denied**.
- Amount over a threshold to an un-vouched counterparty, or a `caution` counterparty over a smaller amount → **needs human review**.
- Otherwise → **approved** (automated policy).

`needs_human` routes to a **real person** who approves or denies. The result is returned as a **signed authorization** — automated decisions are labeled `dyoe-guardian-automated-policy`; human decisions are labeled `human-verified`. We never claim a human reviewed something a human didn't.

## 4. How reputation is computed (`/reputation`)

Reputation is a subject's **track record**, aggregated from every assessment we've made about it: total checks, verdict history, times flagged, first/last seen, average trust score. Any `avoid` in the history caps the reputation score. It **compounds** — the more a subject is assessed, the more confident the reputation. Thin histories are labeled as such; we don't overstate confidence we haven't earned.

## 5. How assessments update over time

- **Attestations expire** (1 hour) and **authorizations expire** (10 minutes) — trust is a point-in-time statement, not a permanent claim.
- **Reputation reflects the latest picture** as new checks accumulate.
- A domain that ages, adds HTTPS, or gets human-vouched will see its verdict improve on the next check.

## 6. How we handle mistakes

This is the part most trust vendors won't write down. We will.

- **We publish our logic** (this document + the open [spec](./SPEC.md)) so errors are inspectable.
- **We fix false results at the root, not with patches.** Example: our engine once flagged Coinbase as `avoid` because it blocks scrapers; we treated a *defended* site as a *scam*. We rewrote the verdict logic to lean on hard anchors and re-tested against known-good and known-bad sites before shipping. That's the standard — a wrong verdict on an obvious case is treated as critical, because our reputation *is* the product.
- **Report a wrong verdict:** open an issue on this repo with the subject and what you observed. Corrections update future assessments.

## 7. What we don't do

- We don't return a bare score with no evidence.
- We don't claim automated checks are human-reviewed.
- We don't fabricate "losses prevented" or usage numbers — any metric we publish is real and defensible.
- We don't fetch internal/private addresses on your behalf (SSRF-guarded).

---

*Trust is earned by being right, transparent, and honest about mistakes. This document is how we hold ourselves to that. DYOE, 2026-07.*
