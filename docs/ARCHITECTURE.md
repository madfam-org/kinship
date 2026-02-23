# Kinship Architecture Overview

Kinship is designed fundamentally around **Zero Trust** concepts. The server should be ignorant of the user's logistical activities. If the database is compromised, the attacker should only find encrypted blobs of scheduling and chat data.

## 1. Cryptographic Model
Kinship utilizes the native browser `window.crypto.subtle` API to handle all encryption exclusively on the client device.

### Process Flow
1. **Asymmetric Identity (RSA-OAEP):** 
   - When a user logs in, their device generates an RSA-OAEP keypair. 
   - The Public Key is uploaded to the Kinship `api/` directory (serving as a public key registry). 
   - The Private Key **never leaves the device**. It is stored non-extractably in `IndexedDB`.
2. **Symmetric Group Transit (AES-GCM):** 
   - When an event or chat thread is created, the instigating client generates a fast AES-GCM symmetric key. 
   - The payload (title, location, message) is encrypted with this AES-GCM key.
3. **Key Wrapping (The Envelope):** 
   - The instigator requests the Public Keys of all invited attendees (`Inner Circle`, `Household`, etc.).
   - The instigator encrypts the single AES-GCM key individually with every attendee's RSA-OAEP Public Key.
   - The server stores the encrypted payload alongside the array of "Wrapped" keys.
4. **Decryption:**
   - An attendee receives the event payload. 
   - They find their specifically wrapped AES-GCM key, decrypt it using their local RSA-OAEP Private Key housed in IndexedDB.
   - They use the unwrapped AES-GCM key to decrypt the event payload.

## 2. Shells of Trust Structure
Most platforms handle data booleanly: Public or Private. Kinship uses localized "Shells".
The encrypted envelope (described above) contains metadata specifying the minimum authorization layer (`Inner Circle`, `Outer Ring`, `Friends of Friends`). The frontend application enforces rendering based on this metadata.

### The Problem with Zero-Knowledge Availability
If all event details are end-to-end encrypted, how can an `Outer Ring` user know if a host is "Busy" without being authorized to read the event?

### The "Busy Broadcast" Solution
The `Event` data model includes an unencrypted boolean toggle: `broadcastBusyState`.
If `true`, the unencrypted database row contains the `startTime` and `endTime` but **not** the event title or location. Thus, outer rings see a generic "Busy" block allowing scheduling without violating privacy.

## 3. Deployment Stack
- **Frontend / Monorepo:** Next.js (App Router), React 19, Tailwind CSS + Shadcn UI primitives.
- **Backend Infrastructure:** Node.js/Express, deployed via Enclii.
- **Identity:** Janua SSO integration handles the `AuthN` barrier before the `AuthZ` cryptographic barrier is engaged.
- **Database:** PostgreSQL (via Prisma ORM). Schema at `apps/api/prisma/schema.prisma`.

## 4. Agent & LLM Interoperability

This repo follows the [`llms.txt`](https://llmstxt.org/) standard. Before working in this codebase, read the root [`llms.txt`](../llms.txt) file. It documents all critical invariants (e.g., never store plaintext, private keys never leave the browser), the Trust Tier hierarchy, and maps every important source file.
