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
