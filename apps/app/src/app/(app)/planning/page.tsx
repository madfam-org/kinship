"use client";

import React, { useState, useEffect } from 'react';
import { Event } from '@/models/types';
import { useUser } from '@/lib/session';
import EventCreator from '@/components/EventCreator';
import EventPollCard from '@/components/EventPollCard';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fetchAuthorizedEvents } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function PlanningPage() {
  const currentUser = useUser();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadEvents() {
      try {
        setIsLoading(true);
        const page = await fetchAuthorizedEvents(currentUser.id);
        setEvents(page.data);
      } catch {
        toast('Could not load events.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadEvents();
  }, [currentUser.id]);

  const handleEventCreated = (newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev]);
    toast('Event draft created!', 'success');
  };

  const handleVote = (eventId: string, pollId: string) => {
    setEvents(prev => prev.map(evt => {
      if (evt.id !== eventId || !evt.isPolling || !evt.timePolls) return evt;
      const updatedPolls = evt.timePolls.map(poll => {
        if (poll.id !== pollId) return poll;
        const hasVoted = poll.votes.includes(currentUser.id);
        const newVotes = hasVoted
          ? poll.votes.filter(id => id !== currentUser.id)
          : [...poll.votes, currentUser.id];
        return { ...poll, votes: newVotes };
      });
      return { ...evt, timePolls: updatedPolls };
    }));
  };

  const pollingEvents = events.filter(e => e.isPolling);

  return (
    <div className="kinship-page">
      <div className="kinship-stack">
        <ErrorBoundary section="Event Creator">
          <EventCreator currentUser={currentUser} onEventCreated={handleEventCreated} />
        </ErrorBoundary>

        <div>
          <h2 style={{ marginBottom: '1.5rem' }}>
            Active Polls
            {pollingEvents.length > 0 && (
              <span className="kinship-badge">{pollingEvents.length}</span>
            )}
          </h2>

          {isLoading ? (
            <p className="kinship-loading">Loading polls…</p>
          ) : (
            <div className="kinship-stack">
              {pollingEvents.map(evt => (
                <ErrorBoundary key={evt.id} section={`Poll ${evt.id}`}>
                  <EventPollCard event={evt} currentUser={currentUser} onVote={handleVote} />
                </ErrorBoundary>
              ))}
              {pollingEvents.length === 0 && (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>
                  No active polls. Create an event above to get started.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
