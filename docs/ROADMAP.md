# Kinship Roadmap

This document maps the trajectory of the Kinship platform from foundational proofs-of-concept to a secure, localized gig-and-asset sharing economy.

> **Priority principle:** Risk → Correctness → Completeness → Differentiation.
> Janua SSO hardening is intentionally deferred to Phase 11 — the product architecture is designed so auth is a final wrapping layer, not a prerequisite for core feature development.

---

## Phase 1: Foundational Proof of Concepts & Security ✅
*Focus: Establishing the core structural logic and proving the secure architecture.*

-   [x] **"Shells of Trust" Architecture:** Basic rendering and data models allowing the intersection of differing trust tiers (Inner Circle, Outer Ring).
-   [x] **Social Capacity Tracking:** The "Social Battery" UI and mechanisms for automated alerts to prevent non-verbal burnout scenarios.
-   [x] **WebCrypto E2EE Mock:** Client-side architecture for RSA-OAEP asymmetric keypairs and AES-GCM group key wrapping, ensuring sensitive logistical data is opaque to the database.
-   [x] **Event Polling & Snowball Mode:** Expanding event access asynchronously, explicitly lowering encryption parameters down to the "Friends of Friends" tier.

## Phase 2: DevOps & Architecture Hardening ✅
*Focus: Transitioning from local prototypes to cloud-ready deployments.*

-   [x] **Monorepo Migration:** Restructuring into an NPM workspace (`app`, `api`, `landing`).
-   [x] **Janua AuthN Integration (provider):** Wrapping the frontend with Madfam's `Janua` OIDC provider component. *(Full session wiring deferred to Phase 11.)*
-   [x] **Enclii Deployment Pipes:** Building `Dockerfile` and manifest (`enclii.yaml`) pipelines for automated Cloudflare zero-trust ingress and K3S replication.

## Phase 3: Data Persistence & Key Management ✅ (partial)
*Focus: Connecting the encrypted state to a persistent datastore.*

-   [x] **PostgreSQL Schema:** Prisma ORM modeling Users, Groups, GroupMemberships, Events, WrappedKeys, Assets, LoanRequests, AssetWrappedKeys, TreasuryPools, and LedgerEntries.
-   [x] **Public Key Directory:** API routes for users to register and retrieve RSA public keys to execute E2EE AES-GCM envelopment (see `POST /v1/users`, `GET /v1/users/:email`).

## Phase 4: Asset Economy & Treasury ✅ (partial)
*Focus: Moving beyond temporal logistics into economic resource pooling.*

-   [x] **Virtual Asset Inventory:** Securely logging physical assets (tools, gear) available for lending within the vetted trust tiers.
-   [x] **Collective Treasury:** Internal crowdfunding module with transparent ledger (`TreasuryPool`, `LedgerEntry`), atomic pledge transactions, and auto-FUNDED status promotion.
-   [x] **Inter-Module Automation:** Social Battery directly gates cooperative asset visibility and task assignments.
-   [x] **Trust-Layered Economy:** `autoApproveLayer` on assets enforces lending access via cryptographic Shell of Trust.

---

## Phase 5: Security & Zero Trust Hardening 🔒 *(next)*
*Focus: Closing gaps where the Zero Trust architecture is not yet fully enforced.*

-   [x] **API Authentication Middleware:** HS256 JWT Bearer validation on every non-healthcheck route via `middleware/auth.js`. Drop-in swappable for Janua RS256 JWKS in Phase 11.
-   [x] **Encrypt Poll Options:** `PollOption.encryptedValue` field added to Prisma schema; `POST /v1/events` accepts and persists it; `encryptText`/`decryptText` helpers added to `crypto.ts`.
-   [x] **Timing Metadata Leak Fix:** `startTime`, `endTime`, and `pollOptions` are now nulled/stripped for busy-broadcast-only viewers in `GET /v1/events/authorized/:userId`.
-   [x] **RSA Key Size Upgrade:** `generateUserKeyPair()` upgraded from `modulusLength: 2048` → `4096` in `crypto.ts`.
-   [x] **Key Rotation Flow:** `KeyRotationRequest` Prisma model added; `POST /v1/groups/:id/rotate-keys` and `POST /v1/groups/:id/wrapped-keys` routes implemented; `KeyRotationPanel.tsx` client-side ceremony UI built.

## Phase 6: API Hardening & Performance 🛠️
*Focus: Making the API production-safe before adding more features on top of it.*

