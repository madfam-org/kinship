/**
 * Enums representing the specific Trust Layers (or Shells) in the system.
 */
export enum TrustLayer {
  InnerCircle = 'INNER_CIRCLE', // Primary household, highly enmeshed partners
  ExtendedPolycule = 'EXTENDED_POLYCULE', // Secondary partners, close friends
  OuterRing = 'OUTER_RING', // Co-workers, distant friends, casual acquaintances
  FriendsOfFriends = 'FRIENDS_OF_FRIENDS', // Second-degree connections (Snowball Mode)
}

/**
 * Core User entity
 */
export interface User {
  id: string;
  name: string;
  avatarUrl: string;
  // Dynamic capacity metric (0-100%)
  socialBattery: number;
}

/**
 * Automate threshold warnings for trusted contacts
 */
export interface BatteryAlert {
  userId: string;
  timestamp: Date;
  level: number;
  message: string;
}

/**
 * Represents a contact relationship and the trust layer assigned to them
 */
export interface Connection {
  userId: string;
  assignedLayer: TrustLayer;
}

/**
 * Represents an Event Poll Option (Time or Location)
 */
export interface PollOption {
  id: string;
  label: string; // e.g., "Friday 7PM" or "Alice's House"
  votes: string[]; // Array of User IDs who voted for this
}

/**
 * A calendar event with multi-layer visibility logic
 */
export interface Event {
  id: string;
  hostId: string;

  // Metadata visible to Inner Circle / authorized layers
  title: string;
  description?: string;
  
  // Established details (null if still polling)
  startTime?: Date;
  endTime?: Date;
  location?: string;
  
  attendees: User[];

  // Polling Data
  isPolling: boolean;
  timePolls?: PollOption[];
  locationPolls?: PollOption[];

  // Min trust layer required to see full event metadata
  minTrustLayerForDetails: TrustLayer;

  // If false, the event doesn't show up at all for layers underneath the min trust layer.
  // If true, it shows as a generic "Free/Busy" block for unauthorized layers.
  broadcastBusyState: boolean;

  // "Snowball Mode": explicitly opens visibility of the event up to Friends of Friends
  isSnowball: boolean;

  // Users who have explicitly muted this event
  mutedByUserId?: string[];
}

/**
 * Mock entity to represent the Multi-User Encryption Group Key architecture
 */
export interface GroupKey {
  groupId: string;
  symmetricKey: string; // The shared key encrypting the group's data
  // Map of userId -> the symmetricKey, encrypted by that specific user's public key
  encryptedKeysByMember: Record<string, string>;
}
