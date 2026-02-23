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
import { generateUserKeyPair, initializeGroupKeyDemo, bufferToBase64 } from '@/lib/crypto';

// Mock Users
const mockUser1: User = { id: 'u1', name: 'Alice', avatarUrl: '', socialBattery: 80 };
const mockUser2: User = { id: 'u2', name: 'Bob', avatarUrl: '', socialBattery: 65 };
const mockUser3: User = { id: 'u3', name: 'Charlie', avatarUrl: '', socialBattery: 90 };

const initialMockEvents: Event[] = [
  {
    id: 'e1',
    hostId: 'u1',
    title: 'Household Grocery Run',
    description: 'Picking up supplies for the week at Trader Joe\'s.',
    location: 'Trader Joe\'s',
    startTime: new Date(new Date().setHours(10, 0, 0, 0)),
    endTime: new Date(new Date().setHours(11, 30, 0, 0)),
    attendees: [mockUser1, mockUser2],
    isPolling: false,
    minTrustLayerForDetails: TrustLayer.InnerCircle,
    broadcastBusyState: true,
    isSnowball: false
  },
  {
    id: 'e2',
    hostId: 'u1',
    title: 'Polycule Board Game Night',
    description: 'Playing Catan and checking in on logistics.',
    location: 'Alice\'s Living Room',
    startTime: new Date(new Date().setHours(19, 0, 0, 0)),
    endTime: new Date(new Date().setHours(22, 0, 0, 0)),
    attendees: [mockUser1, mockUser2, mockUser3],
    isPolling: false,
    minTrustLayerForDetails: TrustLayer.ExtendedPolycule,
    broadcastBusyState: true,
    isSnowball: false
  },
  {
    id: 'e_poll_1',
    hostId: 'u2',
    title: 'Summer Lake Trip Planning (Snowball)',
    description: 'Let\'s figure out which weekend works best for everyone to head to the lake!',
    attendees: [mockUser1, mockUser2, mockUser3],
    isPolling: true,
    timePolls: [
      { id: 'p1', label: 'June 12th - 14th', votes: ['u2'] },
      { id: 'p2', label: 'June 19th - 21st', votes: ['u2', 'u3'] },
      { id: 'p3', label: 'July 3rd - 5th', votes: [] },
    ],
    minTrustLayerForDetails: TrustLayer.FriendsOfFriends,
    broadcastBusyState: false, // Polls don't block out time until finalized
    isSnowball: true
  }
];

export default function Home() {
  const [currentLayer, setCurrentLayer] = useState<TrustLayer>(TrustLayer.InnerCircle);
  const [events, setEvents] = useState<Event[]>(initialMockEvents);
  
  // State for the Social Battery Demo
  const [myBattery, setMyBattery] = useState(80);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  // Switch between Calendar, Planning, and Inventory modes
  const [activeTab, setActiveTab] = useState<'calendar' | 'planning' | 'inventory'>('calendar');

  // State for the WebCrypto Demo
  const [demoLogs, setDemoLogs] = useState<string[]>([]);
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  // Mock Inner Circle Data for the Network List
  const mockInnerCircle: User[] = [
    { ...mockUser2, socialBattery: 65 },
    { ...mockUser3, socialBattery: 15 }
  ];

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
        const hasVoted = poll.votes.includes(mockUser1.id);
        const newVotes = hasVoted 
          ? poll.votes.filter(id => id !== mockUser1.id)
          : [...poll.votes, mockUser1.id];
          
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
          <NetworkCapacityList contacts={mockInnerCircle} />

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
              <AssetAddForm userId={mockUser1.id} />
              <AssetCatalog userId={mockUser1.id} />
            </div>
          ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
               <EventCreator currentUser={mockUser1} onEventCreated={handleEventCreated} />
               
               <div>
                 <h2 style={{ marginBottom: '1.5rem' }}>Active Polls</h2>
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   {pollingEvents.map(evt => (
                     <EventPollCard 
                       key={evt.id} 
                       event={evt} 
                       currentUser={mockUser1} 
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
