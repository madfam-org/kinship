"use client";

import React, { useMemo } from 'react';
import { Event, TrustLayer } from '../models/types';

interface Props {
  events: Event[];
  viewerLayer: TrustLayer;
}

// Helper to determine layer clearance level
const getLayerLevel = (layer: TrustLayer): number => {
  switch (layer) {
    case TrustLayer.InnerCircle: return 4;
    case TrustLayer.ExtendedPolycule: return 3;
    case TrustLayer.OuterRing: return 2;
    case TrustLayer.FriendsOfFriends: return 1;
    default: return 0;
  }
};

export default function Calendar({ events, viewerLayer }: Props) {
  const viewerLevel = getLayerLevel(viewerLayer);

  const processedEvents = useMemo(() => {
    return events.map(event => {
      const requiredLevel = getLayerLevel(event.minTrustLayerForDetails);
      const isAuthorized = viewerLevel >= requiredLevel;

      // If they are not authorized and the event shouldn't broadcast a busy state to lower layers, hide it completely.
      if (!isAuthorized && !event.broadcastBusyState) {
        return null; // Hidden entirely
      }

      // Determine how to render the event based on clearance
      return {
        ...event,
        isAuthorized,
        // If authorized, show full title. Else, it's just a generic block.
        displayTitle: isAuthorized ? event.title : 'Busy',
      };
      
    }).filter(e => e !== null); // Removing completely hidden events
  }, [events, viewerLevel]);

  return (
    <div className="glass-panel" style={{ padding: '2rem' }}>
      <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Schedule</span>
        <span className="badge badge-primary">
          {events.length} Total Events
        </span>
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {processedEvents.map((event: any) => (
           <div 
             key={event.id}
             style={{
               padding: '1.5rem',
               borderRadius: '12px',
               borderLeft: event.isAuthorized ? '4px solid var(--primary-color)' : '4px solid var(--text-secondary)',
               background: event.isAuthorized ? 'rgba(123, 97, 255, 0.05)' : 'rgba(255, 255, 255, 0.02)',
               display: 'flex',
               flexDirection: 'column',
               gap: '0.5rem'
             }}
           >
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h3 style={{ margin: 0, fontSize: '1.2rem', color: event.isAuthorized ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                 {event.displayTitle}
               </h3>
               <span style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                 {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
                 {new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
               </span>
             </div>
             
             {event.isAuthorized && (
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                 {event.location && <div style={{ marginBottom: '0.25rem' }}>📍 {event.location}</div>}
                 {event.description && <div style={{ marginBottom: '0.5rem' }}>📝 {event.description}</div>}
                 <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                   <span>👥 Attendees: </span>
                   <div style={{ display: 'flex', gap: '0.25rem' }}>
                     {event.attendees.map((attendee: any) => (
                       <span key={attendee.id} className="badge badge-success">{attendee.name}</span>
                     ))}
                   </div>
                 </div>
               </div>
             )}

             {!event.isAuthorized && (
               <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                 <i>Details are hidden by E2E Encryption (Required: {event.minTrustLayerForDetails})</i>
               </div>
             )}
           </div>
        ))}

        {processedEvents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            No visible events for this trust layer.
          </div>
        )}
      </div>
    </div>
  );
}
