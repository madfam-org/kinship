'use client';

import React, { useState } from 'react';
import { createAsset } from '../lib/api';
import { encryptAssetMetadata, generateGroupSymmetricKey } from '../lib/crypto';

export function AssetAddForm({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [layer, setLayer] = useState('INNER_CIRCLE');
  const [requiresHighCapacity, setRequiresHighCapacity] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 1. Generate a mock group key for this demo (in production, we fetch the decrypted group key)
      const mockGroupKey = await generateGroupSymmetricKey();
      
      // 2. Encrypt the sensitive metadata
      const encryptedMetadata = await encryptAssetMetadata({
        name,
        description,
        photoUrl
      }, mockGroupKey);

      // 3. Send securely to the API
      await createAsset({
        ownerId: userId,
        encryptedMetadata,
        visibilityLayer: layer,
        requiresHighCapacity,
        status: 'AVAILABLE'
      });

      alert('Asset securely encrypted and cataloged!');
      setName('');
      setDescription('');
      setPhotoUrl('');
    } catch (error) {
      console.error("Failed to save asset:", error);
      alert('Error saving asset.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ padding: '20px', border: '1px solid #e5e7eb', borderRadius: '12px', background: 'white' }}>
      <h4>Add to Inventory</h4>
      <div style={{ marginBottom: '12px' }}>
        <input 
          placeholder="Item Name" 
          value={name} 
          onChange={e => setName(e.target.value)} 
          required 
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
        <textarea 
          placeholder="Description (Private to your Trust Shell)" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          style={{ width: '100%', padding: '8px', marginBottom: '8px' }}
        />
        <input 
          placeholder="Photo URL (Optional)" 
          value={photoUrl} 
          onChange={e => setPhotoUrl(e.target.value)} 
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      <div style={{ marginBottom: '12px' }}>
        <label style={{ fontSize: '14px' }}>Visibility Ring:</label>
        <select value={layer} onChange={e => setLayer(e.target.value)} style={{ marginLeft: '8px' }}>
          <option value="INNER_CIRCLE">Inner Circle</option>
          <option value="OUTER_RING">Outer Ring</option>
          <option value="FRIENDS_OF_FRIENDS">Friends of Friends</option>
        </select>
      </div>
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center' }}>
        <input 
          type="checkbox" 
          id="capacityCheck"
          checked={requiresHighCapacity} 
          onChange={e => setRequiresHighCapacity(e.target.checked)} 
          style={{ marginRight: '8px' }}
        />
        <label htmlFor="capacityCheck" style={{ fontSize: '14px', color: '#4b5563' }}>
          Requires High Social Capacity to Lend (Auto-hides if Battery &lt; 20%)
        </label>
      </div>
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
        Encrypt & Save
      </button>
    </form>
  );
}
