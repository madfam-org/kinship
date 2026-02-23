'use client';

import { useEffect } from 'react';
import { useAuth } from '@janua/react-sdk';
import { syncUserPublicKey } from '../lib/crypto';

/**
 * KeySyncManager:
 * Side-effect component that listens for successful Janua authentication
 * and ensures the user's RSA-OAEP Public Key is synced with the backend.
 */
export function KeySyncManager() {
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Once authenticated, sync the local identity with the API
    if (isAuthenticated && user) {
      console.log('[E2EE] User authenticated. Starting key sync...');
      syncUserPublicKey(user.uid, user.email);
    }
  }, [isAuthenticated, user]);

  return null;
}
