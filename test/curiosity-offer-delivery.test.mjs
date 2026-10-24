import assert from "node:assert/strict";
import test from "node:test";
import { ACTOR, contentId } from "../src/broker.mjs";
import { CHANNEL, MARKET, pickupCuriosityOffer } from "../src/curiosity-offer-delivery.mjs";

function exact(body) { return { id: contentId(body), ...body }; }
function offer() {
  const object = exact({
    type: "CuriosityCandidate", motivatingInterpretation: "urn:interpretation",
    question: "Which relation warrants follow-up?",
    whyItMayMatter: "It may discriminate among explanations.",
    permittedUses: ["consider-for-research-assignment"],
    evidenceStatus: "demand-signal-not-research-evidence", bidStatus: "not-a-bid",
    spendingAuthority: "none",
  });
  return exact({ type: "Offer", actor: ACTOR, object, published: "2096-07-21T12:00:00.000Z" });
}

test("awaits and delivers the exact offer enclosing one non-evidentiary candidate", async () => {
  const row = offer();
  const request = exact({
    type: "AnalyticsCuriosityOfferPickupRequest", requester: MARKET,
    broker: ACTOR, candidate: row.object.id,
  });
  const result = await pickupCuriosityOffer(request, { records: [row] });
  assert.equal(result.customer, MARKET);
  assert.equal(result.candidate, row.object.id);
  assert.equal(result.offer.id, row.id);
  assert.equal(result.offer.object.spendingAuthority, "none");
});

test("commissioning channel can await only its own induced curiosity candidate", async () => {
  const row = offer();
  const request = exact({
    type: "AnalyticsCuriosityOfferPickupRequest", requester: CHANNEL,
    broker: ACTOR, candidate: row.object.id,
  });
  const interpretation = {
    id: row.object.motivatingInterpretation, customer: CHANNEL, provider: ACTOR,
  };
  const result = await pickupCuriosityOffer(request, {
    records: [row], interpretations: [interpretation],
  });
  assert.equal(result.customer, CHANNEL);
  assert.equal(result.offer.id, row.id);
  await assert.rejects(
    pickupCuriosityOffer(request, {
      records: [row], interpretations: [{ ...interpretation, customer: "urn:other" }],
    }),
    /only a curiosity induced/u,
  );
});

test("foreign requester and changed candidate reject asynchronously", async () => {
  const row = offer();
  const request = exact({
    type: "AnalyticsCuriosityOfferPickupRequest", requester: "urn:other",
    broker: ACTOR, candidate: row.object.id,
  });
  await assert.rejects(pickupCuriosityOffer(request, { records: [row] }), /not exact/u);
  const missing = exact({
    type: "AnalyticsCuriosityOfferPickupRequest", requester: MARKET,
    broker: ACTOR, candidate: "urn:sha256:" + "f".repeat(64),
  });
  await assert.rejects(pickupCuriosityOffer(missing, { records: [row] }), /unavailable/u);
});
