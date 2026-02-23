"use client";

import React, { useState } from 'react';

interface KeyRotationPanelProps {
  groupId: string;
  userId: string;
}

interface Member {
  id: string;
  email: string;
  publicKey: string | null;
}

type RotationStatus = 'idle' | 'fetching' | 're-wrapping' | 'uploading' | 'done' | 'error';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

/**
 * KeyRotationPanel (Phase 5.5)
 *
 * Shown to group admins when membership changes (e.g., member added or removed).
 * Orchestrates the full client-side key rotation ceremony:
 *  1. POST /v1/groups/:id/rotate-keys  → fetch member public keys
 *  2. Generate a fresh AES-GCM group symmetric key
 *  3. Re-wrap the new key for every current member's RSA public key
 *  4. POST /v1/groups/:id/wrapped-keys → upload all new WrappedKey entries
 *
 * The private RSA key never leaves the browser (stored non-extractably in IndexedDB).
 */
export function KeyRotationPanel({ groupId, userId }: KeyRotationPanelProps) {
  const [status, setStatus] = useState<RotationStatus>('idle');
  const [log, setLog] = useState<string[]>([]);
  const [updatedCount, setUpdatedCount] = useState<number | null>(null);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runRotation = async () => {
    setStatus('fetching');
    setLog([]);
    setUpdatedCount(null);

    try {
      // ── Step 1: Initiate rotation, retrieve member public keys ──────────────
      addLog('Initiating key rotation request…');
      const initRes = await fetch(`${API_BASE}/groups/${groupId}/rotate-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestedByUserId: userId })
      });

      if (!initRes.ok) throw new Error(`Rotation initiation failed: ${initRes.status}`);
      const { members }: { members: Member[] } = await initRes.json();
      addLog(`Retrieved ${members.length} member public keys.`);

      // ── Step 2: Generate a fresh AES-GCM symmetric key ──────────────────────
      setStatus('re-wrapping');
      addLog('Generating fresh AES-GCM group symmetric key…');
      const newGroupKey = await window.crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
      const rawKey = await window.crypto.subtle.exportKey('raw', newGroupKey);

      // ── Step 3: Wrap the new key for every current member ───────────────────
      addLog('Re-wrapping key for each group member…');
      const wrappedEntries: { userId: string; encryptedSymmetricKey: string }[] = [];

      for (const member of members) {
        if (!member.publicKey) {
          addLog(`⚠️  Skipping ${member.email} — no public key registered yet.`);
          continue;
        }

        // Import member's SPKI Base64 public key
        const spkiBuffer = Uint8Array.from(atob(member.publicKey), c => c.charCodeAt(0)).buffer;
        const memberPublicKey = await window.crypto.subtle.importKey(
          'spki',
          spkiBuffer,
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          false,
          ['encrypt']
        );

        // Encrypt the raw AES key material with this member's RSA public key
        const encryptedBuf = await window.crypto.subtle.encrypt(
          { name: 'RSA-OAEP' },
          memberPublicKey,
          rawKey
        );

        const encryptedBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedBuf)));
        wrappedEntries.push({ userId: member.id, encryptedSymmetricKey: encryptedBase64 });
        addLog(`✓ Wrapped key for ${member.email}`);
      }

      if (wrappedEntries.length === 0) {
        throw new Error('No valid member public keys found. Rotation aborted.');
      }

      // ── Step 4: Upload all re-wrapped keys to the server ────────────────────
      // NOTE: The server only stores the ciphertext blobs — the new AES key never leaves the client.
      setStatus('uploading');
      addLog(`Uploading ${wrappedEntries.length} re-wrapped keys…`);

      const uploadRes = await fetch(`${API_BASE}/groups/${groupId}/wrapped-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wrappedKeys: wrappedEntries })
      });

      if (!uploadRes.ok) throw new Error(`Key upload failed: ${uploadRes.status}`);
      const { updated } = await uploadRes.json();

      setUpdatedCount(updated);
      addLog(`✅ Key rotation complete. ${updated} wrapped key entries updated.`);
      setStatus('done');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      addLog(`❌ Error: ${message}`);
      setStatus('error');
    }
  };

  const statusColor: Record<RotationStatus, string> = {
    idle:        'var(--text-secondary)',
    fetching:    'var(--accent-color)',
    're-wrapping': 'var(--warning-color)',
    uploading:   'var(--primary-color)',
    done:        'var(--success-color)',
    error:       'var(--danger-color)',
  };

  const statusLabel: Record<RotationStatus, string> = {
    idle:        'Ready',
    fetching:    'Fetching member keys…',
    're-wrapping': 'Re-wrapping keys client-side…',
    uploading:   'Uploading encrypted blobs…',
    done:        'Rotation complete',
    error:       'Rotation failed',
  };

  const isRunning = ['fetching', 're-wrapping', 'uploading'].includes(status);

  return (
    <div style={{
      padding: '1.5rem',
      borderRadius: '12px',
      border: `1px solid ${statusColor[status]}`,
      background: 'rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
            🔑 Key Rotation
          </h3>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Run this when your group membership changes to issue fresh AES-GCM keys for all current members.
          </p>
        </div>
        <span style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          color: statusColor[status],
          background: `${statusColor[status]}18`,
          padding: '0.25rem 0.75rem',
          borderRadius: '999px',
          whiteSpace: 'nowrap'
        }}>
          {statusLabel[status]}
        </span>
      </div>

      {log.length > 0 && (
        <div style={{
          background: 'var(--bg-color)',
          borderRadius: '8px',
          padding: '0.75rem 1rem',
          maxHeight: '160px',
          overflowY: 'auto',
          fontSize: '0.78rem',
          lineHeight: 1.6,
          fontFamily: 'monospace',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-color)'
        }}>
          {log.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      )}

      {status === 'done' && updatedCount !== null && (
        <div style={{
          fontSize: '0.85rem',
          color: 'var(--success-color)',
          background: 'rgba(0, 210, 139, 0.08)',
          borderRadius: '8px',
          padding: '0.5rem 0.75rem'
        }}>
          ✅ {updatedCount} key{updatedCount !== 1 ? 's' : ''} successfully rotated.
          New members can now decrypt group events.
        </div>
      )}

      <button
        onClick={runRotation}
        disabled={isRunning}
        style={{
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          border: 'none',
          background: isRunning
            ? 'var(--surface-color-light)'
            : 'linear-gradient(135deg, var(--primary-color), var(--accent-color))',
          color: 'white',
          fontWeight: 600,
          cursor: isRunning ? 'not-allowed' : 'pointer',
          opacity: isRunning ? 0.6 : 1,
          alignSelf: 'flex-start',
          transition: 'opacity 0.2s'
        }}
      >
        {isRunning ? '⏳ Rotating…' : '🔄 Rotate Group Keys'}
      </button>
    </div>
  );
}
