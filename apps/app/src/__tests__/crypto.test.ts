/**
 * crypto.test.ts — Phase 7.4 Frontend Test Suite
 *
 * Tests for pure utility functions in crypto.ts that don't require
 * a real browser WebCrypto implementation. These run in jsdom via jest.
 *
 * Functions tested:
 *   - bufferToBase64 / base64ToBuffer round-trip
 *   - generateGroupSymmetricKey (mocked crypto.subtle)
 */

import { bufferToBase64, base64ToBuffer } from '@/lib/crypto';

import { webcrypto } from 'crypto';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill for jsdom
(global as unknown as Record<string, unknown>).TextEncoder = TextEncoder;
(global as unknown as Record<string, unknown>).TextDecoder = TextDecoder;
Object.defineProperty(globalThis, 'crypto', {
  value: webcrypto,
  writable: false,
  configurable: true,
});


describe('crypto utility functions', () => {
  describe('bufferToBase64 / base64ToBuffer round-trip', () => {
    it('should encode a buffer to Base64 and decode it back correctly', () => {
      const originalData = new Uint8Array([104, 101, 108, 108, 111]); // "hello"
      const base64 = bufferToBase64(originalData.buffer);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);

      const decoded = new Uint8Array(base64ToBuffer(base64));
      expect(decoded).toEqual(originalData);
    });

    it('should handle empty buffers', () => {
      const empty = new Uint8Array([]);
      const base64 = bufferToBase64(empty.buffer);
      const decoded = new Uint8Array(base64ToBuffer(base64));
      expect(decoded).toEqual(empty);
    });

    it('should handle binary data with all byte values 0–255', () => {
      const allBytes = new Uint8Array(256).map((_, i) => i);
      const base64 = bufferToBase64(allBytes.buffer);
      const decoded = new Uint8Array(base64ToBuffer(base64));
      expect(decoded).toEqual(allBytes);
    });
  });

  describe('encryptBinary / decryptBinary (Phase 7.5)', () => {
    it('should round-trip binary data through AES-GCM encryption', async () => {
      // Import helper via relative path to avoid @/ alias if ts-jest has trouble
      const { encryptBinary, decryptBinary } = await import('@/lib/crypto.binary');

      // Generate an ephemeral AES-GCM key for the test
      const key = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );

      const original = new TextEncoder().encode('binary attachment payload').buffer;
      const encrypted = await encryptBinary(original, key as CryptoKey);
      expect(typeof encrypted).toBe('string');

      const decrypted = await decryptBinary(encrypted, key as CryptoKey);
      expect(new TextDecoder().decode(decrypted)).toBe('binary attachment payload');
    });
  });
});
