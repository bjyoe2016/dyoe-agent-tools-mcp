# DYOE Authorization Protocol — Specification (v1)

A trust & safety layer for autonomous systems. One neutral authority issues **verifiable, signed credentials** about four subjects — Humans, AI Agents, Organizations, and Actions — on a single rail. Any party can verify a DYOE credential independently, offline, forever.

- **Live API:** https://agents.dyoeway.org
- **Authority (pin this):** `GET https://agents.dyoeway.org/authority`
- **Free interop verify:** `GET https://agents.dyoeway.org/credential/verify?c=<base64url credential>`

This spec is open. Implement a verifier, adopt the format, build on it — no permission required. The value is being the authority that signs; the format is free.

---

## 1. The signature

Every DYOE credential/attestation/authorization is a JSON object signed with **EIP-191 `personal_sign`** by the DYOE Authority key.

**To verify any DYOE object:**
1. Remove the fields `authority`, `signature`, and `verify`.
2. Serialize the remainder as **canonical JSON** — object keys sorted recursively (see §4).
3. Recover the EIP-191 signer of that string from `signature`.
4. The recovered address MUST equal `authority`, and `authority` MUST equal the address published at `/authority`.
5. Reject if `now > expires_at`.

If all pass, the object is authentic and current. No API call to DYOE is required to verify — it's a pure cryptographic check against the pinned authority address.

## 2. Credential envelope

```json
{
  "protocol": "dyoe-credential-v1",
  "credential_id": "cred_…",
  "type": "human | agent | organization | action | trust | reputation",
  "subject": "coinbase.com | 0x… | <the thing being attested>",
  "claims": { "...": "type-specific facts" },
  "issued_at": "2026-07-01T…Z",
  "expires_at": "2026-07-…Z",
  "authority": "0x…",       // recovers from the signature; equals /authority
  "signature": "0x…",        // EIP-191 personal_sign over canonical(claim)
  "verify": "…instructions…"
}
```

`attestation` (from `/verify`) and `authorization` (from `/approve`) are the same shape with `protocol: dyoe-attestation-v1` / `dyoe-authorization-v1` and their own claim fields.

## 3. Credential types

| Type | Endpoint | How it's earned | Claims |
|---|---|---|---|
| **Agent** | `GET /credential/agent` | Wallet key-control challenge (sign `DYOE agent identity: <wallet> @ <ts>`) | `key_control_verified`, `method` |
| **Organization** | `GET /credential/org` | Trust check on a domain | `verdict`, `trust_score`, `domain_age_days` |
| **Human** | `GET /credential/human` | Human attestation (a real reviewer confirms) | `method`, `human_reviewed` |
| **Action** | `GET /approve` | Policy + human review of a proposed action | `status`, `action_hash`, `reviewer` |
| **Trust** (attestation) | `GET /verify` | Automated counterparty risk check | `verdict`, `trust_score`, `evidence`, `confidence` |
| **Reputation** | `GET /reputation` | Aggregated history of all assessments | `total_checks`, `verdicts`, `reputation_score` |

A single autonomous transaction can carry **all** of these signals at once: authenticated buyer (Agent) + authenticated seller (Organization) + a passed trust check (Trust) + a human sign-off when required (Action).

## 4. Canonical JSON

Deterministic serialization so verifiers reconstruct identical bytes:
- Objects: keys sorted lexicographically, recursively.
- Format: `{"k1":<v1>,"k2":<v2>}` and `[<e1>,<e2>]`, values via standard JSON.

```js
const canonical = (v) =>
  Array.isArray(v) ? "[" + v.map(canonical).join(",") + "]"
  : v && typeof v === "object"
    ? "{" + Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + canonical(v[k])).join(",") + "}"
  : JSON.stringify(v ?? null);
```

## 5. Reference verifier (JS)

```js
import { recoverMessageAddress } from "viem";

async function verifyDyoe(obj, pinnedAuthority) {
  const { authority, signature, verify, ...claim } = obj;
  if (!signature || authority?.toLowerCase() !== pinnedAuthority.toLowerCase()) return false;
  const signer = await recoverMessageAddress({ message: canonical(claim), signature });
  if (signer.toLowerCase() !== authority.toLowerCase()) return false;
  if (claim.expires_at && Date.now() > Date.parse(claim.expires_at)) return false;
  return true;
}
```

Or just call the free endpoint: `GET /credential/verify?c=<base64url(JSON.stringify(obj))>`.

## 6. Design principles

- **Open to verify, paid to issue.** Verification is free and permissionless; issuance (and human review) is the product.
- **Neutral root.** Everyone verifies against one authority; no one competes with its verdict.
- **Everything is evidence.** Verdicts ship with the signals behind them, a confidence score, a timestamp, and a signature — never a bare number.
- **Transparent + correctable.** See [TRUST-METHODOLOGY.md](./TRUST-METHODOLOGY.md) for how verdicts are computed and how mistakes are corrected.

---

*DYOE — the trust layer for autonomous systems. Spec v1, 2026-07.*
