# channel-analytics-interpretation-broker

<!-- 561-group-standards:badges:start -->
[![Red Cup Engineering](https://img.shields.io/badge/561%20Group-Red%20Cup%20Engineering-c0392b)](https://github.com/red-cup-engineering)
[![License: MIT](https://img.shields.io/badge/license-MIT-c0392b)](LICENSE)
[![Indigenous data: CARE](https://img.shields.io/badge/Indigenous%20data-CARE-4b6f44)](https://github.com/red-cup-engineering/.github/blob/main/GOVERNANCE.md)
[![Tips welcome](https://img.shields.io/badge/tips-welcome-d4a017)](https://github.com/561-group/.github/blob/main/TIPS.md)
<!-- 561-group-standards:badges:end -->

Same-principal, purpose-bound interpretation of exact channel-owned audience observations without raw-data title or credentials.

## Professional A2A delivery and privacy boundary

The original `src/curiosity-offer-delivery.mjs::pickupCuriosityOffer` is
**asynchronous** because it may read the original witness journal and verify
customer-owned offers. The A2A executor and its command-line carrier now
`await` this provider and emit the fully received typed result, never an
unfulfilled JavaScript Promise or an implicitly serialized `{}`.
The original `test/curiosity-offer-delivery.test.mjs` tests also await
accepted results and rejected Promises.

Customer-facing refusal messages for the curiosity-offer and commissioned
analytics A2A executors now contain fixed typed codes, never a raw provider
exception body, credential, internal storage path or unverified field echoed
from a forged request. A valid, content-identical, structurally qualified
commission may retain its original safe customer, request and commission
identifiers after an internal refusal. Invalid commission requests do not
earn that correlation privilege. These changes do not change the existing
source-held seller/principal, journal, declared 5000-micro unit, scope,
customer authorization, or same-principal internal-settlement boundary.

Focused `test/a2a-executor-boundary.test.mjs` cases cover awaited exact
offer delivery, unavailable/cross-customer offer refusal, leaked-provider-error
negative controls, correctly bound commission correlation and malformed
requests. The package's existing `npm run verify` still selects all test
files, but only a dependency-closed native run and independent original
A2A client/server receiving can prove deployed interoperability.
The package remains an **internal same-principal service**; its internal cost
allocations are not cash from an outside buyer. No new sale, paid client,
market listing, signing authority or spending power follows from this repair.
