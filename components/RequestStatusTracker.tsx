import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RequestStatus } from '@/lib/types';

interface ApprovalStage {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  role: string;
}

interface RequestStatusTrackerProps {
  status: RequestStatus;
  requesterIsHead?: boolean;
  hasBudget?: boolean;
  hasParentHead?: boolean;
  requiresPresidentApproval?: boolean;
  
  // Approval timestamps and names
  headApprovedAt?: string | null;
  headApprovedBy?: string | null;
  parentHeadApprovedAt?: string | null;
  parentHeadApprovedBy?: string | null;
  adminProcessedAt?: string | null;
  adminProcessedBy?: string | null;
  comptrollerApprovedAt?: string | null;
  comptrollerApprovedBy?: string | null;
  hrApprovedAt?: string | null;
  hrApprovedBy?: string | null;
  vpApprovedAt?: string | null;
  vpApprovedBy?: string | null;
  presidentApprovedAt?: string | null;
  presidentApprovedBy?: string | null;
  execApprovedAt?: string | null;
  execApprovedBy?: string | null;
  
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionStage?: string | null;
  
  compact?: boolean;
}

const STAGES: ApprovalStage[] = [
  { key: 'head', label: 'Department Head', icon: 'person', role: 'Head' },
  { key: 'parent_head', label: 'College Dean', icon: 'school', role: 'Dean' },
  { key: 'admin', label: 'Admin (Assignment)', icon: 'shield-checkmark', role: 'Admin' },
  { key: 'comptroller', label: 'Comptroller', icon: 'cash', role: 'Comptroller' },
  { key: 'hr', label: 'Human Resources', icon: 'people', role: 'HR' },
  { key: 'vp', label: 'Vice President', icon: 'star', role: 'VP' },
  { key: 'president', label: 'President', icon: 'checkmark-circle', role: 'President' },
];

