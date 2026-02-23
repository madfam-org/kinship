'use client';

import React from 'react';
import { TrustLayer } from '../models/types';

interface Props {
  currentLayer: TrustLayer;
  onChange: (layer: TrustLayer) => void;
}

export default function TrustRingSelector({ currentLayer, onChange }: Props) {
  const layers = [
    { id: TrustLayer.InnerCircle, label: 'Inner Circle', desc: 'Household, Primary Partners' },
    { id: TrustLayer.ExtendedPolycule, label: 'Extended Polycule', desc: 'Secondary Partners, Close Friends' },
    { id: TrustLayer.OuterRing, label: 'Outer Ring', desc: 'Co-workers, Distant Friends' },
    { id: TrustLayer.FriendsOfFriends, label: 'Friends of Friends', desc: 'Snowball Events' },
  ];

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <h3 className="gradient-text" style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>
        Viewing Calendar As:
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {layers.map(layer => (
          <button
            key={layer.id}
            onClick={() => onChange(layer.id)}
            className={`btn ${currentLayer === layer.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '1rem' }}
          >
            <span style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{layer.label}</span>
            <span style={{ fontSize: '0.8rem', opacity: 0.8, textAlign: 'left' }}>{layer.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
