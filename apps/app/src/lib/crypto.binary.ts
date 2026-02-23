import { bufferToBase64, base64ToBuffer } from './crypto';

/**
 * encryptBinary (Phase 7.5)
 *
 * Encrypts an arbitrary ArrayBuffer with an AES-GCM key.
 * Returns IV‖ciphertext as a single Base64 string — same pattern as
 * encryptText / encryptAssetMetadata. Suitable for asset photos and event receipts.
 */
export async function encryptBinary(data: ArrayBuffer, key: CryptoKey): Promise<string> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedContent), iv.length);
  return bufferToBase64(combined.buffer);
}

/**
 * decryptBinary (Phase 7.5)
 *
 * Decrypts a Base64-encoded IV‖ciphertext string back to an ArrayBuffer.
 * Inverse of encryptBinary; use with URL.createObjectURL(new Blob([result]))
 * to render decrypted images without ever writing plaintext to the DOM.
 */
export async function decryptBinary(encryptedBase64: string, key: CryptoKey): Promise<ArrayBuffer> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  return window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
}
