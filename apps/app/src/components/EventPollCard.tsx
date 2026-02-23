"use client";

import React from 'react';
import { Event, User } from '@/models/types';

interface Props {
  event: Event;
  currentUser: User;
  onVote: (eventId: string, pollId: string) => void;
}

export default function EventPollCard({ event, currentUser, onVote }: Props) {
  if (!event.isPolling || !event.timePolls) return null;

  return (
    <div 
      style={{
        padding: '1.5rem',
        borderRadius: '12px',
        borderLeft: '4px solid var(--accent-color)',
        background: 'rgba(0, 208, 245, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        animation: 'fadeIn 0.4s ease-out'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            {event.title}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {event.description}
          </p>
        </div>
        <span className="badge badge-warning" style={{ background: 'rgba(255, 184, 0, 0.1)', color: 'var(--warning-color)' }}>
          Polling
        </span>
      </div>

      {event.isSnowball && (
        <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🌍 Snowball Mode Active: Friends-of-Friends can view and vote.
        </div>
      )}

      <div style={{ background: 'var(--surface-color)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Proposed Times (Select all that work)
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {event.timePolls.map(poll => {
            const hasVoted = poll.votes.includes(currentUser.id);
            const voteRatio = event.attendees.length > 0 ? (poll.votes.length / event.attendees.length) * 100 : 0;

            return (
              <div key={poll.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <button
                  onClick={() => onVote(event.id, poll.id)}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: hasVoted ? 'rgba(123, 97, 255, 0.15)' : 'var(--bg-color)',
                    border: hasVoted ? '1px solid var(--primary-color)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    color: hasVoted ? 'white' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    textAlign: 'left'
                  }}
                  onMouseOver={(e) => {
                    if (!hasVoted) e.currentTarget.style.background = 'var(--surface-color-light)';
                  }}
                  onMouseOut={(e) => {
                    if (!hasVoted) e.currentTarget.style.background = 'var(--bg-color)';
                  }}
                >
                  <span style={{ fontWeight: hasVoted ? 600 : 400 }}>{poll.label}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.85rem' }}>{poll.votes.length} votes</span>
                    <div style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '50%', 
                      border: hasVoted ? 'none' : '2px solid var(--text-secondary)',
                      background: hasVoted ? 'var(--primary-color)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '0.8rem'
                    }}>
                      {hasVoted ? '✓' : ''}
                    </div>
                  </div>
                </button>
                
                {/* Visual Progress Bar for Consensus */}
                <div style={{ width: '100%', height: '4px', background: 'var(--bg-color)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${voteRatio}%`, 
                      background: hasVoted ? 'var(--primary-color)' : 'var(--text-secondary)',
                      transition: 'width 0.3s ease-out'
                    }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
