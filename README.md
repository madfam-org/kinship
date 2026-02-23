# Kinship

> A secure, end-to-end encrypted platform for navigating complex logistics and energy within enmeshed communities.

Kinship replaces traditional calendars and group chats with a privacy-first, tiered networking system. It is designed specifically for polyamorous networks, intentional communities, chosen families, and community cooperatives.

## Philosophy
Standard calendar tools are built for rigid, corporate "public/private" binaries. Kinship acknowledges the nuance of real human connection through **"Shells of Trust."** 
Instead of tracking everything or nothing, Kinship allows users to explicitly define who sees their deep logistical data, who sees their broad availability, and who sees nothing at all.

## Core Features (Phase 1)
- **Shells of Trust Calendar**: Multi-layered scheduling with varying visibility (Inner Circle, Outer Ring, Friends of Friends).
- **Social Battery Dashboard**: Non-verbal, ambient communication of emotional and physical bandwidth to prevent burnout.
- **WebCrypto E2EE Infrastructure**: 100% end-to-end encrypted group data utilizing client-side RSA-OAEP and AES-GCM wrapping.
- **Event Polling & "Snowball Mode"**: Asynchronous event planning with togglable expanded visibility for community organizing without exposing core network data.

## Monorepo Architecture
This repository is configured as an NPM Workspace containing three core services:

1.  **`apps/app/`**: The main Kinship Next.js application containing the Core E2EE logic, scheduling interfaces, and social networking tools.
2.  **`apps/landing/`**: A public-facing marketing and information site built on Next.js.
3.  **`apps/api/`**: The foundational backend service (Node.js/Express) that will manage secure public-key transit and encrypted state sync.

### Infrastructure & Deployments
- **DevOps**: Managed via [Enclii](https://github.com/madfam-org/enclii) with auto-provisioned domains (e.g., `app.kinship.madfam.io`).
- **Auth**: Managed via [Janua SSO](https://github.com/madfam-org/janua) (OIDC/RS256 JWT). 

*Note: You must have the `NPM_MADFAM_TOKEN` configured in your `.npmrc` to pull the Janua SDKs.*

## Getting Started Locally

```bash
# 1. Install workspace dependencies
npm install

# 2. Run the development suite
npm run dev
```
This will launch all services concurrently if configured, or you can `cd` into individual directories (e.g., `cd app && npm run dev`).

## Documentation
For detailed insights into the project trajectory and technical decisions:
- [Roadmap](docs/ROADMAP.md)
- [Architecture & E2EE Guidelines](docs/ARCHITECTURE.md)
- [Original Product Requirements (PRD)](PRD.md)
- [Manifesto & User Bill of Rights](docs/MANIFESTO.md)
- [Competitive Benchmark](docs/BENCHMARK.md)

## Agent & LLM Interoperability

Kinship follows the [llmstxt.org](https://llmstxt.org/) standard to make this codebase agent-friendly across the MADFAM ecosystem and beyond.

**For AI agents, copilots, or LLMs working in this repository:**

```
# Read this first — it tells you what this repo is, what it does,
# and the key architectural invariants you must not violate.
curl https://raw.githubusercontent.com/madfam-org/kinship/main/llms.txt
```

The [`llms.txt`](./llms.txt) file at the repo root provides:
- A structured map of every important file in the codebase
- Key invariants (never store plaintext, private key never leaves browser)
- Trust tier constants used throughout the code
- Links to docs, schema, API routes, and test suites
