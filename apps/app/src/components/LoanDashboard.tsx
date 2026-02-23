'use client';

import React, { useState, useEffect } from 'react';
import { decryptAssetMetadata, generateGroupSymmetricKey } from '../lib/crypto';

interface LoanRequest {
  id: string;
  status: string;
  dueDate: string;
  asset: { id: string; ownerId: string; encryptedMetadata: string; status: string };
  borrower: { email: string };
  borrowerId: string;
  decryptedName?: string;
}

export function LoanDashboard({ userId }: { userId: string }) {
  const [loans, setLoans] = useState<LoanRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLoans = async () => {
    try {
      const res = await fetch(`/api/v1/loan-requests/${userId}`);
      const data = await res.json();
      
      const mockGroupKey = await generateGroupSymmetricKey();
      
      const decryptedData = await Promise.all(data.map(async (loan: LoanRequest) => {
        try {
          const decrypted = await decryptAssetMetadata(loan.asset.encryptedMetadata, mockGroupKey);
          return { ...loan, decryptedName: decrypted.name };
        } catch (e) {
          return { ...loan, decryptedName: 'Encrypted Item' };
        }
      }));

      setLoans(decryptedData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, [userId]);

  const updateStatus = async (loanId: string, status: string) => {
    await fetch(`/api/v1/loan-requests/${loanId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    fetchLoans(); // Refresh
  };

  if (loading) return <div>Loading Loans...</div>;

  const myRequests = loans.filter(l => l.borrowerId === userId);
  const requestsForMe = loans.filter(l => l.asset.ownerId === userId);

  return (
    <div style={{ padding: '20px', backgroundColor: '#f9fafb', borderRadius: '12px' }}>
      <h3>Loan Management Dashboard</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-4">
        
        {/* Incoming Requests for My Items */}
        <div>
          <h4>Lending (My Items)</h4>
          {requestsForMe.length === 0 && <p style={{ color: '#6b7280' }}>No active requests.</p>}
          {requestsForMe.map(loan => (
            <div key={loan.id} style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px', background: 'white', marginBottom: '8px' }}>
              <strong>{loan.decryptedName}</strong>
              <div style={{ fontSize: '13px', color: '#4b5563', margin: '4px 0' }}>
                Requested By: {loan.borrower.email}
              </div>
              <div style={{ fontSize: '13px', marginBottom: '8px' }}>
                Status: <span style={{ fontWeight: 'bold' }}>{loan.status}</span>
              </div>
              
              {loan.status === 'PENDING' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => updateStatus(loan.id, 'APPROVED')} style={{ background: '#10b981', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Approve</button>
                  <button onClick={() => updateStatus(loan.id, 'REJECTED')} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Reject</button>
                </div>
              )}
              {loan.status === 'APPROVED' && (
                <button onClick={() => updateStatus(loan.id, 'RETURNED')} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Mark Returned</button>
              )}
            </div>
          ))}
        </div>

        {/* My Outbound Requests */}
        <div>
          <h4>Borrowing (Other&apos;s Items)</h4>
          {myRequests.length === 0 && <p style={{ color: '#6b7280' }}>No active requests.</p>}
          {myRequests.map(loan => (
            <div key={loan.id} style={{ border: '1px solid #e5e7eb', padding: '12px', borderRadius: '8px', background: 'white', marginBottom: '8px' }}>
              <strong>{loan.decryptedName}</strong>
              <div style={{ fontSize: '13px', margin: '4px 0' }}>
                Status: <span style={{ fontWeight: 'bold', color: loan.status === 'APPROVED' ? 'green' : loan.status === 'REJECTED' ? 'red' : 'gray' }}>{loan.status}</span>
              </div>
              {loan.dueDate && (
                <div style={{ fontSize: '12px', color: '#6b7280' }}>Due: {new Date(loan.dueDate).toLocaleDateString()}</div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
