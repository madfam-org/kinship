'use client';

import React, { useState } from 'react';
import { createAsset } from '../lib/api';
import { encryptAssetMetadata, generateGroupSymmetricKey, getStoredKeyPair, generateUserKeyPair, saveKeyPair, encryptKeyForUser } from '../lib/crypto';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function AssetAddForm({ userId }: { userId: string }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [layer, setLayer] = useState('INNER_CIRCLE');
  const [autoApproveLayer, setAutoApproveLayer] = useState('INNER_CIRCLE');
  const [requiresHighCapacity, setRequiresHighCapacity] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // 0. Ensure the user has an E2EE identity (RSA-OAEP KeyPair)
      let keyPair = await getStoredKeyPair();
      if (!keyPair) {
        keyPair = await generateUserKeyPair();
        await saveKeyPair(keyPair);
      }

      // 1. Generate a new true symmetric key for this specific asset
      const symmetricKey = await generateGroupSymmetricKey();
      
      // 2. Encrypt the sensitive metadata
      const encryptedMetadata = await encryptAssetMetadata({
        name,
        description,
        photoUrl
      }, symmetricKey);

      // 3. Asymmetrically wrap the symmetric key for the owner's Public Key
      const wrappedKey = await encryptKeyForUser(symmetricKey, keyPair.publicKey);

      // 4. Send securely to the API with the wrapped key envelope
      await createAsset({
        ownerId: userId,
        encryptedMetadata,
        visibilityLayer: layer,
        autoApproveLayer,
        requiresHighCapacity,
        status: 'AVAILABLE',
        wrappedKeys: [{ userId: userId, encryptedSymmetricKey: wrappedKey }]
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
    <Card className="w-full max-w-lg mx-auto bg-card/60 backdrop-blur-md border border-white/10 shadow-lg mt-8">
      <CardHeader>
        <CardTitle className="text-xl text-primary font-semibold flex items-center gap-2">
          <span>Add to Digital Armory</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="asset-name">Item Name</Label>
              <Input 
                id="asset-name"
                placeholder="Ex: DeWalt 20V Drill" 
                value={name} 
                onChange={e => setName(e.target.value)} 
                required 
                className="bg-background/80"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-desc">Description (Private to your Trust Shell)</Label>
              <textarea 
                id="asset-desc"
                placeholder="Include condition, quirks, etc." 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background/80 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="asset-photo">Photo URL (Optional)</Label>
              <Input 
                id="asset-photo"
                placeholder="https://..." 
                value={photoUrl} 
                onChange={e => setPhotoUrl(e.target.value)} 
                className="bg-background/80"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Visibility Ring</Label>
              <Select value={layer} onValueChange={setLayer}>
                <SelectTrigger className="bg-background/80">
                  <SelectValue placeholder="Select visibility" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INNER_CIRCLE">Inner Circle</SelectItem>
                  <SelectItem value="OUTER_RING">Outer Ring</SelectItem>
                  <SelectItem value="FRIENDS_OF_FRIENDS">Friends of Friends</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Auto-Approve Loans</Label>
              <Select value={autoApproveLayer} onValueChange={setAutoApproveLayer}>
                <SelectTrigger className="bg-background/80">
                  <SelectValue placeholder="Select auto-approve" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INNER_CIRCLE">Inner Circle</SelectItem>
                  <SelectItem value="EXTENDED_POLYCULE">Extended Network</SelectItem>
                  <SelectItem value="OUTER_RING">Outer Ring</SelectItem>
                  <SelectItem value="FRIENDS_OF_FRIENDS">Friends of Friends</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground bg-muted/40 p-2 rounded border border-border/50">
            ℹ️ Loans requested from outside your auto-approve layer will require manual approval.
          </div>

          <div className="flex items-center space-x-3 p-3 bg-background/30 rounded-lg border border-border">
            <input 
              type="checkbox" 
              id="capacityCheck"
              checked={requiresHighCapacity} 
              onChange={e => setRequiresHighCapacity(e.target.checked)} 
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary bg-background"
            />
            <Label htmlFor="capacityCheck" className="text-sm font-normal cursor-pointer text-muted-foreground">
              Requires High Social Capacity to Lend (Auto-hides if Battery &lt; 20%)
            </Label>
          </div>

          <Button type="submit" className="w-full bg-trust-outer hover:bg-trust-outer/80 text-white font-semibold flex items-center justify-center gap-2 h-12 text-md shadow-lg shadow-trust-outer/20">
            Encrypt & Catalog
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
