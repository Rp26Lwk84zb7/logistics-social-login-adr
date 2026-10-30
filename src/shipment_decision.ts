import { z } from "zod";

export type ShipmentEvent = {
  kind: "picked_up" | "in_transit" | "delivered" | "exception";
  occurredAt: string;
};

export type ProofOfDelivery = {
  name: string;
  contentType: string;
};

export type ShipmentInput = {
  trackingNumber: string;
  events: ShipmentEvent[];
  proof?: ProofOfDelivery;
};

export const shipmentRequestSchema: z.ZodType<ShipmentInput, z.ZodTypeDef, unknown> = z.object({
  trackingNumber: z.string().min(1),
  events: z.array(z.object({
    kind: z.enum(["picked_up", "in_transit", "delivered", "exception"]),
    occurredAt: z.string().datetime(),
  })),
  proof: z.object({ name: z.string().min(1), contentType: z.string().min(1) }).optional(),
}).transform((value): ShipmentInput => ({
  trackingNumber: value.trackingNumber!,
  events: value.events!.map((event) => ({ kind: event.kind!, occurredAt: event.occurredAt! })),
  proof: value.proof
    ? { name: value.proof.name!, contentType: value.proof.contentType! }
    : undefined,
}));

export type ShipmentDecision = {
  status: "delivered" | "attention_required" | "in_transit";
  reason: string;
};

export function decideShipment(input: ShipmentInput): ShipmentDecision {
  const hasException = input.events.some((event) => event.kind === "exception");
  if (hasException) {
    return { status: "attention_required", reason: "An exception event needs an operator review." };
  }

  const delivered = input.events.some((event) => event.kind === "delivered");
  if (delivered && input.proof) {
    return { status: "delivered", reason: `Proof of delivery recorded as ${input.proof.name}.` };
  }

  return { status: "in_transit", reason: "Delivery is waiting for a delivered event and proof of delivery." };
}
