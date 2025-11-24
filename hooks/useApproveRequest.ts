import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { RequestStatus } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';

type ApprovalRole = 'head' | 'vp' | 'president' | 'hr' | 'comptroller';

interface ApproveRequestParams {
  requestId: string;
  role: ApprovalRole;
  action: 'approve' | 'reject';
  signature: string;
  comments?: string;
  rejectionReason?: string;
  nextApproverId?: string | null;
  nextApproverRole?: string;
  returnReason?: string;
}

export function useApproveRequest() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const approveRequest = async ({
    requestId,
    role,
    action,
    signature,
    comments,
    rejectionReason,
  }: ApproveRequestParams) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile to get user ID
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      const userId = profile.id;
      const now = new Date().toISOString();

      if (action === 'approve') {
        // Update approval fields based on role
        const updateData: any = {};

        if (role === 'head') {
          updateData.head_approved_at = now;
          updateData.head_approved_by = userId;
          updateData.head_signature = signature;
          if (comments) updateData.head_comments = comments;
          if (nextApproverId) updateData.next_approver_id = nextApproverId;
          if (nextApproverRole) updateData.next_approver_role = nextApproverRole;
        } else if (role === 'comptroller') {
          updateData.comptroller_approved_at = now;
          updateData.comptroller_approved_by = userId;
          updateData.comptroller_signature = signature;
          if (comments) updateData.comptroller_comments = comments;
        } else if (role === 'vp') {
          updateData.vp_approved_at = now;
          updateData.vp_approved_by = userId;
          updateData.vp_signature = signature;
          if (comments) updateData.vp_comments = comments;
        } else if (role === 'president') {
          updateData.president_approved_at = now;
          updateData.president_approved_by = userId;
          updateData.president_signature = signature;
          if (comments) updateData.president_comments = comments;
        } else if (role === 'hr') {
          updateData.hr_approved_at = now;
          updateData.hr_approved_by = userId;
          updateData.hr_signature = signature;
          if (comments) updateData.hr_comments = comments;
        }

        // Get current request to determine next status
        const { data: currentRequest } = await supabase
          .from('requests')
          .select('status, total_budget, requester_is_head, department_id, parent_department_id')
          .eq('id', requestId)
          .single();

        if (!currentRequest) {
          throw new Error('Request not found');
        }

        // Determine next status based on current status and role
        // Match web version workflow logic with 15k threshold for faculty
        let nextStatus: RequestStatus = currentRequest.status;

        if (role === 'comptroller' && currentRequest.status === 'pending_comptroller') {
          // After comptroller approval, go to HR
          nextStatus = 'pending_hr';
        } else if (role === 'head' && currentRequest.status === 'pending_head') {
          // Check if department has parent - if yes, go to parent_head, else admin
          if (currentRequest.parent_department_id) {
            nextStatus = 'pending_parent_head';
          } else {
            nextStatus = 'pending_admin';
          }
        } else if (role === 'head' && currentRequest.status === 'pending_parent_head') {
          // Parent head approval goes to admin
          nextStatus = 'pending_admin';
        } else if (role === 'vp' && currentRequest.status === 'pending_vp') {
          // Updated threshold: Faculty with budget > 15k OR heads always go to President
          const isFaculty = !currentRequest.requester_is_head;
          const budget = currentRequest.total_budget || 0;
          
          if (currentRequest.requester_is_head) {
            // Heads always go to President
            nextStatus = 'pending_president';
          } else if (isFaculty && budget > 15000) {
            // Faculty with budget > 15k go to President
            nextStatus = 'pending_president';
          } else {
            // Faculty with budget <= 15k: VP approval is sufficient
            nextStatus = 'approved';
          }
        } else if (role === 'president' && currentRequest.status === 'pending_president') {
          nextStatus = 'approved';
        } else if (role === 'hr' && currentRequest.status === 'pending_hr') {
          // HR approval goes to VP
          nextStatus = 'pending_vp';
        }

        updateData.status = nextStatus;

        const { error: updateError } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Invalidate all relevant queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['vp-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['president-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
        queryClient.invalidateQueries({ queryKey: ['request-review'] });

        Alert.alert('Success', 'Request approved successfully');
      } else {
        // Reject request
        const updateData: any = {
          status: 'rejected' as RequestStatus,
          rejected_at: now,
          rejected_by: userId,
          rejection_reason: rejectionReason || 'No reason provided',
          rejection_stage: role,
        };

        const { error: updateError } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Invalidate all relevant queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['vp-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['president-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
        queryClient.invalidateQueries({ queryKey: ['request-review'] });

        Alert.alert('Success', 'Request rejected');
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.message || 'Failed to process request');
      Alert.alert('Error', err.message || 'Failed to process request');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    approveRequest,
    isSubmitting,
    error,
  };
}

