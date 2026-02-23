import { GroupKey } from '../models/types';

const DB_NAME = 'kinship-vault';
const STORE_NAME = 'identity-keys';
const API_BASE = '/api-proxy'; // In a real app this would be configured via env or proxy

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
// 4096-bit modulus is the minimum recommended size for long-lived device identity keys.
export async function generateUserKeyPair(): Promise<CryptoKeyPair> {
  return typeof window !== 'undefined' ? await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true, // extractable so we can store it in DB
    ["encrypt", "decrypt"]
  ) : {} as CryptoKeyPair;
}

// PERSISTENCE: IndexedDB Storage for identity keys
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveKeyPair(keyPair: CryptoKeyPair): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(keyPair, 'current-identity');
  return new Promise((resolve) => {
    tx.oncomplete = () => resolve();
  });
}

export async function getStoredKeyPair(): Promise<CryptoKeyPair | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const request = tx.objectStore(STORE_NAME).get('current-identity');
  return new Promise((resolve) => {
    request.onsuccess = () => resolve(request.result || null);
  });
}

// API SYNC: Register Public Key with Kinship API
export async function syncUserPublicKey(januaId: string, email: string): Promise<void> {
  if (typeof window === 'undefined') return;

  let keyPair = await getStoredKeyPair();
  
  if (!keyPair) {
    console.log('[E2EE] No identity found. Generating new RSA KeyPair...');
    keyPair = await generateUserKeyPair();
    await saveKeyPair(keyPair);
  }

  // Export public key to SPKI format (Standard for public key transit)
  const spkiBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const publicKeyBase64 = bufferToBase64(spkiBuffer);

  // Sync with API
  try {
    const response = await fetch('/api/v1/users', { // Note: Assume /api is proxied to the api service
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ januaId, email, publicKey: publicKeyBase64 })
    });
    
    if (!response.ok) throw new Error('Failed to sync public key');
    console.log('[E2EE] Public key synced successfully.');
  } catch (error) {
    console.error('[E2EE] Sync Error:', error);
  }
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

// --- Asset Metadata E2EE ---

export interface AssetMetadata {
  name: string;
  description: string;
  photoUrl?: string;
}

// Encrypt asset metadata for a specific trust group
export async function encryptAssetMetadata(metadata: AssetMetadata, groupSymmetricKey: CryptoKey): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(metadata));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    groupSymmetricKey,
    data
  );

  // Return IV + Ciphertext as a single Base64 string
  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedContent), iv.length);

  return bufferToBase64(combined.buffer);
}

// Decrypt asset metadata using a group symmetric key
export async function decryptAssetMetadata(encryptedBase64: string, groupSymmetricKey: CryptoKey): Promise<AssetMetadata> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    groupSymmetricKey,
    ciphertext
  );

  return JSON.parse(new TextDecoder().decode(decryptedContent));
}

// --- Generic Text Encryption (Phase 5.2 — Poll Options) ---

/**
 * Encrypt an arbitrary plaintext string with an AES-GCM key.
 * Returns IV‖ciphertext as a single Base64 string (same pattern as encryptAssetMetadata).
 * Used by EventCreator to encrypt poll option labels before sending to the server.
 */
export async function encryptText(plaintext: string, key: CryptoKey): Promise<string> {
  const data = new TextEncoder().encode(plaintext);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedContent), iv.length);
  return bufferToBase64(combined.buffer);
}

/**
 * Decrypt a Base64-encoded IV‖ciphertext string with an AES-GCM key.
 * Used by EventPollCard to decrypt poll option labels retrieved from the server.
 */
export async function decryptText(encryptedBase64: string, key: CryptoKey): Promise<string> {
  const combined = new Uint8Array(base64ToBuffer(encryptedBase64));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decryptedContent);
}

// --- Binary Blob Encryption (Phase 7.5) ---

/**
 * Encrypt a binary file (Blob) using an AES-GCM group symmetric key.
 * Prepends the 12-byte IV to the resulting ciphertext Blob.
 */
export async function encryptBlob(file: Blob, key: CryptoKey): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    arrayBuffer
  );

  const combined = new Uint8Array(iv.length + encryptedContent.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedContent), iv.length);

  return new Blob([combined]);
}

/**
 * Decrypt a Blob that was encrypted by encryptBlob using the same AES-GCM key.
 * Expected format: 12-byte IV followed by ciphertext.
 */
export async function decryptBlob(encryptedBlob: Blob, key: CryptoKey): Promise<Blob> {
  const arrayBuffer = await encryptedBlob.arrayBuffer();
  const combined = new Uint8Array(arrayBuffer);
  
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);

  const decryptedContent = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  );

  // Return the original decrypted binary data
  return new Blob([decryptedContent]);
}
