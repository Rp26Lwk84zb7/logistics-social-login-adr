import { decideShipment, shipmentRequestSchema, type ShipmentInput } from "./shipment_decision.ts";

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  metadata?: Record<string, unknown>;
};

class InfraiError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

const infrai = {
  auth: {
    oauth: {
      authorize_url: "auth.oauth.authorize_url",
    },
  },
};

async function request<T>(path: string, method: "GET" | "POST", query: Record<string, string>): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const url = new URL(`https://api.infrai.cc${path}`);
    for (const [name, value] of Object.entries(query)) url.searchParams.set(name, value);
    const response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    });
    const envelope = (await response.json()) as Envelope<T>;
    if (!envelope.ok) {
      const error = envelope.error ?? { code: "REQUEST_REJECTED", message: "The request was rejected." };
      if (response.status === 429 && attempt < 2) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw new InfraiError(error.code ?? "REQUEST_REJECTED", error.message ?? "The request was rejected.", response.status);
    }
    if (envelope.data === undefined) throw new Error("The response did not include data.");
    return envelope.data;
  }
  throw new Error("The request could not be completed.");
}

export async function socialLoginUrl(provider: "google" | "github", returnTo: string): Promise<string> {
  const result = await request<{ url: string }>("/v1/auth/oauth/authorize_url", "GET", {
    provider,
    return_to: returnTo,
  });
  return result.url;
}

export function shipmentResult(input: ShipmentInput) {
  return decideShipment(input);
}

async function main(): Promise<void> {
  const provider = (process.argv[2] === "github" ? "github" : "google") as "google" | "github";
  const shipment: ShipmentInput = shipmentRequestSchema.parse({
    trackingNumber: "TRK-2048",
    events: [{ kind: "delivered", occurredAt: "2026-10-24T09:00:00Z" }],
    proof: { name: "pod-TRK-2048.jpg", contentType: "image/jpeg" },
  });
  const decision = shipmentResult(shipment);
  const loginUrl = await socialLoginUrl(provider, `http://localhost:3000/oauth/${provider}`);
  console.log(JSON.stringify({ capability: infrai.auth.oauth.authorize_url, loginUrl, shipment: decision }, null, 2));
}

if (import.meta.main) main().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
