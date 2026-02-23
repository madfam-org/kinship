# Kinship Competitive Benchmark

This document synthesizes findings from platforms operating in adjacent problem spaces—social scheduling, capacity tracking, asset pooling, and cooperative management—to identify gaps and define Kinship's unique market positioning.

## 1. Social Scheduling & Tiered Calendars

**Competitors:** Howbout, TimeTree, PlanPop, OurCal, Google Calendar.

*   **Current State:** Apps like Howbout and TimeTree excel at UX for casual planning among friends. OurCal offers a privacy-first approach to group calendars.
*   **The Gap:** Most depend on centralized servers with varying privacy promises. They are highly siloed; schedules aren't intrinsically tied to the user's emotional readiness or broader community commitments. 
*   **Kinship's Position:** Kinship utilizes **Zero Trust "Shells of Trust"**. We don't just share events; we mathematically control who sees the *nature* of the event versus who just sees a "Busy" block, managed completely client-side.

## 2. Social Capacity & Energy Tracking (Spoon Theory)

**Competitors:** IntroEnergy, My Social Battery, SpoonieDay, Spoons.

*   **Current State:** Tracking "spoons" or social batteries is largely reduced to personal journaling or very simplistic alerts. They help introverts and those with chronic illnesses understand their boundaries.
*   **The Gap:** They lack *network-level awareness*. Journaling your battery doesn't automatically protect your time from incoming requests from your outer ring of friends.
*   **Kinship's Position:** The Kinship **Social Battery** intercepts the scheduling layer natively. If a user's capacity drops below a threshold, the platform can automatically reject non-Inner Circle requests or mask calendar slots as "Busy" to enforce recovery without requiring the user to send exhausting decline messages.

## 3. Peer-to-Peer Asset Sharing & Tool Pooling

**Competitors:** Peerby, FriendWithA, RentMyTool, ToolShare (Local Tool Libraries).

*   **Current State:** Platforms attempting to turn neighborhoods into "Airbnbs for tools." 
*   **The Gap:** The "stranger danger" friction is high. People are hesitant to lend expensive tools to absolute strangers, requiring insurance layers that increase costs. Conversely, local tool libraries require physical infrastructure to house equipment.
*   **Kinship's Position:** Kinship leverages **Trust Capital** rather than financial collateral. Because the platform relies on the mapped "Shells of Trust," you are lending only to verified members of your defined community or extending to a friend-of-a-friend. By utilizing E2EE, the existence of your assets is entirely invisible to the untrusted internet.

## 4. Cooperative Business Management & Secure Coordination

**Competitors:** Loomio, NextCloud, Group-Office, Wire, Signal (for comms).

*   **Current State:** Robust, heavily modular platforms exist for managing cooperative finances (Coopco) or democratic decision-making (Loomio). Signal/Wire offer E2EE communications but lack structured organizational features.
*   **The Gap:** Extreme fragmentation. A collective trying to run a business while maintaining radical privacy must stitch together Signal, NextCloud, and Loomio, fragmenting their identity and operations. 
*   **Kinship's Position:** A holistic approach. Kinship bridges the gap between *personal* social capacity and *economic* collective action. It allows a user to maintain a single secure cryptographic identity that spans their intimate social schedule, their neighborhood tool loans, and their cooperative business votes, natively E2EE.

---

## Conclusion & Strategic Vectors

The market is saturated with "point solutions" (an app just for spoons, an app just for lending drills, an app just for chatting). 

**Kinship is positioned not as an app, but as a secure operating system for a community.**

To dominate this niche, the **Roadmap** must prioritize features that tightly intertwine these distinct modules so the value multiplies:
1.  **Inter-Module Automation:** For example, tying the "Social Battery" to "Cooperative Task Assignments" (e.g., if battery is red, you aren't assigned the heavy lifting at the co-op this week).
2.  **Trust-Layered Economy:** Utilizing the "Outer Ring" vs "Inner Circle" logic to define tiered pricing or collateral requirements for shared assets.
3.  **Federation Capabilities:** Allowing distinct local Kinship pods to trust one another to scale the asset/gig economy gracefully.
