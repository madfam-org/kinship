'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '../lib/session';
import { fetchGroupLists, createGroupList, addListItem, toggleListItem, deleteListItem } from '../lib/api';
import { encryptText, decryptText } from '../lib/crypto';
import { useToast } from './ui/toast';
import { Input } from './ui/input';
import { Button } from './ui/button';

interface SharedListsProps {
  groupId: string;
  groupSymmetricKey: CryptoKey;
  groupName?: string;
}

export default function SharedLists({ groupId, groupSymmetricKey, groupName }: SharedListsProps) {
  const currentUser = useUser();
  const { toast } = useToast();
  
  const [lists, setLists] = useState<any[]>([]);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState('');
  const [newListTitle, setNewListTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadLists = useCallback(async () => {
    try {
      setIsLoading(true);
      const rawLists = await fetchGroupLists(groupId) as any[];
      
      // Decrypt items in each list
      const decryptedLists = await Promise.all(
        rawLists.map(async (list) => {
          const decryptedItems = await Promise.all(
            (list.items || []).map(async (item: any) => {
              try {
                const plaintext = await decryptText(item.encryptedPayload, groupSymmetricKey);
                return { ...item, text: plaintext };
              } catch (e) {
                return { ...item, text: 'Locked (Decryption Failed)' };
              }
            })
          );
          return { ...list, items: decryptedItems };
        })
      );
      
      setLists(decryptedLists);
      if (decryptedLists.length > 0 && !activeListId) {
        setActiveListId((decryptedLists[0] as any).id);
      }
    } catch (err) {
      toast('Failed to load lists', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, groupSymmetricKey, toast]);

  useEffect(() => {
    loadLists();
  }, [groupId, groupSymmetricKey]);

  const handleCreateList = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    setIsProcessing(true);
    try {
      const newList = await createGroupList(groupId, newListTitle.trim() as any);
      setLists(prev => [newList, ...prev]);
      setActiveListId((newList as any).id);
      setNewListTitle('');
      toast('New list created securely', 'success');
      loadLists(); // Deep reload to ensure correct structure mapping
    } catch (err) {
      toast('Failed to create list', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [draftItem, activeListId, groupId, groupSymmetricKey, loadLists, toast]);

  const handleAddItem = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftItem.trim() || !activeListId) return;
    setIsProcessing(true);
    try {
      const encryptedPayload = await encryptText(draftItem.trim(), groupSymmetricKey);
      await addListItem(groupId, activeListId, encryptedPayload);
      setDraftItem('');
      await loadLists(); // Refresh to get the new item with ID
    } catch (err) {
      toast('Failed to encrypt and save list item', 'error');
    } finally {
      setIsProcessing(false);
    }
  }, [draftItem, activeListId, groupId, groupSymmetricKey, loadLists, toast]);

  const handleToggle = useCallback(async (itemId: string, currentStatus: boolean) => {
    if (!activeListId) return;
    // Optimistic UI update
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      return {
        ...l,
        items: l.items.map((i: any) => i.id === itemId ? { ...i, completed: !currentStatus } : i)
      };
    }));
    try {
      await toggleListItem(groupId, activeListId, itemId, !currentStatus, currentUser.id);
    } catch (err) {
      toast('Failed to sync completion state', 'error');
      loadLists(); // Revert on failure
    }
  }, [activeListId, groupId, currentUser.id, loadLists, toast]);

  const handleDelete = useCallback(async (itemId: string) => {
    if (!activeListId) return;
    // Optimistic UI update
    setLists(prev => prev.map(l => {
      if (l.id !== activeListId) return l;
      return { ...l, items: l.items.filter((i: any) => i.id !== itemId) };
    }));
    try {
      await deleteListItem(groupId, activeListId, itemId);
    } catch (err) {
      toast('Failed to delete item', 'error');
      loadLists(); // Revert on failure
    }
  }, [activeListId, groupId, loadLists, toast]);

  const activeList = useMemo(() => lists.find(l => l.id === activeListId), [lists, activeListId]);

  return (
    <div className="glass-panel p-6 flex flex-col md:flex-row gap-6 min-h-[500px]">
      {/* Sidebar List Navigation */}
      <div className="md:w-1/3 flex flex-col gap-4 border-r border-border/50 pr-4">
        <h2 className="text-xl font-semibold flex items-center justify-between">
          E2EE Lists
          <Button onClick={loadLists} disabled={isLoading} style={{ padding: '0.2rem 0.5rem', background: 'transparent' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-foreground opacity-50 hover:opacity-100 transition-opacity ${isLoading ? 'animate-spin' : ''}`}><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.85.99 6.57 2.62L21 8"/><path d="M21 3v5h-5"/></svg>
          </Button>
        </h2>
        
        <form onSubmit={handleCreateList} className="flex gap-2">
          <Input 
            value={newListTitle}
            onChange={e => setNewListTitle(e.target.value)}
            placeholder="New list name (e.g. GROCERY)"
            className="text-sm"
          />
          <Button type="submit" disabled={isProcessing || !newListTitle.trim()}>Add</Button>
        </form>

        <div className="flex flex-col gap-2 overflow-y-auto mt-2 h-[350px]">
          {lists.map(list => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={`text-left p-3 rounded-md transition-colors ${
                activeListId === list.id 
                  ? 'bg-primary text-primary-foreground font-medium' 
                  : 'bg-muted/50 hover:bg-muted text-secondary-foreground'
              }`}
            >
              {list.type} <span className="text-xs opacity-70 ml-2">({(list.items || []).length})</span>
            </button>
          ))}
          {lists.length === 0 && !isLoading && (
            <div className="text-secondary text-sm italic py-4">No lists created for {groupName || 'this group'} yet.</div>
          )}
        </div>
      </div>

      {/* Main List Display */}
      <div className="md:w-2/3 flex flex-col gap-4">
        {activeList ? (
          <>
            <form onSubmit={handleAddItem} className="flex gap-2">
              <Input 
                value={draftItem}
                onChange={e => setDraftItem(e.target.value)}
                placeholder="Encrypted list item..."
                className="flex-1"
                disabled={isProcessing}
              />
              <Button type="submit" disabled={isProcessing || !draftItem.trim()}>Add Item</Button>
            </form>

            <div className="flex-1 overflow-y-auto bg-black/20 rounded-lg border border-border/30 p-2 flex flex-col gap-1">
              {activeList.items && activeList.items.length > 0 ? (
                activeList.items.map((item: any) => (
                  <div 
                    key={item.id} 
                    className={`flex items-center justify-between p-3 rounded-md transition-all ${
                      item.completed ? 'bg-muted/20 opacity-60' : 'bg-background hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1" onClick={() => handleToggle(item.id, item.completed)}>
                      {item.completed ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary flex-shrink-0"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-secondary flex-shrink-0"><circle cx="12" cy="12" r="10"/></svg>
                      )}
                      <span className={`truncate ${item.completed ? 'line-through text-secondary' : 'text-foreground'}`}>
                        {item.text}
                      </span>
                    </div>
                    <Button 
                      onClick={() => handleDelete(item.id)}
                      className="text-destructive opacity-50 hover:opacity-100 hover:bg-destructive/10 -mr-2 bg-transparent"
                      style={{ padding: '0.2rem 0.5rem' }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                    </Button>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-secondary italic text-sm">
                  This list is empty.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="h-full flex items-center justify-center text-secondary m-auto">
            Select or create a list to begin checking items off.
          </div>
        )}
      </div>
    </div>
  );
}
