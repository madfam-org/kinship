"use client";

import React, { useState } from 'react';

interface Props {
  initialCapacity: number;
  onCapacityChange: (newCapacity: number) => void;
  onCriticalAlert: () => void;
}

export default function SocialBatteryDashboard({ initialCapacity, onCapacityChange, onCriticalAlert }: Props) {
  const [capacity, setCapacity] = useState(initialCapacity);
  const [autoAlertEnabled, setAutoAlertEnabled] = useState(true);

  // Determine color based on capacity
  let colorVar = 'var(--success-color)';
  let statusText = 'Optimal Bandwidth';
  
  if (capacity <= 20) {
    colorVar = 'var(--danger-color)';
    statusText = 'Critical Depletion';
  } else if (capacity <= 60) {
    colorVar = 'var(--warning-color)';
    statusText = 'Limited Bandwidth';
  }

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setCapacity(val);
  };

  const handleSliderRelease = () => {
    onCapacityChange(capacity);
    if (capacity <= 20 && autoAlertEnabled) {
      onCriticalAlert();
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>My Social Battery</h2>
        <span className="badge" style={{ backgroundColor: `${colorVar}22`, color: colorVar, padding: '0.5rem 1rem' }}>
          {statusText}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', margin: '1rem 0' }}>
        {/* Circular Visualizer */}
        <div style={{ 
          position: 'relative', 
          width: '120px', 
          height: '120px', 
          borderRadius: '50%', 
          background: `conic-gradient(${colorVar} ${capacity}%, var(--surface-color-light) ${capacity}%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 0 20px ${colorVar}44`
        }}>
          <div style={{ 
            width: '90px', 
            height: '90px', 
            borderRadius: '50%', 
            background: 'var(--bg-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: colorVar
          }}>
            {capacity}%
          </div>
        </div>

        {/* Input Controls */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
              Adjust Current Capacity
            </label>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={capacity} 
              onChange={handleSliderChange}
              onMouseUp={handleSliderRelease}
              onTouchEnd={handleSliderRelease}
              style={{
                width: '100%',
                accentColor: colorVar,
                cursor: 'pointer',
                height: '8px',
                borderRadius: '4px',
                background: 'var(--surface-color-light)',
                appearance: 'none',
                outline: 'none'
              }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', marginTop: '0.5rem' }}>
            <input 
              type="checkbox" 
              checked={autoAlertEnabled} 
              onChange={(e) => setAutoAlertEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', accentColor: 'var(--primary-color)' }}
            />
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Auto-Alert Inner Circle gently when below 20%
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
