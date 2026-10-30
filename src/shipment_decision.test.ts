import { decideShipment } from "./shipment_decision.ts";

const withException = decideShipment({
  trackingNumber: "TRK-7",
  events: [
    { kind: "delivered", occurredAt: "2026-10-24T09:00:00Z" },
    { kind: "exception", occurredAt: "2026-10-24T09:05:00Z" },
  ],
  proof: { name: "pod.jpg", contentType: "image/jpeg" },
});

if (withException.status !== "attention_required") throw new Error("An exception must take priority over delivery.");

const delivered = decideShipment({
  trackingNumber: "TRK-8",
  events: [{ kind: "delivered", occurredAt: "2026-10-24T09:00:00Z" }],
  proof: { name: "pod.jpg", contentType: "image/jpeg" },
});

if (delivered.status !== "delivered") throw new Error("A delivered event with proof must be delivered.");
console.log("shipment decision test passed");
