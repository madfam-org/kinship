# **Kinship: Product Requirements Document (PRD)**

## **1\. Product Overview**

**App Summary:**

Kinship is a secure, end-to-end encrypted mobile and web application designed to manage the logistical, temporal, energetic, and economic resources of complex, intersecting social networks. It combines tiered calendar synchronization, real-time social capacity tracking, physical asset pooling, and cooperative business management into a single, privacy-first dashboard.

**Target Audience:**

Polyamorous networks (polycules), intentional communities, chosen families, heavily enmeshed co-parenting structures, neurodivergent individuals, and grassroots small businesses or cooperatives operating within close-knit communities.

## **2\. User Stories & Core Use Cases**

To guide development, features are mapped to specific user outcomes:

* *As a hinge partner in a polycule, I want to share my full calendar with my primary household and only my "free/busy" availability with my secondary partners, so I can maintain my privacy without causing scheduling conflicts.*  
* *As an introvert, I want my inner circle to see when my social battery drops below 20%, so I can execute a graceful exit from a gathering without having to verbally explain myself.*  
* *As a member of a local cooperative, I want to track my non-monetary sweat equity using fair market value, so my time and resource contributions are fairly documented for future profit sharing.*

## **3\. Core Functional Requirements (Phase 1\)**

**Feature 1: "Shells of Trust" Scheduling Architecture**

* **Description:** A multi-layered calendar system that replaces traditional public/private settings with highly customizable relationship tiers.  
* **Requirements:**  
  * Users can create unlimited custom groups (e.g., "Household," "Extended Polycule," "Book Club").  
  * **Cross-Group Availability:** Users can share full event metadata (location, chat, attendees) with their inner circle, while simultaneously broadcasting only a binary "Free/Busy" indicator to their outer rings or secondary networks.  
  * **Event Muting:** The ability to mute irrelevant events from a partner's calendar to maintain ambient awareness without cluttering the primary user's daily agenda.

**Feature 2: Dynamic Social Energy & Capacity Tracking**

* **Description:** A system to quantify and communicate emotional and physical availability to the network, preventing burnout.  
* **Requirements:**  
  * A visual "Social Battery" dashboard that users can manually adjust or link to biometric wearables (like HRV trackers).  
  * Automated alerts sent to trusted inner-circle members when an individual's battery drops below critical thresholds (e.g., 20%), facilitating a "loving exit" from social situations without the need for verbal confrontation.

**Feature 3: Asset Pooling and Virtual Inventory**

* **Description:** A localized sharing economy module strictly limited to vetted, trusted connections.  
* **Requirements:**  
  * Users can photograph and catalog physical items (tools, camping gear, shared vehicles) they are willing to lend.  
  * Automated, software-driven reminders for item returns to eliminate interpersonal friction and mental load.

**Feature 4: "Friends of Friends" Event Hosting & Polling**

* **Description:** A controlled mechanism for integrating intersecting social circles and planning group events asynchronously.  
* **Requirements:**  
  * A "Snowball Mode" for event invites, allowing a host to safely open an event's visibility exclusively to second-degree connections (friends of friends).  
  * Built-in polling for event times and locations to eliminate chaotic group chat planning.

**Feature 5: Mental Load & Domestic Distribution**

* **Description:** Tools to equitably distribute the administrative burden of relationships and households.  
* **Requirements:**  
  * Shared, real-time grocery lists and asynchronous chore tracking.  
  * In-event chat threads to keep transient logistical chatter tied to specific calendar events, keeping primary SMS/messaging apps clear.

## **4\. Long-Term Functional Requirements (Enterprise & Community Initiatives)**

**Feature 6: Contribution & Sweat Equity Tracker**

* **Description:** A system to fairly quantify and reward non-monetary contributions to grassroots businesses or community initiatives.  
* **Requirements:**  
  * Integration of dynamic equity models, such as the "Slicing Pie" framework, which tracks at-risk contributions (time, money, intellectual property, and personal resources) based on fair market rates to automatically calculate standardized "slices" of the equity pie.  
  * Tools to establish clear roles, define metrics, and keep transparent, real-time records updated via monthly or quarterly reviews to prevent future disputes.

**Feature 7: Non-Hierarchical Project Management**

* **Description:** Task and workflow boards designed specifically for flat, collaborative organizational structures rather than traditional top-down corporate management.  
* **Requirements:**  
  * Support for fluid roles, rotating responsibilities, and consensus-based collective decision-making protocols.  
  * Transparent information architecture that ensures all community members have equal access to project data, fostering an environment where leadership is a shared, dynamic responsibility rather than a fixed title.

**Feature 8: Collective Treasury & Internal Crowdfunding**

* **Description:** Financial management tools for shared economic pools.  
* **Requirements:**  
  * A collaborative budgeting module that provides real-time visibility into shared funds, expenses, and cash flow across different community sub-groups, operating securely with role-based access.  
  * Internal crowdfunding mechanisms, allowing community members to easily raise capital or provide micro-loans for a peer's new business venture or emergency fund without relying on public platforms or traditional banks.

**Feature 9: Trust-Based Circular Economy Marketplace**

* **Description:** An expansion of the physical asset pooling feature into a fully functional local economy network.  
* **Requirements:**  
  * Tools for mission-driven social enterprises and community members to engage in short-loop economic activities, such as upcycling, repairing, refurbishing, or exchanging localized goods and services within their vetted network.  
  * A mechanism to leverage "bridging" relationships (friends-of-friends) to foster knowledge spillovers, disseminate community business offerings, and utilize social capital as a currency to bypass traditional marketing barriers.

## **5\. Non-Functional Requirements & Security**

**Privacy & Cryptography:**

* **End-to-End Encryption (E2EE):** All calendar entries, financial data, uploaded attachments, and in-event chats must utilize E2EE.  
* **Multi-User Encryption Architecture:** To allow multiple users to collaborate securely, the system will utilize a common group symmetric key. This group key is encrypted individually by each user's unique secret (e.g., public keys generated on the client device), ensuring the central server never has access to unencrypted data.  
* **Periodic Key Rotation:** The system will implement routine key rotation (e.g., issuing new keypairs when users log in from new devices or when group membership changes) to maintain security integrity as members enter or leave specific social groups.  
* **Zero-Data Harvesting:** The application must operate on a premium subscription model (or freemium with strict boundaries) to entirely eliminate the need for advertising or selling user location/behavioral data.

**Performance & Integration:**

* Must feature baseline, two-way synchronization with universal aggregators (Google Calendar, Apple Calendar, Outlook) so users are not forced to completely abandon their professional scheduling tools.  
* Cross-platform availability (iOS, Android, and Web) is mandatory to accommodate varying technological preferences within extended communities.

## **6\. Out of Scope**

To manage expectations and prevent scope creep, the following elements are explicitly out of scope for the Kinship platform:

* Algorithmic public discovery feeds or timeline scrolling.  
* Targeted advertising modules or data brokering architectures.  
* Public marketplaces permitting transactions with unvetted strangers outside the established network.  
* Dating app swiping mechanisms or matchmaking algorithms.