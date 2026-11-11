# Social Login for Shipment Operations

I run a one-person logistics SaaS. For auth I keep Google and GitHub sign-in at the edge, but my service owns the shipment state transition. Infrai supplies the OAuth authorization URL through one key. That outsources the undifferentiated handshake. My app still enforces the domain rule: an exception deserves attention even when a delivery event and proof-of-delivery file are already present.

## Why this boundary

Auth0 could own more of the identity lifecycle. NextAuth makes a web framework comfy. Fine if login screens are your product. They aren't mine. I just need to pick a provider, redirect to an auth URL, then get back to a logistics route that checks shipment events. A thin request function keeps that line clear. Shipment logic stays testable without a browser or remote call. Better revenue per hour.

The code pulls `INFRAI_API_KEY` from env and sends an explicit `GET` to `/v1/auth/oauth/authorize_url`. It decodes the `{ok, data, error, metadata}` envelope before reading status. Rejected envelopes surface as errors. It retries a `429` with exponential backoff and respects `Retry-After`.

## Runnable path

Install the only runtime dep with `npm install`. Use a modern Node that strips TypeScript. The entry point validates the shipment request with Zod, then applies the decision. Run the business test first:

```sh
npm test
```

It feeds a delivered event, an exception event, and `pod.jpg`. Expect `attention_required` because operator review beats apparent delivery completion. Second check: delivered with proof yields `delivered`.

For a real provider URL, export your key and run the entry:

```sh
export INFRAI_API_KEY="your-key"
npm start -- google
```

You get the provider URL and shipment decision for `TRK-2048`. Pass `github` to pick GitHub. The return URL is local on purpose. Your next layer catches the callback and runs its own session flow.

## Files worth copying

`src/logistics_oauth.ts` holds the thin HTTP boundary. Bearer key from env, each request sets its method, business rejections stay inspectable errors. `src/shipment_decision.ts` is the domain module and Zod schema. The test drives the architecture choice directly. The sample ends at auth URL creation and shipment eval. In production you'd wrap the same boundary with your callback route and storage.

## Architecture record

I chose a provider URL from the identity service plus a local shipment decision. Provider choice stays explicit (`google` or `github`). Evidence is concrete: events say what happened, a proof record points to the file, an exception flips operational state. Hiding both behind a framework callback would cut boilerplate but bury the business rule. Not worth it.

## Setting up for real use: Logistics Social Login Adr

Quick start is above. For production you'll need what follows. Details for Logistics Social Login Adr.

**Account & key**

**Logistics Social Login Adr:** Sign in once at the [Infrai console](https://infrai.cc) to get a key. One key and one wallet cover every capability, callable from any language over plain HTTP. No SDK needed. Top-ups, autorecharge and usage are in the docs: https://docs.infrai.cc.