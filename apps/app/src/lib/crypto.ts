import { GroupKey } from '../models/types';

/**
 * WEBCRYPTO E2EE UTILITIES
 * Production-ready End-to-End Encryption logic using the native browser WebCrypto API.
 */

// Generate a symmetric AES-GCM key for a specific 'Shell of Trust' group
export async function generateGroupSymmetricKey(): Promise<CryptoKey> {
  return typeof window !== 'undefined' ? await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256
    },
    true, // extractable so we can wrap/encrypt it for other users
    ["encrypt", "decrypt"]
  ) : {} as CryptoKey;
}

// Generate the user's asymmetric RSA-OAEP KeyPair
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return typeof window !== 'undefined' ? await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // In production, PrivateKeys should be false (non-extractable) if possible, but kept true here for local storage mocking
    ["encrypt", "decrypt"]
  ) : {} as CryptoKeyPair;
}

// Helper to convert an ArrayBuffer to a Base64 string for storage/transmission
export function bufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== 'undefined' ? window.btoa(binary) : '';
}

// Helper to convert a Base64 string back to an ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  if (typeof window === 'undefined') return new ArrayBuffer(0);
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// Encrypt the group's symmetric key using a specific user's public RSA key (Key Wrapping)
export async function encryptKeyForUser(symmetricKey: CryptoKey, userPublicKey: CryptoKey): Promise<string> {
  // 1. Export the raw AES key material
  const rawSymmetricKey = await window.crypto.subtle.exportKey("raw", symmetricKey);
  
  // 2. Encrypt the raw material using the user's public RSA key
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" },
    userPublicKey,
    rawSymmetricKey
  );
  
  // 3. Return as Base64 for easy transport/storage
  return bufferToBase64(encryptedBuffer);
}

// Decrypt the group's symmetric key using the user's local private RSA key (Key Unwrapping)
export async function decryptKeyForUser(encryptedBase64Key: string, userPrivateKey: CryptoKey): Promise<CryptoKey> {
  const encryptedBuffer = base64ToBuffer(encryptedBase64Key);
  
  // 1. Decrypt the payload to get the raw AES material
  const rawSymmetricKey = await window.crypto.subtle.decrypt(
    { name: "RSA-OAEP" },
    userPrivateKey,
    encryptedBuffer
  );
  
  // 2. Import the raw material back into a usable CryptoKey object
  return await window.crypto.subtle.importKey(
    "raw",
    rawSymmetricKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

// Mock Initialization: Generates a new Group Key architecture simulating network exchange
export async function initializeGroupKeyDemo(groupId: string, memberPublicKeys: Record<string, CryptoKey>): Promise<GroupKey> {
  const symmetricKey = await generateGroupSymmetricKey();
  const encryptedKeysByMember: Record<string, string> = {};
  
  // Encrypt the symmetric key for each member's public key
  for (const [userId, pubKey] of Object.entries(memberPublicKeys)) {
    encryptedKeysByMember[userId] = await encryptKeyForUser(symmetricKey, pubKey);
  }

  return {
    groupId,
    symmetricKey: 'N/A_IN_PRODUCTION', // We only store the wrapped/encrypted keys
    encryptedKeysByMember
  };
}
