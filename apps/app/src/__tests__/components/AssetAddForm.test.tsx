import React from 'react';
import { render, screen } from '@testing-library/react';
import { AssetAddForm } from '@/components/AssetAddForm';

// Mock the UI toast hook since we're not wrapping in a ToastProvider
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: jest.fn() }),
}));

// Mock the API and Crypto functions to prevent network calls and complex WebCrypto setup during simple render tests
jest.mock('@/lib/api', () => ({
  createAsset: jest.fn(),
  uploadAssetPhoto: jest.fn(),
}));

jest.mock('@/lib/crypto', () => ({
  encryptAssetMetadata: jest.fn(),
  generateGroupSymmetricKey: jest.fn(),
  getStoredKeyPair: jest.fn(),
  generateUserKeyPair: jest.fn(),
  saveKeyPair: jest.fn(),
  encryptKeyForUser: jest.fn(),
  encryptBlob: jest.fn(),
}));

describe('AssetAddForm', () => {
  it('renders the form fields correctly', () => {
    render(<AssetAddForm userId="user-123" />);
    
    // Check for essential form elements
    expect(screen.getByLabelText(/Item Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Photo \(Encrypted before upload\)/i)).toBeInTheDocument();
    
    // Check for the submit button
    expect(screen.getByRole('button', { name: /Encrypt & Catalog/i })).toBeInTheDocument();
  });
});
