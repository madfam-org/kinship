'use client';

import React, { useState } from 'react';

export function AssetAddForm({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [layer, setLayer] = useState('INNER_CIRCLE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // In production, we would call encryptAssetMetadata(metadata, groupKey) here
    const mockEncryptedMetadata = btoa(JSON.stringify({ name, description }));

    const res = await fetch('/api/v1/assets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerId: userId,
        encryptedMetadata: mockEncryptedMetadata,
        visibilityLayer: layer
      })
    });

    if (res.ok) {
      alert('Asset cataloged securely!');
      setName('');
      setDescription('');
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
      <button type="submit" style={{ width: '100%', padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold' }}>
        Encrypt & Save
      </button>
    </form>
  );
}
