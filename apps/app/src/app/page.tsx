"use client";

import React, { useState } from 'react';
import { Event, TrustLayer, User } from '@/models/types';
import TrustRingSelector from '@/components/TrustRingSelector';
import Calendar from '@/components/Calendar';
import SocialBatteryDashboard from '@/components/SocialBatteryDashboard';
import NetworkCapacityList from '@/components/NetworkCapacityList';
import EventCreator from '@/components/EventCreator';
import EventPollCard from '@/components/EventPollCard';
import { AssetCatalog } from '@/components/AssetCatalog';
import { AssetAddForm } from '@/components/AssetAddForm';
import { LoanDashboard } from '@/components/LoanDashboard';
import { generateUserKeyPair, initializeGroupKeyDemo, bufferToBase64 } from '@/lib/crypto';
import { fetchAuthorizedEvents, fetchUserNetwork } from '@/lib/api';

// Temporary Mock Current User until Janua Auth parsing is fully mapped
// We will assume Alice (u1) is the seeded current user.
const currentUser = { id: 'u1', name: 'Alice', avatarUrl: '', socialBattery: 80 };

// Removed initialMockEvents and mockUsers, we will fetch from Database.

export default function Home() {
  const [currentLayer, setCurrentLayer] = useState<TrustLayer>(TrustLayer.InnerCircle);
  const [events, setEvents] = useState<Event[]>([]);
  const [networkDirectory, setNetworkDirectory] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // State for the Social Battery Demo
  const [myBattery, setMyBattery] = useState(currentUser.socialBattery || 80);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Switch between Calendar, Planning, and Inventory modes
  const [activeTab, setActiveTab] = useState<'calendar' | 'planning' | 'inventory'>('calendar');

  // State for the WebCrypto Demo
  const [demoLogs, setDemoLogs] = useState<string[]>([]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  React.useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [netData, eventData] = await Promise.all([
          fetchUserNetwork(currentUser.id),
          fetchAuthorizedEvents(currentUser.id)
        ]);
        setNetworkDirectory(netData);
        setEvents(eventData);
      } catch (err) {
        console.error("Failed to fetch initial state:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const handleCriticalAlert = () => {
    setAlertMessage("Alert Sent: You have notified your Inner Circle that you are currently at low capacity.");
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const handleEventCreated = (newEvent: Event) => {
    setEvents([newEvent, ...events]);
    setActiveTab('calendar');
  };

  const handleVote = (eventId: string, pollId: string) => {
    setEvents(events.map(evt => {
      if (evt.id !== eventId || !evt.isPolling || !evt.timePolls) return evt;
      
      const updatedPolls = evt.timePolls.map(poll => {
        if (poll.id !== pollId) return poll;
        
        // Toggle vote for currentUser (u1 / Alice)
        const hasVoted = poll.votes.includes(currentUser.id);
        const newVotes = hasVoted 
          ? poll.votes.filter(id => id !== currentUser.id)
          : [...poll.votes, currentUser.id];
          
        return { ...poll, votes: newVotes };
      });

      return { ...evt, timePolls: updatedPolls };
    }));
  };

  const runCryptoDemo = async () => { /* ... (Omitted for brevity) ... */ };

  const finalizedEvents = events.filter(e => !e.isPolling);
  const pollingEvents = events.filter(e => e.isPolling);

  return (
    <main className="container animate-fade-in">
      {alertMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--danger-color)',
          color: 'white',
          padding: '1rem 2rem',
          borderRadius: '8px',
          boxShadow: '0 4px 20px rgba(255, 59, 59, 0.4)',
          zIndex: 1000,
          fontWeight: 600,
          animation: 'fadeIn 0.3s ease-out forwards'
        }}>
          ⚠️ {alertMessage}
        </div>
      )}

      <header style={{ marginBottom: '3rem', textAlign: 'center' }}>
        <h1 className="gradient-text" style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
          Kinship
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.2rem' }}>
          Secure, tiered scheduling & resource pooling.
        </p>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 2fr)', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        
        {/* Left Column: Social Battery & Network */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <SocialBatteryDashboard 
            initialCapacity={myBattery} 
            onCapacityChange={setMyBattery} 
            onCriticalAlert={handleCriticalAlert}
          />
          <NetworkCapacityList contacts={networkDirectory} />

          {/* WebCrypto Demo Panel */}
          {/* ... (Omitted for brevity) ... */}
        </div>

        {/* Right Column: Calendar & Polling */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className={`btn ${activeTab === 'calendar' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('calendar')}
              style={{ flex: 1 }}
            >
              📅 Schedule
            </button>
            <button 
              className={`btn ${activeTab === 'planning' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('planning')}
              style={{ flex: 1 }}
            >
              📊 Async Planning ({pollingEvents.length})
            </button>
            <button 
              className={`btn ${activeTab === 'inventory' ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setActiveTab('inventory')}
              style={{ flex: 1 }}
            >
              📦 Inventory
            </button>
          </div>

          <TrustRingSelector currentLayer={currentLayer} onChange={setCurrentLayer} />
          
          {activeTab === 'calendar' ? (
            <Calendar events={finalizedEvents} viewerLayer={currentLayer} />
          ) : activeTab === 'inventory' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <LoanDashboard userId={currentUser.id} />
              <div style={{ borderTop: '2px dashed var(--border-color)', paddingTop: '1rem' }} />
              <AssetAddForm userId={currentUser.id} />
              <AssetCatalog userId={currentUser.id} />
            </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               <EventCreator currentUser={currentUser} onEventCreated={handleEventCreated} />
               
               <div>
                 <h2 style={{ marginBottom: '1.5rem' }}>Active Polls</h2>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   {pollingEvents.map(evt => (
                     <EventPollCard 
                       key={evt.id} 
                       event={evt} 
                       currentUser={currentUser} 
                       onVote={handleVote} 
                     />
                   ))}
                   {pollingEvents.length === 0 && (
                     <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No active polls.</p>
                   )}
                 </div>
               </div>
             </div>
          )}

        </div>

      </div>
    </main>
  );
}
