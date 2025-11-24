import { UserProfile } from '@/lib/types';

export interface TabConfig {
  name: string;
  label: string;
  icon: string;
  iconFocused: string;
  route: string;
}

const COMPTROLLER_EMAILS = ['comptroller@mseuf.edu.ph'];

export function isComptroller(email: string | null | undefined): boolean {
  if (!email) return false;
  return COMPTROLLER_EMAILS.includes(email.toLowerCase());
}

export function getTabsForRole(profile: UserProfile | null): TabConfig[] {
  if (!profile) {
    // Default faculty tabs
    return [
      { name: 'dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home', route: '/(tabs)/dashboard' },
      { name: 'submissions', label: 'Requests', icon: 'list-outline', iconFocused: 'list', route: '/(tabs)/submissions' },
      { name: 'request', label: 'Request', icon: 'add-circle-outline', iconFocused: 'add-circle', route: '/(tabs)/request' },
      { name: 'history', label: 'History', icon: 'time-outline', iconFocused: 'time', route: '/(tabs)/submissions?filter=history' },
      { name: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal', route: '/(tabs)/more' },
    ];
  }

  const isComptrollerUser = isComptroller(profile.email);

  // Comptroller: Home | Budget Review | Request | History | More
  if (isComptrollerUser) {
    return [
      { name: 'dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home', route: '/(tabs)/dashboard' },
      { name: 'budget-review', label: 'Budget', icon: 'calculator-outline', iconFocused: 'calculator', route: '/(tabs)/budget-review' },
      { name: 'request', label: 'Request', icon: 'add-circle-outline', iconFocused: 'add-circle', route: '/(tabs)/request' },
      { name: 'history', label: 'History', icon: 'time-outline', iconFocused: 'time', route: '/(tabs)/submissions?filter=history' },
      { name: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal', route: '/(tabs)/more' },
    ];
  }

  // Head: Home | Inbox | Request | Submissions | More
  if (profile.is_head) {
    return [
      { name: 'dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home', route: '/(tabs)/dashboard' },
      { name: 'inbox', label: 'Inbox', icon: 'mail-outline', iconFocused: 'mail', route: '/(tabs)/inbox' },
      { name: 'request', label: 'Request', icon: 'add-circle-outline', iconFocused: 'add-circle', route: '/(tabs)/request' },
      { name: 'submissions', label: 'Requests', icon: 'list-outline', iconFocused: 'list', route: '/(tabs)/submissions' },
      { name: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal', route: '/(tabs)/more' },
    ];
  }

  // VP: Home | Inbox | Request | History | More
  if (profile.is_vp) {
    return [
      { name: 'dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home', route: '/(tabs)/dashboard' },
      { name: 'inbox', label: 'Inbox', icon: 'mail-outline', iconFocused: 'mail', route: '/(tabs)/inbox' },
      { name: 'request', label: 'Request', icon: 'add-circle-outline', iconFocused: 'add-circle', route: '/(tabs)/request' },
      { name: 'history', label: 'History', icon: 'time-outline', iconFocused: 'time', route: '/(tabs)/submissions?filter=history' },
      { name: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal', route: '/(tabs)/more' },
    ];
  }

  // President: Home | Inbox | Request | History | More
  if (profile.is_president) {
    return [
      { name: 'dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home', route: '/(tabs)/dashboard' },
      { name: 'inbox', label: 'Inbox', icon: 'mail-outline', iconFocused: 'mail', route: '/(tabs)/inbox' },
      { name: 'request', label: 'Request', icon: 'add-circle-outline', iconFocused: 'add-circle', route: '/(tabs)/request' },
      { name: 'history', label: 'History', icon: 'time-outline', iconFocused: 'time', route: '/(tabs)/submissions?filter=history' },
      { name: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal', route: '/(tabs)/more' },
    ];
  }

  // HR: Home | Inbox | Request | History | More
  if (profile.is_hr) {
    return [
      { name: 'dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home', route: '/(tabs)/dashboard' },
      { name: 'inbox', label: 'Inbox', icon: 'mail-outline', iconFocused: 'mail', route: '/(tabs)/inbox' },
      { name: 'request', label: 'Request', icon: 'add-circle-outline', iconFocused: 'add-circle', route: '/(tabs)/request' },
      { name: 'history', label: 'History', icon: 'time-outline', iconFocused: 'time', route: '/(tabs)/submissions?filter=history' },
      { name: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal', route: '/(tabs)/more' },
    ];
  }

  // Faculty/Regular User: Home | Submissions | Request | History | More
  return [
    { name: 'dashboard', label: 'Home', icon: 'home-outline', iconFocused: 'home', route: '/(tabs)/dashboard' },
    { name: 'submissions', label: 'Requests', icon: 'list-outline', iconFocused: 'list', route: '/(tabs)/submissions' },
    { name: 'request', label: 'Request', icon: 'add-circle-outline', iconFocused: 'add-circle', route: '/(tabs)/request' },
    { name: 'history', label: 'History', icon: 'time-outline', iconFocused: 'time', route: '/(tabs)/submissions?filter=history' },
    { name: 'more', label: 'More', icon: 'ellipsis-horizontal-outline', iconFocused: 'ellipsis-horizontal', route: '/(tabs)/more' },
  ];
}

export function getInboxRoute(profile: UserProfile | null): string {
  if (!profile) return '/(tabs)/submissions';
  
  if (isComptroller(profile.email)) {
    return '/(tabs)/budget-review';
  }
  
  if (profile.is_head || profile.is_vp || profile.is_president || profile.is_hr) {
    return '/(tabs)/inbox';
  }
  
  return '/(tabs)/submissions';
}

export function getDashboardRoute(profile: UserProfile | null): string {
  return '/(tabs)/dashboard';
}

