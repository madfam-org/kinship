"use client";

import React from 'react';
import { User } from '../models/types';

interface Props {
  contacts: User[];
}

export default function NetworkCapacityList({ contacts }: Props) {
  return (
    <div className="glass-panel" style={{ padding: '2rem', flex: 1 }}>
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Inner Circle Capacity</span>
        <span className="badge badge-success">{contacts.length} Active</span>
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {contacts.map(contact => {
          let colorVar = 'var(--success-color)';
          let statusText = 'Available';
          
          if (contact.socialBattery <= 20) {
            colorVar = 'var(--danger-color)';
            statusText = 'Low Energy (Do Not Disturb)';
          } else if (contact.socialBattery <= 60) {
            colorVar = 'var(--warning-color)';
            statusText = 'Limited Bandwidth';
          }

          return (
            <div key={contact.id} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              padding: '1rem',
              borderRadius: '12px',
              background: 'var(--surface-color-light)',
              borderLeft: `4px solid ${colorVar}`
            }}>
              {/* Avatar Placeholder */}
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${colorVar}, var(--surface-color))`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                color: 'white'
              }}>
                {contact.name.charAt(0)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <span style={{ fontWeight: 500 }}>{contact.name}</span>
                  <span style={{ fontSize: '0.9rem', color: colorVar, fontWeight: 'bold' }}>{contact.socialBattery}%</span>
                </div>
                
                {/* Progress Bar Background */}
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden' }}>
                   {/* Progress Fill */}
                   <div style={{ 
                     height: '100%', 
                     width: `${contact.socialBattery}%`, 
                     background: colorVar,
                     transition: 'width 0.5s ease-out'
                   }} />
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  {statusText}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
