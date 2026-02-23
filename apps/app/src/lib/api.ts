import { Event, User, Asset, TrustLayer } from '@/models/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

// --------------------------------------------------------------------------
// Pagination helpers
// --------------------------------------------------------------------------
export interface PageMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

// Helper: append limit/offset query params
function paginated(url: string, limit = 50, offset = 0): string {
  return `${url}?limit=${limit}&offset=${offset}`;
}

// --------------------------------------------------------------------------
// Users & Networks
// --------------------------------------------------------------------------
export async function fetchUserNetwork(userId: string): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/network`);
  if (!res.ok) throw new Error('Failed to fetch user network');
  return res.json();
}

// --------------------------------------------------------------------------
// Events
// --------------------------------------------------------------------------
export async function fetchAuthorizedEvents(
  userId: string,
  limit = 50,
  offset = 0
): Promise<Page<Event>> {
  const res = await fetch(paginated(`${API_BASE}/events/authorized/${userId}`, limit, offset));
  if (!res.ok) throw new Error('Failed to fetch events');
  const page: Page<Record<string, unknown>> = await res.json();

  return {
    meta: page.meta,
    data: page.data.map((e: Record<string, unknown>) => ({
      ...e,
      startTime: e.startTime ? new Date(e.startTime as string) : undefined,
      endTime:   e.endTime   ? new Date(e.endTime   as string) : undefined,
      minTrustLayerForDetails: e.minTrustLayer as TrustLayer
    })) as Event[]
  };
}

export async function createEvent(payload: Record<string, unknown>): Promise<Event> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
       ...payload,
       minTrustLayer: payload.minTrustLayerForDetails
    })
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}

export async function muteEvent(eventId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${eventId}/mute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error('Failed to mute event');
}

export async function unmuteEvent(eventId: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/events/${eventId}/mute`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId })
  });
  if (!res.ok) throw new Error('Failed to unmute event');
}

export async function fetchChatMessages(eventId: string, limit = 50, offset = 0): Promise<Page<Record<string, unknown>>> {
  const res = await fetch(paginated(`${API_BASE}/events/${eventId}/messages`, limit, offset));
  if (!res.ok) throw new Error('Failed to fetch chat messages');
  return res.json();
}

export async function postChatMessage(eventId: string, senderId: string, encryptedPayload: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/events/${eventId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId, encryptedPayload })
  });
  if (!res.ok) throw new Error('Failed to post chat message');
  return res.json();
}

// --------------------------------------------------------------------------
// Assets
// --------------------------------------------------------------------------
export async function fetchAssetCatalog(
  userId: string,
  limit = 50,
  offset = 0
): Promise<Page<Asset>> {
  const res = await fetch(paginated(`${API_BASE}/assets/catalog/${userId}`, limit, offset));
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function createAsset(payload: Record<string, unknown>): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create asset');
  return res.json();
}

export async function uploadAssetPhoto(assetId: string, blob: Blob): Promise<{ success: boolean; assetId: string }> {
  const res = await fetch(`${API_BASE}/assets/${assetId}/photo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: blob
  });
  if (!res.ok) throw new Error('Failed to upload asset photo');
  return res.json();
}

export async function fetchAssetPhoto(assetId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/assets/${assetId}/photo`);
  if (!res.ok) throw new Error('Failed to fetch asset photo');
  return res.blob();
}

// --------------------------------------------------------------------------
// Shared Lists & Chores (Phase 8.4)
// --------------------------------------------------------------------------

export async function fetchGroupLists(groupId: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/lists`);
  if (!res.ok) throw new Error('Failed to fetch lists');
  return res.json();
}

export async function createGroupList(groupId: string, type: 'GROCERY' | 'CHORE' | 'TODO'): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/lists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type })
  });
  if (!res.ok) throw new Error('Failed to create list');
  return res.json();
}

export async function addListItem(groupId: string, listId: string, encryptedPayload: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/lists/${listId}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ encryptedPayload })
  });
  if (!res.ok) throw new Error('Failed to add list item');
  return res.json();
}

export async function toggleListItem(groupId: string, listId: string, itemId: string, completed: boolean, completedById: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/lists/${listId}/items/${itemId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed, completedById })
  });
  if (!res.ok) throw new Error('Failed to toggle list item');
  return res.json();
}

export async function deleteListItem(groupId: string, listId: string, itemId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/groups/${groupId}/lists/${listId}/items/${itemId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete list item');
}

// --------------------------------------------------------------------------
// Treasury
// --------------------------------------------------------------------------
export async function fetchTreasuryPools(
  groupId: string,
  limit = 50,
  offset = 0
): Promise<Page<Record<string, unknown>>> {
  const res = await fetch(paginated(`${API_BASE}/treasury/pools/${groupId}`, limit, offset));
  if (!res.ok) throw new Error('Failed to fetch treasury pools');
  return res.json();
}

export async function fetchPoolLedger(
  poolId: string,
  limit = 50,
  offset = 0
): Promise<Page<Record<string, unknown>>> {
  const res = await fetch(paginated(`${API_BASE}/treasury/pools/${poolId}/ledger`, limit, offset));
  if (!res.ok) throw new Error('Failed to fetch pool ledger');
  return res.json();
}

export async function createTreasuryPool(payload: {
  groupId: string;
  title: string;
  description?: string;
  goalAmount: number;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/treasury/pools`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create treasury pool');
  return res.json();
}

export async function submitPledge(payload: {
  poolId: string;
  contributorId: string;
  amount: number;
  memo?: string;
}): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/treasury/pledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to submit pledge');
  return res.json();
}
