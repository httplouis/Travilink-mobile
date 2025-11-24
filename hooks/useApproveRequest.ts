import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { RequestStatus } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';

type ApprovalRole = 'head' | 'vp' | 'president' | 'hr';

interface ApproveRequestParams {
  requestId: string;
  role: ApprovalRole;
  action: 'approve' | 'reject';
  signature: string;
  comments?: string;
  rejectionReason?: string;
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
          .select('status, total_budget')
          .eq('id', requestId)
          .single();

        if (!currentRequest) {
          throw new Error('Request not found');
        }

        // Determine next status based on current status and role
        // Match web version workflow logic
        let nextStatus: RequestStatus = currentRequest.status;

        if (role === 'head' && currentRequest.status === 'pending_head') {
          // Check if department has parent - if yes, go to parent_head, else admin
          // For now, default to admin (parent_head logic can be added if needed)
          nextStatus = 'pending_admin';
        } else if (role === 'vp' && currentRequest.status === 'pending_vp') {
          // Check if budget > 50,000, then forward to president
          if ((currentRequest.total_budget || 0) > 50000) {
            nextStatus = 'pending_president';
          } else {
            nextStatus = 'approved';
          }
        } else if (role === 'president' && currentRequest.status === 'pending_president') {
          nextStatus = 'approved';
        } else if (role === 'hr' && currentRequest.status === 'pending_hr') {
          // HR approval goes to VP (or exec in some cases, but VP is more common)
          nextStatus = 'pending_vp';
        }

        updateData.status = nextStatus;

        const { error: updateError } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Invalidate inbox queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['vp-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['president-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking'] });

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

        // Invalidate inbox queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['vp-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['president-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking'] });

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

