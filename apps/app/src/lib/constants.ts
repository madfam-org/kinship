/**
 * Frontend Global Constants
 * Consolidates magic strings, timer delays, and configuration defaults.
 */

export const THEME = {
  TRANSITIONS: {
    FAST: 150,
    NORMAL: 300,
    SLOW: 500,
  },
  OPACITY: {
    MUTED: 0.5,
    ACTIVE: 1,
  },
};

export const API_ROUTES = {
  BASE: '/v1',
  SOCIAL_BATTERY: '/users/me/battery',
  GROUPS: '/groups',
  EVENTS: '/events',
  ASSETS: '/assets',
};

export const SOCIAL_BATTERY = {
  MIN: 0,
  MAX: 100,
  CRITICAL_THRESHOLD: 20,
  LOW_THRESHOLD: 60,
  DEFAULT_HRV: 50,
};

export const POLLING = {
  BATTERY_SYNC_MS: 60000,
  CHAT_REFRESH_MS: 10000,
};

export const TRUST_LAYERS = {
  INNER_CIRCLE: 'INNER_CIRCLE',
  EXTENDED_POLYCULE: 'EXTENDED_POLYCULE',
  OUTER_RING: 'OUTER_RING',
  FRIENDS_OF_FRIENDS: 'FRIENDS_OF_FRIENDS',
};