export default function RequestStatusTracker({
  status,
  requesterIsHead = false,
  hasBudget = false,
  hasParentHead = false,
  requiresPresidentApproval = false,
  headApprovedAt,
  headApprovedBy,
  parentHeadApprovedAt,
  parentHeadApprovedBy,
  adminProcessedAt,
  adminProcessedBy,
  comptrollerApprovedAt,
  comptrollerApprovedBy,
  hrApprovedAt,
  hrApprovedBy,
  vpApprovedAt,
  vpApprovedBy,
  presidentApprovedAt,
  presidentApprovedBy,
  execApprovedAt,
  execApprovedBy,
  rejectedAt,
  rejectedBy,
  rejectionStage,
  compact = false,
}: RequestStatusTrackerProps) {
  // Filter stages based on workflow
  const activeStages = STAGES.filter(stage => {
    if (stage.key === 'head' && requesterIsHead) return false;
    if (stage.key === 'parent_head' && !hasParentHead) return false;
    if (stage.key === 'comptroller' && !hasBudget) return false;
    if (stage.key === 'president' && !requiresPresidentApproval) return false;
    return true;
  });

  const getStageStatus = (stageKey: string): 'completed' | 'current' | 'pending' | 'rejected' => {
    if (status === 'rejected' && rejectionStage === stageKey) return 'rejected';
    if (status === 'cancelled') return 'rejected';
    
    switch (stageKey) {
      case 'head':
        if (headApprovedAt) return 'completed';
        if (status === 'pending_head') return 'current';
        if (['pending_admin', 'pending_comptroller', 'pending_hr', 'pending_exec', 'approved'].includes(status)) return 'completed';
        return 'pending';
      
      case 'parent_head':
        if (parentHeadApprovedAt) return 'completed';
        if (status === 'pending_parent_head') return 'current';
        if (['pending_admin', 'pending_comptroller', 'pending_hr', 'pending_exec', 'approved'].includes(status)) return 'completed';
        return 'pending';
      
      case 'admin':
        if (adminProcessedAt) return 'completed';
        if (status === 'pending_admin') return 'current';
        if (['pending_comptroller', 'pending_hr', 'pending_exec', 'approved'].includes(status)) return 'completed';
        return 'pending';
      
      case 'comptroller':
        if (comptrollerApprovedAt) return 'completed';
        if (status === 'pending_comptroller') return 'current';
        if (['pending_hr', 'pending_exec', 'approved'].includes(status)) return 'completed';
        return 'pending';
      
      case 'hr':
        if (hrApprovedAt) return 'completed';
        if (status === 'pending_hr') return 'current';
        if (['pending_vp', 'pending_president', 'pending_exec', 'approved'].includes(status)) return 'completed';
        return 'pending';
      
      case 'vp':
        if (vpApprovedAt) return 'completed';
        if (status === 'pending_vp') return 'current';
        if (['pending_president', 'approved'].includes(status)) return 'completed';
        return 'pending';
      
      case 'president':
        if (presidentApprovedAt) return 'completed';
        if (status === 'pending_president') return 'current';
        if (status === 'approved' && presidentApprovedAt) return 'completed';
        return 'pending';
      
      default:
        return 'pending';
    }
  };

  const getApproverName = (stageKey: string): string | null | undefined => {
    switch (stageKey) {
      case 'head': return headApprovedBy;
      case 'parent_head': return parentHeadApprovedBy;
      case 'admin': return adminProcessedBy;
      case 'comptroller': return comptrollerApprovedBy;
      case 'hr': return hrApprovedBy;
      case 'vp': return vpApprovedBy || execApprovedBy;
      case 'president': return presidentApprovedBy || execApprovedBy;
      default: return null;
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        {activeStages.map((stage, idx) => {
          const stageStatus = getStageStatus(stage.key);
          const isLast = idx === activeStages.length - 1;
          
          return (
            <React.Fragment key={stage.key}>
              <View
                style={[
                  styles.compactIcon,
                  stageStatus === 'completed' && styles.compactIconCompleted,
                  stageStatus === 'current' && styles.compactIconCurrent,
                  stageStatus === 'rejected' && styles.compactIconRejected,
                ]}
              >
                {stageStatus === 'completed' && (
                  <Ionicons name="checkmark" size={12} color="#fff" />
                )}
                {stageStatus === 'current' && (
                  <Ionicons name="time" size={12} color="#fff" />
                )}
                {stageStatus === 'rejected' && (
                  <Ionicons name="close" size={12} color="#fff" />
                )}
                {stageStatus === 'pending' && (
                  <Ionicons name={stage.icon} size={12} color="#999" />
                )}
              </View>
              {!isLast && (
                <View
                  style={[
                    styles.compactConnector,
                    stageStatus === 'completed' && styles.compactConnectorCompleted,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {status === 'rejected' && (
        <View style={styles.rejectedBanner}>
          <Ionicons name="alert-circle" size={20} color="#dc2626" />
          <View style={styles.rejectedText}>
            <Text style={styles.rejectedTitle}>Request Rejected</Text>
            <Text style={styles.rejectedSubtitle}>
              Rejected at {rejectionStage || 'unknown'} stage
              {rejectedBy && ` by ${rejectedBy}`}
            </Text>
          </View>
        </View>
      )}

      {status === 'approved' && (
        <View style={styles.approvedBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
          <View style={styles.approvedText}>
            <Text style={styles.approvedTitle}>Request Approved</Text>
            <Text style={styles.approvedSubtitle}>
              All approvals completed successfully
            </Text>
          </View>
        </View>
      )}

      <View style={styles.timeline}>
        {activeStages.map((stage, idx) => {
          const stageStatus = getStageStatus(stage.key);
          const approverName = getApproverName(stage.key);
          const isLast = idx === activeStages.length - 1;
          
          return (
            <View key={stage.key} style={styles.timelineItem}>
              <View style={styles.timelineIconContainer}>
                <View
                  style={[
                    styles.timelineIcon,
                    stageStatus === 'completed' && styles.timelineIconCompleted,
                    stageStatus === 'current' && styles.timelineIconCurrent,
                    stageStatus === 'rejected' && styles.timelineIconRejected,
                  ]}
                >
                  {stageStatus === 'completed' && (
                    <Ionicons name="checkmark" size={20} color="#fff" />
                  )}
                  {stageStatus === 'current' && (
                    <Ionicons name="time" size={20} color="#fff" />
                  )}
                  {stageStatus === 'rejected' && (
                    <Ionicons name="close" size={20} color="#fff" />
                  )}
                  {stageStatus === 'pending' && (
                    <Ionicons name={stage.icon} size={20} color="#999" />
                  )}
                </View>
                {!isLast && (
                  <View
                    style={[
                      styles.timelineConnector,
                      stageStatus === 'completed' && styles.timelineConnectorCompleted,
                    ]}
                  />
                )}
              </View>

              <View style={styles.timelineContent}>
                <View style={styles.timelineHeader}>
                  <View>
                    <Text
                      style={[
                        styles.timelineLabel,
                        stageStatus === 'current' && styles.timelineLabelCurrent,
                        stageStatus === 'completed' && styles.timelineLabelCompleted,
                      ]}
                    >
                      {stage.label}
                    </Text>
                    <Text style={styles.timelineRole}>{stage.role}</Text>
                  </View>
                  
                  {stageStatus === 'completed' && approverName && (
                    <View style={styles.timelineApprover}>
                      <Text style={styles.timelineApproverName}>{approverName}</Text>
                    </View>
                  )}
                  
                  {stageStatus === 'current' && (
                    <View style={styles.currentBadge}>
                      <Text style={styles.currentBadgeText}>Pending</Text>
                    </View>
                  )}
                  
                  {stageStatus === 'pending' && (
                    <View style={styles.waitingBadge}>
                      <Text style={styles.waitingText}>Waiting</Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  compactIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactIconCompleted: {
    backgroundColor: '#16a34a',
  },
  compactIconCurrent: {
    backgroundColor: '#2563eb',
  },
  compactIconRejected: {
    backgroundColor: '#dc2626',
  },
  compactConnector: {
    width: 32,
    height: 2,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 4,
  },
  compactConnectorCompleted: {
    backgroundColor: '#16a34a',
  },
  rejectedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  rejectedText: {
    marginLeft: 12,
    flex: 1,
  },
  rejectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991b1b',
    marginBottom: 4,
  },
  rejectedSubtitle: {
    fontSize: 14,
    color: '#b91c1c',
  },
  approvedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  approvedText: {
    marginLeft: 12,
    flex: 1,
  },
  approvedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 4,
  },
  approvedSubtitle: {
    fontSize: 14,
    color: '#15803d',
  },
  timeline: {
    paddingLeft: 8,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 24,
  },
  timelineIconContainer: {
    alignItems: 'center',
    marginRight: 16,
  },
  timelineIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineIconCompleted: {
    backgroundColor: '#16a34a',
  },
  timelineIconCurrent: {
    backgroundColor: '#2563eb',
  },
  timelineIconRejected: {
    backgroundColor: '#dc2626',
  },
  timelineConnector: {
    width: 2,
    height: 48,
    backgroundColor: '#e5e7eb',
    marginTop: 4,
  },
  timelineConnectorCompleted: {
    backgroundColor: '#16a34a',
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  timelineLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
  },
  timelineLabelCurrent: {
    color: '#2563eb',
  },
  timelineLabelCompleted: {
    color: '#111827',
  },
  timelineRole: {
    fontSize: 14,
    color: '#6b7280',
  },
  timelineApprover: {
    alignItems: 'flex-end',
  },
  timelineApproverName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  currentBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563eb',
  },
  waitingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  waitingText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});

