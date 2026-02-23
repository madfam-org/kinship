"use client";

import React, { useState } from 'react';
import { Event, TrustLayer, User } from '@/models/types';

interface Props {
  currentUser: User;
  onEventCreated: (event: Event) => void;
}

export default function EventCreator({ currentUser, onEventCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSnowball, setIsSnowball] = useState(false);
  const [timeOptions, setTimeOptions] = useState<string[]>(['']);
  
  const handleAddTimeOption = () => setTimeOptions([...timeOptions, '']);
  const handleRemoveTimeOption = (index: number) => {
    setTimeOptions(timeOptions.filter((_, i) => i !== index));
  };
  const handleTimeChange = (index: number, value: string) => {
    const newOptions = [...timeOptions];
    newOptions[index] = value;
    setTimeOptions(newOptions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Filter out empty time options
    const validTimes = timeOptions.filter(t => t.trim() !== '');

    const newEvent: Event = {
      id: `evt_${Date.now()}`,
      hostId: currentUser.id,
      title,
      description,
      attendees: [currentUser],
      isPolling: validTimes.length > 0,
      timePolls: validTimes.map((time, idx) => ({
        id: `poll_${Date.now()}_${idx}`,
        label: time,
        votes: []
      })),
      minTrustLayerForDetails: isSnowball ? TrustLayer.FriendsOfFriends : TrustLayer.ExtendedPolycule,
      broadcastBusyState: true,
      isSnowball
    };

    onEventCreated(newEvent);
    
    // Reset form
    setTitle('');
    setDescription('');
    setIsSnowball(false);
    setTimeOptions(['']);
  };

  return (
    <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', color: 'var(--accent-color)' }}>Draft New Event</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Basic Details */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Event Title</label>
          <input 
            type="text" 
            required 
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-color)',
              color: 'white',
              fontFamily: 'inherit'
            }}
            placeholder="e.g. Polycule Movie Night"
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Description</label>
          <textarea 
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--surface-color)',
              color: 'white',
              fontFamily: 'inherit',
              resize: 'vertical'
            }}
            placeholder="What's the vibe?"
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Polling Module */}
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Propose Times (Async Polling)</label>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Add multiple times to let your trusted rings vote asynchronously.
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {timeOptions.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="text" 
                  value={opt}
                  onChange={(e) => handleTimeChange(idx, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--surface-color)',
                    color: 'white'
                  }}
                  placeholder="e.g. Friday 7:00 PM"
                />
                {timeOptions.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemoveTimeOption(idx)}
                    className="btn"
                    style={{ background: 'var(--surface-color-light)', color: 'var(--danger-color)' }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
            <button 
              type="button" 
              onClick={handleAddTimeOption}
              className="btn"
              style={{ alignSelf: 'flex-start', background: 'rgba(123, 97, 255, 0.1)', color: 'var(--primary-color)' }}
            >
              + Add Another Option
            </button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)' }} />

        {/* Snowball Toggle */}
        <label style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '1rem', 
          cursor: 'pointer',
          padding: '1rem',
          borderRadius: '8px',
          background: isSnowball ? 'rgba(0, 210, 139, 0.1)' : 'var(--surface-color-light)',
          border: isSnowball ? '1px solid var(--success-color)' : '1px solid var(--border-color)'
        }}>
          <input 
            type="checkbox" 
            checked={isSnowball} 
            onChange={(e) => setIsSnowball(e.target.checked)}
            style={{ width: '20px', height: '20px', accentColor: 'var(--success-color)', marginTop: '4px' }}
          />
          <div>
            <div style={{ fontWeight: 'bold', color: isSnowball ? 'var(--success-color)' : 'white' }}>
              Enable &quot;Snowball Mode&quot;
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              This explicitly drops the encryption barrier down to the &quot;Friends of Friends&quot; tier. Use this for community swaps, public parties, or broader organizing that doesn&apos;t expose inner-circle logistics.
            </div>
          </div>
        </label>

        <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', padding: '1rem' }}>
          Publish Event Draft
        </button>

      </form>
    </div>
  );
}
