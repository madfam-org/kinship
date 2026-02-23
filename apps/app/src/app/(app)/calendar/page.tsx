"use client";

import React, { useState, useEffect } from 'react';
import { Event, TrustLayer, User } from '@/models/types';
import { useUser } from '@/lib/session';
import TrustRingSelector from '@/components/TrustRingSelector';
import Calendar from '@/components/Calendar';
import SocialBatteryDashboard from '@/components/SocialBatteryDashboard';
import NetworkCapacityList from '@/components/NetworkCapacityList';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { fetchAuthorizedEvents, fetchUserNetwork } from '@/lib/api';
import { useToast } from '@/components/ui/toast';

export default function CalendarPage() {
  const currentUser = useUser();
  const { toast } = useToast();
  const [currentLayer, setCurrentLayer] = useState<TrustLayer>(TrustLayer.InnerCircle);
  const [events, setEvents] = useState<Event[]>([]);
  const [networkDirectory, setNetworkDirectory] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myBattery, setMyBattery] = useState(currentUser.socialBattery);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [netData, eventsPage] = await Promise.all([
          fetchUserNetwork(currentUser.id),
          fetchAuthorizedEvents(currentUser.id),
        ]);
        setNetworkDirectory(netData);
        setEvents(eventsPage.data);
      } catch (err) {
        console.error('Failed to fetch calendar data:', err);
        toast('Could not load your schedule and network. Is the API running?', 'error');
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [currentUser.id]);

  const handleCriticalAlert = () => {
    setAlertMessage('Alert Sent: You have notified your Inner Circle that you are currently at low capacity.');
    setTimeout(() => setAlertMessage(null), 5000);
  };

  const finalizedEvents = events.filter(e => !e.isPolling);

  return (
    <div className="kinship-page">
      {alertMessage && (
        <div className="kinship-alert-banner" role="alert">
          ⚠️ {alertMessage}
        </div>
      )}

      <div className="kinship-two-col">
        {/* Left sidebar */}
        <aside className="kinship-sidebar">
          <SocialBatteryDashboard
            initialCapacity={myBattery}
            onCapacityChange={setMyBattery}
            onCriticalAlert={handleCriticalAlert}
          />
          <NetworkCapacityList contacts={networkDirectory} />
        </aside>

        {/* Main content */}
        <section className="kinship-main">
          <TrustRingSelector currentLayer={currentLayer} onChange={setCurrentLayer} />
          {isLoading ? (
            <p className="kinship-loading">Loading your schedule…</p>
          ) : (
            <ErrorBoundary section="Calendar">
              <Calendar events={finalizedEvents} viewerLayer={currentLayer} />
            </ErrorBoundary>
          )}
        </section>
      </div>
    </div>
  );
}
