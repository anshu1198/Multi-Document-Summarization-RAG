/**
 * User Profile & Workspace Identity Helper
 * Persists user name and workspace role in browser localStorage
 */

export interface UserProfile {
  name: string;
  role: string;
}

const STORAGE_KEY_NAME = 'contextiq_user_name';
const STORAGE_KEY_ROLE = 'contextiq_user_role';

export function getStoredUserProfile(): UserProfile {
  try {
    const name = localStorage.getItem(STORAGE_KEY_NAME) || 'Document Analyst';
    const role = localStorage.getItem(STORAGE_KEY_ROLE) || 'AI Document Workspace';
    return { name, role };
  } catch {
    return { name: 'Document Analyst', role: 'AI Document Workspace' };
  }
}

export function saveStoredUserProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY_NAME, profile.name.trim() || 'Document Analyst');
    localStorage.setItem(STORAGE_KEY_ROLE, profile.role.trim() || 'AI Document Workspace');
  } catch (e) {
    console.error('Failed to save user profile to localStorage:', e);
  }
}

export function getInitials(name: string): string {
  if (!name || !name.trim()) return 'IQ';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
