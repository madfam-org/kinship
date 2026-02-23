'use client';

import React, { useState, useEffect } from 'react';

interface Asset {
  id: string;
  ownerId: string;
  owner: { email: string };
  encryptedMetadata: string;
  status: string;
  visibilityLayer: string;
}

export function AssetCatalog({ userId }: { userId: string }) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/assets/catalog/${userId}`)
      .then(res => res.json())
      .then(data => {
        setAssets(data);
        setLoading(false);
      });
  }, [userId]);

  const handleRequestLoan = async (assetId: string) => {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Default 1 week loan

    await fetch('/api/v1/loan-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetId,
        borrowerId: userId,
        dueDate: dueDate.toISOString()
      })
    });
    alert('Loan request sent!');
  };

  if (loading) return <div>Loading Catalog...</div>;

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
      <h3>Community Asset Inventory</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
        {assets.map(asset => (
          <div key={asset.id} style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', background: 'white' }}>
            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
              Owner: {asset.owner.email} | Layer: {asset.visibilityLayer}
            </div>
            {/* In a real app, this metadata would be decrypted via window.crypto */}
            <strong>[Encrypted Item]</strong>
            <p style={{ fontSize: '14px', color: '#374151' }}>
              Status: <span style={{ color: asset.status === 'AVAILABLE' ? 'green' : 'orange' }}>{asset.status}</span>
            </p>
            {asset.status === 'AVAILABLE' && asset.ownerId !== userId && (
              <button 
                onClick={() => handleRequestLoan(asset.id)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Request Item
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
