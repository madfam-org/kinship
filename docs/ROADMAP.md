# Kinship Roadmap

This document maps the trajectory of the Kinship platform from foundational proofs-of-concept to a secure, localized gig-and-asset sharing economy.

## Phase 1: Foundational Proof of Concepts & Security (Current)
*Focus: Establishing the core structural logic and proving the secure architecture.*

-   [x] **"Shells of Trust" Architecture:** Basic rendering and data models allowing the intersection of differing trust tiers (Inner Circle, Outer Ring).
-   [x] **Social Capacity Tracking:** The "Social Battery" UI and mechanisms for automated alerts to prevent non-verbal burnout scenarios.
-   [x] **WebCrypto E2EE Mock:** Client-side architecture for RSA-OAEP asymmetric keypairs and AES-GCM group key wrapping, ensuring sensitive logistical data is opaque to the database.
-   [x] **Event Polling & Snowball Mode:** Expanding event access asynchronously, explicitly lowering encryption parameters down to the "Friends of Friends" tier.

## Phase 2: DevOps & Architecture Hardening
*Focus: Transitioning from local prototypes to cloud-ready deployments.*

-   [x] **Monorepo Migration:** Restructuring into an NPM workspace (`app`, `api`, `landing`).
-   [x] **Janua AuthN Integration:** Wrapping the frontend and future backend routes with Madfam's `Janua` OIDC provider.
-   [x] **Enclii Deployment Pipes:** Building `Dockerfile` and manifest (`enclii.yaml`) pipelines for automated Cloudflare zero-trust ingress and K3S replication.

## Phase 3: Data Persistence & Key Management
*Focus: Connecting the encrypted state to a persistent datastore.*

-   [ ] **PostgreSQL Schema:** Setting up Prisma ORM to model Users, Groups, Devices, and Encrypted Payload envelopes.
-   [ ] **Public Key Directory:** Creating API routes whereby users can securely query other users' public keys to successfully execute the E2EE AES-GCM envelopment.
-   [ ] **Push Notifications:** Secure alerts for low-battery pings and event updates.
-   [ ] **File/Image Attachments:** Extending encryption to binary blobs to support encrypted asset images or receipts.

## Phase 4: Long-Term Objectives (Enterprise & Community)
*Focus: Moving beyond temporal logistics into economic resource pooling.*

-   [ ] **Virtual Asset Inventory:** Securely logging physical assets (tools, gear) available for lending within the vetted trust tiers.
-   [ ] **Sweat Equity Tracking:** A "Slicing Pie" dynamic equity model to fairly quantify and review non-monetary operations in community projects.
-   [ ] **Collective Treasury:** Internal crowdfunding and highly constrained, transparent ledger systems for community subgroups. 
-   [ ] **Non-Hierarchical Workflow Boards:** Consensus-based task assignment mimicking a circular economy logic rather than top-down corporate management.
