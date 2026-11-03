import assert from "node:assert/strict";
import test from "node:test";
import { agentRmnMessage, extractRmnPart, parseA2aMessage, userRmnMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import {
  admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent,
} from "@red-cup-engineering/semantic-content-identify-service";
import { executeCommissionProcessingMessage } from "../src/a2a-commission-processing-executor.mjs";
import { executeCuriosityOfferMessage } from "../src/a2a-curiosity-offer-executor.mjs";
import { ACTOR, contentId } from "../src/broker.mjs";
import { CHANNEL, MARKET } from "../src/curiosity-offer-delivery.mjs";

const PROFILE = "rsc-quiescent.a2a-json";
const bytes = value => identifyJsonSemanticContent({
  objectKind: PROFILE, value, witnessRoot: EMPTY_WITNESS_ROOT,
}).bytes;
const decoded = message => admitJsonSemanticContent({
  bytes: extractRmnPart(parseA2aMessage(message).parts).bytes,
  objectKind: PROFILE,
}).value;
const exact = body => ({ id: contentId(body), ...body });
const message = (kind, object) => userRmnMessage(bytes([kind, object]), "request.rmn.cbor");
const SECRET = "Bearer fixture-only-not-an-actual-token; private=https://customer.invalid/a?key=demo";

function offer() {
  const object = exact({
    type: "CuriosityCandidate", motivatingInterpretation: "urn:interpretation",
    question: "What is the next test?", whyItMayMatter: "Can distinguish alternative sources",
    permittedUses: ["consider-for-research-assignment"],
    evidenceStatus: "demand-signal-not-research-evidence",
    bidStatus: "not-a-bid", spendingAuthority: "none",
  });
  return exact({
    type: "Offer", actor: ACTOR, object,
    published: "2096-07-21T12:00:00.000Z",
  });
}
const requestFor = (row, requester = MARKET) => exact({
  type: "AnalyticsCuriosityOfferPickupRequest", requester, broker: ACTOR,
  candidate: row.object.id,
});

test("real async offer provider is awaited before exact A2A semantic serialization", async () => {
  const row = offer(), request = requestFor(row);
  const returned = executeCuriosityOfferMessage(
    message("analytics-curiosity-offer-pickup-request", request),
    { records: [row] },
  );
  assert.equal(typeof returned.then, "function", "the operation is explicitly async");
  const result = decoded(await returned);
  assert.equal(result[0], "analytics-curiosity-offer-pickup-result");
  assert.equal(result[1].disposition, "delivered");
  assert.equal(result[1].request, request.id);
  assert.equal(result[1].offer.id, row.id);
  assert.equal(result[1].offer.object.spendingAuthority, "none");
  assert.equal(result[1].offer.then, undefined,
    "never serialize a Promise in place of the received offer");
});

test("async missing offer reports a fixed typed refusal, no pending Promise or invented delivery", async () => {
  const row = offer();
  const result = decoded(await executeCuriosityOfferMessage(
    message("analytics-curiosity-offer-pickup-request", requestFor(row)),
    { records: [] },
  ))[1];
  assert.equal(result.disposition, "refused");
  assert.equal(result.code, "offer-unavailable");
  assert.equal(result.retryable, false);
  assert.equal(result.request, null);
  assert.equal("offer" in result, false);
});

test("curiosity source failure cannot leak provider exception text or reflect a forged request ID", async () => {
  const row = offer(), valid = requestFor(row);
  const refused = await executeCuriosityOfferMessage(
    message("analytics-curiosity-offer-pickup-request", valid),
    { records: { find() { throw new Error(SECRET); } } },
  );
  const body = decoded(refused)[1];
  assert.equal(body.code, "offer-unavailable");
  assert.equal(body.request, null);
  assert.equal("detail" in body, false);
  assert.doesNotMatch(JSON.stringify(refused), /fixture-only-not-an-actual-token|customer.invalid/u);
  const forged = { ...valid, id: SECRET };
  const invalid = decoded(await executeCuriosityOfferMessage(
    message("analytics-curiosity-offer-pickup-request", forged),
    { records: [row] },
  ))[1];
  assert.equal(invalid.request, null);
  assert.equal(invalid.disposition, "refused");
  assert.doesNotMatch(JSON.stringify(invalid), /fixture-only-not-an-actual-token/u);
});

test("original commissioned analytics processing retains exact safe request identity after an internal failure", async () => {
  const commission = "urn:sha256:" + "a".repeat(64);
  const request = exact({
    type: "AnalyticsCommissionProcessingRequest", customer: CHANNEL,
    provider: ACTOR, commission,
  });
  const refusal = decoded(await executeCommissionProcessingMessage(
    message("analytics-commission-processing-request", request),
    { client: { pickup: async () => { throw new Error(SECRET); } } },
  ))[1];
  assert.equal(refusal.disposition, "refused");
  assert.equal(refusal.code, "commission-unprocessable");
  assert.equal(refusal.customer, CHANNEL);
  assert.equal(refusal.request, request.id);
  assert.equal(refusal.commission, commission);
  assert.equal("detail" in refusal, false);
  assert.doesNotMatch(JSON.stringify(refusal), /fixture-only-not-an-actual-token|customer.invalid/u);
});

test("unsigned and malformed A2A commission does not echo request body or secret fields", async () => {
  const spoofed = {
    id: SECRET, type: "AnalyticsCommissionProcessingRequest",
    provider: ACTOR, customer: SECRET, commission: SECRET,
  };
  const refusal = decoded(await executeCommissionProcessingMessage(
    message("analytics-commission-processing-request", spoofed),
  ))[1];
  assert.equal(refusal.disposition, "refused");
  assert.equal(refusal.customer, null);
  assert.equal(refusal.request, null);
  assert.equal(refusal.commission, null);
  assert.equal("detail" in refusal, false);
  assert.doesNotMatch(JSON.stringify(refusal), /fixture-only-not-an-actual-token/u);
});

test("unrelated A2A activity tags still refuse before any merchant computation", async () => {
  const row = offer(), request = requestFor(row);
  await assert.rejects(executeCuriosityOfferMessage(
    message("unexpected-curiosity-activity", request), { records: [row] },
  ), /foreign curiosity offer operation/u);
  await assert.rejects(executeCommissionProcessingMessage(
    message("unexpected-commission-activity", {
      type: "AnalyticsCommissionProcessingRequest", id: "demo",
    }),
  ), /foreign analytics processing operation/u);
});
