'use client';

import React, { useState, useEffect } from 'react';
import { fetchTreasuryPools, fetchPoolLedger, createTreasuryPool, submitPledge } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

interface TreasuryPool {
  id: string;
  title: string;
  description?: string;
  goalAmount: number;
  currentAmount: number;
  status: string;
  createdAt: string;
  _count?: { ledgerEntries: number };
}

interface LedgerEntry {
  id: string;
  amount: number;
  memo?: string;
  createdAt: string;
  contributor: { email: string };
}

interface PoolWithLedger extends TreasuryPool {
  ledgerEntries: LedgerEntry[];
}

export function TreasuryDashboard({ userId, groupId }: { userId: string; groupId: string }) {
  const [pools, setPools] = useState<TreasuryPool[]>([]);
  const [selectedPool, setSelectedPool] = useState<PoolWithLedger | null>(null);
  const [pledgeAmount, setPledgeAmount] = useState('');
  const [pledgeMemo, setPledgeMemo] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadPools = async () => {
    try {
      const data = await fetchTreasuryPools(groupId);
      setPools(data as unknown as TreasuryPool[]);
    } catch (err) {
      console.error('Failed to load treasury pools', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPools(); }, [groupId]);

  const handleSelectPool = async (pool: TreasuryPool) => {
    try {
      const data = await fetchPoolLedger(pool.id);
      setSelectedPool(data as unknown as PoolWithLedger);
    } catch (err) {
      console.error('Failed to load ledger', err);
    }
  };

  const handlePledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPool || !pledgeAmount) return;
    const amountCents = Math.round(parseFloat(pledgeAmount) * 100);
    if (amountCents <= 0) return;
    try {
      await submitPledge({ poolId: selectedPool.id, contributorId: userId, amount: amountCents, memo: pledgeMemo });
      setPledgeAmount('');
      setPledgeMemo('');
      await loadPools();
      await handleSelectPool(selectedPool);
    } catch (err) {
      console.error('Failed to submit pledge', err);
    }
  };

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    const goalCents = Math.round(parseFloat(newGoal) * 100);
    if (!newTitle || goalCents <= 0) return;
    try {
      await createTreasuryPool({ groupId, title: newTitle, description: newDesc, goalAmount: goalCents });
      setNewTitle(''); setNewGoal(''); setNewDesc(''); setShowCreate(false);
      await loadPools();
    } catch (err) {
      console.error('Failed to create pool', err);
    }
  };

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const getStatusVariant = (status: string) => {
    if (status === 'FUNDED') return 'inner';
    if (status === 'CANCELLED') return 'destructive';
    return 'outline';
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Loading Community Treasury...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-primary tracking-tight">Collective Treasury</h3>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="border-trust-outer/50 text-trust-outer hover:bg-trust-outer/10 border rounded-md px-4 py-2 text-sm font-medium transition-colors bg-transparent"
        >
          {showCreate ? 'Cancel' : '+ New Campaign'}
        </Button>
      </div>

      {/* Create Pool Form */}
      {showCreate && (
        <Card className="bg-card/60 backdrop-blur-md border border-trust-outer/20">
          <CardHeader>
            <CardTitle className="text-lg text-trust-outer">Launch a Funding Campaign</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreatePool} className="space-y-4">
              <div className="space-y-2">
                <Label>Campaign Title</Label>
                <Input placeholder="e.g. Group Generator Fund" value={newTitle} onChange={e => setNewTitle(e.target.value)} required className="bg-background/80" />
              </div>
              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input placeholder="What are we pooling for?" value={newDesc} onChange={e => setNewDesc(e.target.value)} className="bg-background/80" />
              </div>
              <div className="space-y-2">
                <Label>Goal Amount (USD)</Label>
                <Input type="number" step="0.01" min="1" placeholder="500.00" value={newGoal} onChange={e => setNewGoal(e.target.value)} required className="bg-background/80" />
              </div>
              <Button type="submit" className="w-full bg-trust-outer hover:bg-trust-outer/80 text-white">
                Create Campaign
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pools List */}
        <div className="space-y-4">
          {pools.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-8">No active campaigns yet. Start one above.</p>
          )}
          {pools.map(pool => {
            const pct = Math.min(100, (pool.currentAmount / pool.goalAmount) * 100);
            return (
              <Card
                key={pool.id}
                onClick={() => handleSelectPool(pool)}
                className={`cursor-pointer bg-card/40 backdrop-blur-md border transition-all duration-300 ${selectedPool?.id === pool.id ? 'border-trust-outer/60 shadow-lg shadow-trust-outer/10' : 'border-white/5 hover:border-white/20'}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base font-semibold text-foreground">{pool.title}</CardTitle>
                    <Badge
                      className={`text-[10px] ${
                        pool.status === 'FUNDED' ? 'bg-trust-inner text-white' :
                        pool.status === 'CANCELLED' ? 'bg-destructive text-destructive-foreground' :
                        'border border-input text-foreground'
                      }`}
                    >
                      {pool.status}
                    </Badge>
                  </div>
                  {pool.description && <p className="text-xs text-muted-foreground mt-1">{pool.description}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={pool.currentAmount} max={pool.goalAmount} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{formatCurrency(pool.currentAmount)}</span>
                    <span>of {formatCurrency(pool.goalAmount)} goal</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <span className="text-[10px] text-muted-foreground">{pool._count?.ledgerEntries ?? 0} contributors</span>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Ledger & Pledge Panel */}
        {selectedPool && (
          <div className="space-y-4">
            {/* Pledge Form */}
            {selectedPool.status === 'ACTIVE' && (
              <Card className="bg-card/60 backdrop-blur-md border border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base text-primary">Pledge to &quot;{selectedPool.title}&quot;</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handlePledge} className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Amount (USD)</Label>
                      <Input type="number" step="0.01" min="0.01" placeholder="25.00" value={pledgeAmount} onChange={e => setPledgeAmount(e.target.value)} required className="bg-background/80 h-9" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Memo (Optional)</Label>
                      <Input placeholder="For the generator!" value={pledgeMemo} onChange={e => setPledgeMemo(e.target.value)} className="bg-background/80 h-9" />
                    </div>
                    <Button type="submit" className="w-full bg-trust-inner hover:bg-trust-inner/80 text-white h-9">
                      Submit Pledge
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Transparent Ledger */}
            <Card className="bg-card/40 backdrop-blur-md border border-white/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Transparent Ledger</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedPool.ledgerEntries.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No pledges yet. Be the first!</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPool.ledgerEntries.map(entry => (
                      <div key={entry.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                        <div>
                          <p className="text-xs font-medium text-foreground">{entry.contributor.email}</p>
                          {entry.memo && <p className="text-[10px] text-muted-foreground italic">&quot;{entry.memo}&quot;</p>}
                        </div>
                        <span className="text-sm font-semibold text-trust-inner">{formatCurrency(entry.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
