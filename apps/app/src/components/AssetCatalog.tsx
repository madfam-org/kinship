'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { fetchAssetCatalog } from '../lib/api';
import { decryptAssetMetadata, AssetMetadata, getStoredKeyPair, decryptKeyForUser } from '../lib/crypto';
import { Asset } from '../models/types';
import { Card, CardContent, CardFooter, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useToast } from './ui/toast';

interface DecryptedAsset extends Asset {
  decryptedData?: AssetMetadata;
}

export function AssetCatalog({ userId }: { userId: string }) {
  const { toast } = useToast();
  const [assets, setAssets] = useState<DecryptedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAssets() {
      try {
        const rawData = await fetchAssetCatalog(userId);
        const data = Array.isArray(rawData) ? rawData : (rawData as any).items || [];
        
        // 0. Load the local identity private key
        const keyPair = await getStoredKeyPair();
        if (!keyPair) {
          console.warn("No local identity keypair found. Cannot decrypt catalog.");
          setAssets(data.map((a: any) => ({...a, decryptedData: { name: 'Encrypted Item', description: 'No local keypair' }})));
          setLoading(false);
          return;
        }
        
        const decryptedAssets = await Promise.all(data.map(async (asset: any) => {
          if (!asset.encryptedMetadata) return asset;
          
          try {
            // Find the wrapped symmetric key for this specific user
            const wrappedKeyData = asset.wrappedKeys?.find((k: any) => k.userId === userId);
            if (!wrappedKeyData) throw new Error("No wrapped key found");

            // Unwrap the AES symmetric key using user's Private RSA Key
            const symmetricKey = await decryptKeyForUser(wrappedKeyData.encryptedSymmetricKey, keyPair.privateKey);

            // Decrypt the actual metadata payload
            const decrypted = await decryptAssetMetadata(asset.encryptedMetadata, symmetricKey);
            return { ...asset, decryptedData: decrypted };
          } catch (e) {
            return { ...asset, decryptedData: { name: 'Encrypted Item', description: 'Private' } };
          }
        }));

        setAssets(decryptedAssets);
      } catch (err) {
        console.error("Failed to load catalog", err);
        setLoadError('Failed to load asset catalog. Please check your connection.');
      } finally {
        setLoading(false);
      }
    }
    
    loadAssets();
  }, [userId]);

  const handleRequestLoan = useCallback(async (assetId: string) => {
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
    toast('Loan request sent! The owner will be notified.', 'success');
  }, [userId, toast]);

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Decrypting Community Ledger...</div>;
  if (loadError) return (
    <div className="p-6 text-center">
      <p className="text-destructive text-sm">{loadError}</p>
      <button onClick={() => { setLoadError(null); setLoading(true); }} className="mt-3 text-xs text-primary underline">Retry</button>
    </div>
  );

  // Helper function to map database strings to Shadcn Variant types
  const getTrustVariant = (layer: string) => {
    switch(layer) {
      case 'INNER_CIRCLE': return 'inner';
      case 'EXTENDED_POLYCULE': return 'polycule';
      case 'OUTER_RING': return 'outer';
      case 'FRIENDS_OF_FRIENDS': return 'fof';
      default: return 'outline';
    }
  };

  return (
    <div className="p-6">
      <h3 className="text-2xl font-semibold mb-6 text-primary tracking-tight">Community Asset Inventory</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {assets.map(asset => (
          <Card key={asset.id} className="flex flex-col h-full bg-card/40 backdrop-blur-md border border-white/5 hover:border-white/20 transition-all duration-300">
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs text-muted-foreground truncate max-w-[150px]">{asset.owner?.email}</span>
                <Badge variant={getTrustVariant(asset.visibilityLayer) as "default" | "secondary" | "destructive" | "outline" | "inner" | "polycule" | "outer" | "fof"} className="text-[10px] px-2 py-0 h-5">
                  {asset.visibilityLayer.replace(/_/g, ' ')}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="flex-grow">
              {asset.decryptedData ? (
                <div className="flex flex-col gap-3">
                  {asset.decryptedData.photoUrl && (
                    <div className="w-full h-32 rounded-md overflow-hidden bg-background/50 border border-white/10">
                      <img src={asset.decryptedData.photoUrl} alt="Asset" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <h4 className="font-semibold text-lg leading-tight text-foreground">{asset.decryptedData.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-3">{asset.decryptedData.description}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-24 bg-background/50 rounded-md border border-dashed border-white/20">
                  <span className="text-sm text-muted-foreground font-mono">[Encrypted Data]</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-4 border-t border-white/5">
              <div className="flex justify-between items-center w-full">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${asset.status === 'AVAILABLE' ? 'bg-success-color animate-pulse' : 'bg-warning-color'}`} />
                  <span className="text-xs font-semibold text-muted-foreground">{asset.status}</span>
                </div>
                {asset.autoApproveLayer && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    Auto: <Badge variant={getTrustVariant(asset.autoApproveLayer) as "default" | "secondary" | "destructive" | "outline" | "inner" | "polycule" | "outer" | "fof"} className="h-4 px-1 text-[9px] opacity-70">{asset.autoApproveLayer.split('_')[0]}</Badge>
                  </span>
                )}
              </div>
              
              {asset.status === 'AVAILABLE' && asset.ownerId !== userId ? (
                <Button 
                  onClick={() => handleRequestLoan(asset.id)}
                  className="w-full bg-primary/20 hover:bg-primary/40 text-primary border border-primary/30 mt-2"
                  variant="outline"
                >
                  Request Item
                </Button>
              ) : (
                <Button disabled variant="secondary" className="w-full mt-2 opacity-50 bg-background/50">
                  {asset.ownerId === userId ? "Your Item" : "Checked Out"}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