-   [x] **Pagination:** `limit`/`offset` query params and `{ data, meta: { total, limit, offset } }` envelope added to all 5 list endpoints: events, assets, loan requests, treasury pools, and ledger entries.
-   [x] **Fix N+1 Query in Network Endpoint:** Collapsed nested double-`findMany` into a single Prisma relational `where` query in `GET /v1/users/:userId/network`.
-   [x] **Restrict User Lookup by Email:** Already gated as a side-effect of Phase 5 — `GET /v1/users/:email` is not in `UNAUTHENTICATED_ROUTES`, so auth middleware covers it automatically.
-   [x] **Push Notifications:** SSE stream at `GET /v1/events/stream/:userId` with `battery-alert` fan-out on low battery; `notifications.ts` React hook wraps `EventSource` with auto-reconnect.

## Phase 7: Frontend Architecture & Mobile Responsiveness 📱
*Focus: Addressing structural frontend debt before building more features on top of the single-page layout.*

-   [ ] **App Router Routing:** Give each major module (`/calendar`, `/inventory`, `/planning`, `/treasury`) its own Next.js App Router route. The single-page tab toggle in `page.tsx` won't scale.
-   [ ] **Mobile-Responsive Layouts:** Add Tailwind breakpoint classes and CSS media queries across all component grids. The PRD mandates iOS/Android/Web — currently no breakpoints exist.
-   [ ] **Wire Real Session Identity:** Replace hardcoded `currentUser = { id: 'u1', name: 'Alice' }` in `page.tsx` with a live session context once Phase 5 middleware is in place.
-   [ ] **Frontend Test Suite:** Add Jest + React Testing Library coverage for crypto utilities and key UI components. Currently zero frontend tests; pre-commit hooks only guard the API.
-   [ ] **Encrypted Binary Attachments:** Extend the WebCrypto pipeline to handle binary blobs for asset photos and event receipts. *(Completes Phase 3 checklist.)*

## Phase 8: PRD Core Feature Completion 📅
*Focus: Shipping the remaining PRD Phase 1 features that have no implementation yet.*

-   [ ] **External Calendar Sync:** Two-way, free/busy-only integration with Google Calendar, Apple Calendar, and Outlook. Plaintext event details must never leave the E2EE envelope.
-   [ ] **Event Muting:** Allow users to hide specific partner calendar events from their primary agenda while maintaining ambient awareness. The `mutedByUserId` field exists in the `Event` type model but is not wired.
-   [ ] **In-Event Chat Threads:** E2EE chat tied to a specific calendar event, reusing the event's AES-GCM symmetric key. Keeps logistics out of primary SMS/messaging apps.
-   [ ] **Shared Lists & Chore Tracking:** Collaborative grocery/task lists tied to a household group, with equitable distribution and completion tracking.
-   [ ] **Biometric / Wearable Integration:** Read-only HRV data feed (e.g., from Garmin, Apple Health) piped into the Social Battery, reducing manual updates.

## Phase 9: Cooperative Economy Features 🤝
*Focus: The features that define Kinship's strongest competitive differentiation from siloed market alternatives.*

-   [ ] **Non-Hierarchical Workflow Boards:** Consensus-based task assignment with fluid roles, rotating responsibilities, and collective decision-making protocols.
-   [ ] **Sweat Equity Tracker:** "Slicing Pie" dynamic equity model to fairly quantify time, money, IP, and resource contributions with monthly/quarterly reviews.
-   [ ] **Community Micro-Lending:** Peer-to-peer micro-loan mechanism between community members, extending the Treasury beyond one-way crowdfunding pledges.
-   [ ] **Trust-Based Circular Economy Marketplace:** Upcycling, repair, and localized goods/services exchange within the vetted trust network — expands Asset Pooling into a full local economy layer.

## Phase 10: Federation & Scale 🌐
*Focus: Enabling independent Kinship pods to interoperate without centralizing data.*

-   [ ] **Pod Federation:** Allow independent Kinship cooperative deployments to establish cross-pod trust relationships and participate in a shared asset and gig economy at scale.

## Phase 11: Janua SSO Auth Hardening 🔑
*Focus: Full production auth wired end-to-end across frontend and backend.*

-   [ ] **Janua OIDC Session Parsing in API:** Validate RS256 JWT claims from Janua on every protected, API route using scoped middleware.
-   [ ] **Role-Based API Authorization:** Drive access control from Janua JWT claims (e.g., group admin vs. member vs. guest permissions).
-   [ ] **Keypair Lifecycle Tied to Janua Sessions:** Trigger RSA keypair generation on first login from a new device, and initiate group key re-wrapping on session events (e.g., device revocation, group membership changes).
