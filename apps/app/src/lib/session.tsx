"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useEventStream } from '@/lib/notifications';
import { useToast } from '@/components/ui/toast';

// --------------------------------------------------------------------------
// User model (Phase 7.3)
// In production this comes from the Janua SDK session.
// Falls back to a stub when NEXT_PUBLIC_JANUA_CLIENT_ID is unset (dev/test).
// --------------------------------------------------------------------------
export interface CurrentUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl: string;      // required to satisfy User model in types.ts
  socialBattery: number;
}

const DEV_STUB: CurrentUser = {
  id: 'u1',
  name: 'Alice',
  email: 'alice@kinship.local',
  avatarUrl: '',
  socialBattery: 80,
};

const UserContext = createContext<CurrentUser>(DEV_STUB);

export function useUser(): CurrentUser {
  return useContext(UserContext);
}

interface UserProviderProps {
  children: React.ReactNode;
}

/**
 * UserProvider (Phase 7.3)
 *
 * Provides session identity to the entire (app) route group.
 * When NEXT_PUBLIC_JANUA_CLIENT_ID is configured, reads the Janua Next.js SDK
 * session object and maps it onto `CurrentUser`. Falls back to the dev stub
 * so dev and test workflows are unchanged.
 *
 * Also establishes the SSE push stream (Phase 6.4) once per session, wiring
 * battery-alert toasts to the notification system.
 */
export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<CurrentUser>(DEV_STUB);
  const { toast } = useToast();

  useEffect(() => {
    // Phase 11 will replace this with Janua SDK session parsing:
    //   import { getSession } from '@janua/nextjs-sdk';
    //   const session = await getSession();
    //   if (session?.user) setUser({ id: session.user.sub, name: session.user.name, ... });
    //
    // For now, stub is permanent in dev mode. Reads env to detect Janua config.
    const januaClientId = process.env.NEXT_PUBLIC_JANUA_CLIENT_ID;
    if (!januaClientId) {
      // Dev mode: keep stub
      return;
    }
    // TODO Phase 11: parse Janua session here
  }, []);

  // Wire SSE push stream — established once per session
  useEventStream(user.id, {
    onBatteryAlert: ({ email, level }) => {
      toast(`⚡ ${email ?? 'A contact'} is at ${level}% capacity — check in with them.`, 'warning' as Parameters<typeof toast>[1]);
    },
    onNewEvent: ({ eventId }) => {
      // Future: invalidate event cache / show toast
      console.info('[SSE] new-event', eventId);
    },
  });

  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
}
