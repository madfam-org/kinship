"use client";

import React from 'react';
import { useUser } from '@/lib/session';
import { TreasuryDashboard } from '@/components/TreasuryDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function TreasuryPage() {
  const currentUser = useUser();

  return (
    <div className="kinship-page">
      <ErrorBoundary section="Collective Treasury">
        {/* groupId is currently hardcoded to g1 (the demo seed group).
            Phase 8 will add a group selector. */}
        <TreasuryDashboard userId={currentUser.id} groupId="g1" />
      </ErrorBoundary>
    </div>
  );
}
