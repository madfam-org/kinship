import { Event, User, Asset, TrustLayer } from '@/models/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/v1';

// Users & Networks
export async function fetchUserNetwork(userId: string): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users/${userId}/network`);
  if (!res.ok) throw new Error('Failed to fetch user network');
  return res.json();
}

// Events
export async function fetchAuthorizedEvents(userId: string): Promise<Event[]> {
  const res = await fetch(`${API_BASE}/events/authorized/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch events');
  const events = await res.json();
  
  // Map Prisma Dates to JS Dates for the Event model
  return events.map((e: any) => ({
    ...e,
    startTime: e.startTime ? new Date(e.startTime) : undefined,
    endTime: e.endTime ? new Date(e.endTime) : undefined,
    minTrustLayerForDetails: e.minTrustLayer as TrustLayer
  }));
}

export async function createEvent(payload: any): Promise<Event> {
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

// Assets
export async function fetchAssetCatalog(userId: string): Promise<Asset[]> {
  const res = await fetch(`${API_BASE}/assets/catalog/${userId}`);
  if (!res.ok) throw new Error('Failed to fetch assets');
  return res.json();
}

export async function createAsset(payload: any): Promise<Asset> {
  const res = await fetch(`${API_BASE}/assets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to create asset');
  return res.json();
}
