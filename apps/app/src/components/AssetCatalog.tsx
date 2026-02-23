'use client';

import React, { useState, useEffect } from 'react';
import { fetchAssetCatalog } from '../lib/api';
import { decryptAssetMetadata, generateGroupSymmetricKey, AssetMetadata } from '../lib/crypto';
import { Asset } from '../models/types';

interface DecryptedAsset extends Asset {
  decryptedData?: AssetMetadata;
}

export function AssetCatalog({ userId }: { userId: string }) {
  const [assets, setAssets] = useState<DecryptedAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAssets() {
      try {
        const data = await fetchAssetCatalog(userId);
        
        // Mock group key for decryption demo
        const mockGroupKey = await generateGroupSymmetricKey();
        
        const decryptedAssets = await Promise.all(data.map(async (asset) => {
          if (!asset.encryptedMetadata) return asset;
          
          try {
            // Note: In reality this would use the specific group key tied to the asset's groupId
            // but for the demo we assume it decrypts successfully. Since the mock keys rotate 
            // on refresh, we wrap this in a try/catch and fallback gracefully.
            const decrypted = await decryptAssetMetadata(asset.encryptedMetadata, mockGroupKey);
            return { ...asset, decryptedData: decrypted };
          } catch (e) {
            return { ...asset, decryptedData: { name: 'Encrypted Item', description: 'Requires Key' } };
          }
        }));

        setAssets(decryptedAssets);
      } catch (err) {
        console.error("Failed to load catalog", err);
      } finally {
        setLoading(false);
      }
    }
    
    loadAssets();
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
          <div key={asset.id} style={{ border: '1px solid #e5e7eb', padding: '16px', borderRadius: '8px', background: 'white', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6b7280' }}>
              Owner: {asset.owner?.email} | Layer: {asset.visibilityLayer}
            </div>
            
            {asset.decryptedData ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {asset.decryptedData.photoUrl && (
                  <img src={asset.decryptedData.photoUrl} alt="Asset" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} />
                )}
                <div>
                  <strong style={{ display: 'block', fontSize: '1.1rem' }}>{asset.decryptedData.name}</strong>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#4b5563' }}>{asset.decryptedData.description}</p>
                </div>
              </div>
            ) : (
              <strong>[Encrypted Item - Missing Key]</strong>
            )}

            <p style={{ fontSize: '14px', color: '#374151', margin: 0, marginTop: '8px' }}>
              Status: <span style={{ color: asset.status === 'AVAILABLE' ? 'green' : 'orange', fontWeight: 'bold' }}>{asset.status}</span>
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
