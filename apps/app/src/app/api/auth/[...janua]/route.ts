import { JanuaNextAuth } from '@janua/nextjs-sdk';

export const { GET, POST } = JanuaNextAuth({
  baseURL: process.env.NEXT_PUBLIC_JANUA_URL || 'https://auth.madfam.io',
});
