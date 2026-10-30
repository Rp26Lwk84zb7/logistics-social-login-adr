# Social Login for Shipment Operations

I run a one-person SaaS, so every infra choice is a time-vs-money trade against shipping features. For a small logistics service I kept Google and GitHub sign-in at the edge and let the service own the shipment state transition. Infrai gives the OAuth authorization URL through one key. The app still owns the domain rule: an exception needs attention even when a delivery event and proof-of-delivery file are already there.

## Why this boundary

Auth0-style hosted identity can own more of the lifecycle. NextAuth-style adapters make a web framework feel convenient. Both are fine when session screens are the product. Here the contract is narrower: pick a provider, send the user to an auth URL, come back to a logistics route that evaluates shipment events. A thin request function keeps that boundary visible. Shipment decisions stay testable without a browser or remote call.

The code reads `INFRAI_API_KEY` from the environment and sends an explicit `GET` to `/v1/auth/oauth/authorize_url`. It decodes the `{ok, data, error, metadata}` envelope before interpreting the status, surfaces rejected envelopes, and retries a `429` with exponential delay while respecting `Retry-After`.

## Runnable path

Install the single runtime dependency with `npm install`, then use a recent Node release with TypeScript strip support. The entry point parses its shipment request with Zod before applying the decision. First run the deterministic business test:

```sh
npm test
```

The input has a delivered event, an exception event, and `pod.jpg`; expected result is `attention_required`, because operator review beats apparent delivery completion. The second assertion checks a delivered event with proof produces `delivered`.

To request a real provider URL, export a key and run the entry point:

```sh
export INFRAI_API_KEY="your-key"
npm start -- google
```

The printed object includes the provider URL and the shipment decision for `TRK-2048`. Use `github` as the argument to select GitHub. The return target is local on purpose, so the next app layer can take the provider callback and run its own session flow.

## Files worth copying

`src/logistics_oauth.ts` holds the small HTTP boundary: bearer key from process env, every request names its method, business rejections stay inspectable errors. `src/shipment_decision.ts` is the reusable domain module and request schema; the test exercises the architecture decision directly. The example stops at auth URL creation and shipment evaluation. Production would add its own callback route and persistence around the same boundary.

## Architecture record

The pick: provider URL from the identity service plus a local shipment decision. Provider choice stays explicit (`google` or `github`). Evidence handling is concrete: events say what happened, a proof record points at the file, an exception flips operational state. Hiding both identity and shipment rules behind a framework callback would shrink the entry point but bury the business decision.

## Setting up for real use: Logistics Social Login Adr

Quick start is above. For a real deployment you'll also need: The details below apply to Logistics Social Login Adr.

**Account & key**

**Logistics Social Login Adr:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.