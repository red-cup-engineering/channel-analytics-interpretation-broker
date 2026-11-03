#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { agentRmnMessage, extractRmnPart, parseA2aMessage } from "@red-cup-engineering/a2a-rmn-part-service";
import { admitJsonSemanticContent, EMPTY_WITNESS_ROOT, identifyJsonSemanticContent } from "@red-cup-engineering/semantic-content-identify-service";
import { ACTOR } from "./broker.mjs";
import { pickupCuriosityOffer } from "./curiosity-offer-delivery.mjs";

const A2A_CARRIER_KIND = "rsc-quiescent.a2a-json";
const semanticBytes = value => identifyJsonSemanticContent({
  objectKind: A2A_CARRIER_KIND, value, witnessRoot: EMPTY_WITNESS_ROOT,
}).bytes;
const decodeSemantic = bytes => admitJsonSemanticContent({
  bytes, objectKind: A2A_CARRIER_KIND,
}).value;

/** One request, one awaited original provider effect and a complete typed
 * result. A Promise is never a portable RMN value, and a provider's raw
 * exception may contain credentials or unauthorized private row details. */
export async function executeCuriosityOfferMessage(message, options = {}) {
  const part = extractRmnPart(parseA2aMessage(message).parts);
  const term = decodeSemantic(part.bytes);
  if (!semanticBytes(term).equals(part.bytes) ||
      term?.[0] !== "analytics-curiosity-offer-pickup-request" ||
      term.length !== 2)
    throw new TypeError("foreign curiosity offer operation");
  let result;
  try {
    // The original provider is async even when given synthetic in-memory rows:
    // it may read the original witness journal and validate customer ownership.
    result = await pickupCuriosityOffer(term[1], options);
  } catch {
    result = {
      type: "AnalyticsCuriosityOfferPickupResult", provider: ACTOR,
      request: null, disposition: "refused",
      code: "offer-unavailable", retryable: false,
    };
  }
  return agentRmnMessage(
    semanticBytes(["analytics-curiosity-offer-pickup-result", result]),
    "analytics-curiosity-offer-pickup-result.rmn.cbor",
  );
}

async function main() {
  let input = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) input += chunk;
  const response = await executeCuriosityOfferMessage(JSON.parse(input), {
    dataRoot: process.env.ANALYTICS_BROKER_DATA_ROOT,
  });
  process.stdout.write(JSON.stringify(response) + "\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  await main().catch(error => {
    // This is an operator stderr diagnostic, not customer-facing A2A output.
    process.stderr.write(error.message + "\n");
    process.exitCode = 2;
  });
