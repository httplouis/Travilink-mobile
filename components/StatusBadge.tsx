import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RequestStatus } from '@/lib/types';

interface StatusBadgeProps {
  status: RequestStatus | string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending_head: {
    label: 'Pending Head',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  pending_parent_head: {
    label: 'Pending Parent Head',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  pending_admin: {
    label: 'Pending Admin',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  pending_comptroller: {
    label: 'Pending Comptroller',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  pending_hr: {
    label: 'Pending HR',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  pending_vp: {
    label: 'Pending VP',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  pending_president: {
    label: 'Pending President',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  pending_exec: {
    label: 'Pending Executive',
    color: '#92400e',
    bgColor: '#fef3c7',
    icon: 'time',
  },
  approved: {
    label: 'Approved',
    color: '#166534',
    bgColor: '#d1fae5',
    icon: 'checkmark-circle',
  },
  rejected: {
    label: 'Rejected',
    color: '#991b1b',
    bgColor: '#fee2e2',
    icon: 'close-circle',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#991b1b',
    bgColor: '#fee2e2',
    icon: 'close-circle',
  },
  draft: {
    label: 'Draft',
    color: '#1e40af',
    bgColor: '#dbeafe',
    icon: 'document-text',
  },
};

const SIZE_STYLES = {
  sm: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 11,
    iconSize: 12,
  },
  md: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 12,
    iconSize: 14,
  },
  lg: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
    iconSize: 16,
  },
};

export default function StatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || {
    label: status,
    color: '#6b7280',
    bgColor: '#f3f4f6',
    icon: 'help-circle',
  };

  const sizeStyle = SIZE_STYLES[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bgColor,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
      ]}
    >
      {showIcon && (
        <Ionicons
          name={config.icon}
          size={sizeStyle.iconSize}
          color={config.color}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: config.color,
            fontSize: sizeStyle.fontSize,
          },
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: '600',
  },
});

