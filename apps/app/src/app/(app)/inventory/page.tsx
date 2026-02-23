"use client";

import React from 'react';
import { useUser } from '@/lib/session';
import { AssetCatalog } from '@/components/AssetCatalog';
import { AssetAddForm } from '@/components/AssetAddForm';
import { LoanDashboard } from '@/components/LoanDashboard';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function InventoryPage() {
  const currentUser = useUser();

  return (
    <div className="kinship-page">
      <div className="kinship-stack">
        <ErrorBoundary section="Loan Dashboard">
          <LoanDashboard userId={currentUser.id} />
        </ErrorBoundary>

        <hr className="kinship-divider" />

        <ErrorBoundary section="Asset Registry">
          <AssetAddForm userId={currentUser.id} />
          <AssetCatalog userId={currentUser.id} />
        </ErrorBoundary>
      </div>
    </div>
  );
}
