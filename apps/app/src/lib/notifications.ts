"use client";

import { useEffect, useRef, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

export interface BatteryAlertPayload {
  userId: string;
  email: string;
  level: number;
  timestamp: string;
}

export interface NewEventPayload {
  eventId: string;
  hostId: string;
  timestamp: string;
}

interface EventStreamHandlers {
  onBatteryAlert?: (data: BatteryAlertPayload) => void;
  onNewEvent?: (data: NewEventPayload) => void;
  onError?: (err: Event) => void;
}

/**
 * useEventStream (Phase 6.4)
 *
 * Subscribes to the SSE stream at GET /v1/events/stream/:userId.
 * Automatically reconnects after every 3s on connection drop.
 *
 * Events fired by the server:
 *   - `battery-alert`  — a network member's battery dropped below 20
 *   - `new-event`      — a new event was shared with this user's groups
 *
 * Usage:
 *   useEventStream(currentUser.id, {
 *     onBatteryAlert: ({ email, level }) => toast(`${email} is low (${level}%)`),
 *     onNewEvent:     ({ eventId })      => invalidateEventCache(eventId),
 *   });
 */
export function useEventStream(userId: string | undefined, handlers: EventStreamHandlers) {
  const handlersRef = useRef(handlers);
  // Keep handlers ref fresh without triggering effect re-runs
  useEffect(() => { handlersRef.current = handlers; });

  const connect = useCallback(() => {
    if (!userId) return null;

    const es = new EventSource(`${API_BASE}/events/stream/${userId}`);

    es.addEventListener('battery-alert', (e: MessageEvent) => {
      try {
        const data: BatteryAlertPayload = JSON.parse(e.data);
        handlersRef.current.onBatteryAlert?.(data);
      } catch { /* ignore malformed payloads */ }
    });

    es.addEventListener('new-event', (e: MessageEvent) => {
      try {
        const data: NewEventPayload = JSON.parse(e.data);
        handlersRef.current.onNewEvent?.(data);
      } catch { /* ignore malformed payloads */ }
    });

    es.onerror = (err) => {
      handlersRef.current.onError?.(err);
      // EventSource natively reconnects — no manual retry needed
    };

    return es;
  }, [userId]);

  useEffect(() => {
    const es = connect();
    return () => es?.close();
  }, [connect]);
}
