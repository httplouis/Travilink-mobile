import { VehicleType, UIVehicleType } from './types';

/**
 * Map vehicle type from database (lowercase) to UI format (capitalized)
 */
export function mapVehicleType(type: string | null | undefined): UIVehicleType {
  if (!type) return 'Van';
  
  const mapping: Record<string, UIVehicleType> = {
    'van': 'Van',
    'bus': 'Bus',
    'car': 'Car',
    'suv': 'SUV',
    'motorcycle': 'Motorcycle',
  };
  
  return mapping[type.toLowerCase()] || 'Van';
}

/**
 * Extract date part from ISO datetime string
 */
export function extractDate(isoString: string): string {
  if (!isoString) return new Date().toISOString().split('T')[0];
  return isoString.split('T')[0];
}

/**
 * Extract time part from ISO datetime string (HH:mm format)
 */
export function extractTime(isoString: string): string {
  if (!isoString) return '00:00';
  
  try {
    const date = new Date(isoString);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } catch {
    return '00:00';
  }
}

/**
 * Format time for display (HH:mm format)
 */
export function formatTime(isoString: string): string {
  return extractTime(isoString);
}

/**
 * Format time ago (e.g., "2h ago", "1d ago")
 */
export function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Format date for display (e.g., "Nov 13, 2025")
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'Asia/Manila',
    });
  } catch {
    return '';
  }
}

/**
 * Format date and time for display
 */
export function formatDateTime(dateString: string): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Manila',
    });
  } catch {
    return '';
  }
}

/**
 * Format currency (PHP)
 */
export function formatCurrency(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
  }).format(amount);
}

/**
 * Check if user is comptroller based on email
 */
export function isComptroller(email: string | null | undefined): boolean {
  if (!email) return false;
  // Comptroller emails typically contain 'comptroller' or specific domain
  const emailLower = email.toLowerCase();
  return emailLower.includes('comptroller') || 
         emailLower.includes('accounting') ||
         emailLower === 'comptroller@emiliouniversity.edu.ph';
}

