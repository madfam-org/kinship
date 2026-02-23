'use client';

import { ReactNode } from 'react';
import { JanuaProvider } from '@janua/react-sdk';

export function JanuaClientProvider({ children }: { children: ReactNode }) {
  const baseURL = process.env.NEXT_PUBLIC_JANUA_URL || 'https://auth.madfam.io';

  return (
    <JanuaProvider baseURL={baseURL}>
      {children}
    </JanuaProvider>
  );
}
