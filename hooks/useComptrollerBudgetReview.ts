import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { notifyRequester, notifyNextApprover } from '@/lib/notifications';

interface UpdateBudgetParams {
  requestId: string;
  editedBudget: Record<string, number | null>;
  comments?: string;
}

interface ApproveBudgetParams {
  requestId: string;
  signature: string;
  comments?: string;
  editedBudget?: Record<string, number | null>;
  nextApproverId?: string | null;
  nextApproverRole?: string;
}

interface ReturnToSenderParams {
  requestId: string;
  reason: string;
  signature?: string;
}

export function useComptrollerBudgetReview() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const updateBudget = async ({ requestId, editedBudget, comments }: UpdateBudgetParams) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      // Get current request to calculate new total
      const { data: currentRequest } = await supabase
        .from('requests')
        .select('expense_breakdown, total_budget')
        .eq('id', requestId)
        .single();

      if (!currentRequest) {
        throw new Error('Request not found');
      }

      // Calculate new expense breakdown with edits
      const expenseBreakdown = currentRequest.expense_breakdown || [];
      const updatedBreakdown = expenseBreakdown.map((item: any) => {
        const itemKey = item.item?.toLowerCase() || '';
        if (editedBudget[itemKey] !== undefined) {
          return {
            ...item,
            amount: editedBudget[itemKey] || 0,
          };
        }
        return item;
      });

      // Calculate new total
      const newTotal = updatedBreakdown.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

      // Update request with edited budget
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          comptroller_edited_budget: newTotal,
          comptroller_comments: comments || null,
          expense_breakdown: updatedBreakdown,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking'] });

      return { success: true };
    } catch (err: any) {
      console.error('Error updating budget:', err);
      setError(err.message || 'Failed to update budget');
      Alert.alert('Error', err.message || 'Failed to update budget');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const approveBudget = async ({ requestId, signature, comments, editedBudget, nextApproverId, nextApproverRole }: ApproveBudgetParams) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      const now = new Date().toISOString();

      // If budget was edited, update expense breakdown first
      if (editedBudget && Object.keys(editedBudget).length > 0) {
        const { data: currentRequest } = await supabase
          .from('requests')
          .select('expense_breakdown')
          .eq('id', requestId)
          .single();

        if (currentRequest) {
          const expenseBreakdown = currentRequest.expense_breakdown || [];
          const updatedBreakdown = expenseBreakdown.map((item: any) => {
            const itemKey = item.item?.toLowerCase() || '';
            if (editedBudget[itemKey] !== undefined) {
              return {
                ...item,
                amount: editedBudget[itemKey] || 0,
              };
            }
            return item;
          });

          const newTotal = updatedBreakdown.reduce((sum: number, item: any) => sum + (item.amount || 0), 0);

          await supabase
            .from('requests')
            .update({
              expense_breakdown: updatedBreakdown,
              comptroller_edited_budget: newTotal,
            })
            .eq('id', requestId);
        }
      }

      // Get current request to preserve workflow_metadata
      const { data: currentRequest } = await supabase
        .from('requests')
        .select('workflow_metadata')
        .eq('id', requestId)
        .single();

      // Approve budget and move to next stage
      const updateData: any = {
        comptroller_approved_at: now,
        comptroller_approved_by: profile.id,
        comptroller_comments: comments || null,
        comptroller_signature: signature,
        comptroller_signed_at: new Date().toISOString(),
        status: 'pending_hr', // Move to HR stage by default
      };

      // Store next approver info in workflow_metadata if provided
      if (nextApproverId || nextApproverRole) {
        updateData.workflow_metadata = {
          ...(currentRequest?.workflow_metadata || {}),
          next_approver_id: nextApproverId,
          next_approver_role: nextApproverRole,
        };
      }

      const { error: updateError } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Get request info and approver name for notifications
      const { data: requestInfo } = await supabase
        .from('requests')
        .select('requester_id, request_number, requester_name')
        .eq('id', requestId)
        .single();

      const { data: approverProfile } = await supabase
        .from('users')
        .select('name')
        .eq('id', profile.id)
        .single();
      
      const approverName = approverProfile?.name || 'Comptroller';

      // Create notifications
      try {
        // Notify requester that comptroller approved
        if (requestInfo?.requester_id) {
          await notifyRequester(
            requestInfo.requester_id,
            requestId,
            requestInfo.request_number || 'DRAFT',
            'approved',
            approverName,
            'comptroller'
          ).catch(err => {
            console.error('[useComptrollerBudgetReview] Failed to notify requester:', err);
          });
          console.log(`[useComptrollerBudgetReview] Notified requester ${requestInfo.requester_id} of comptroller approval`);
        }

        // Notify HR (next approver)
        const { data: hrUsers, error: hrError } = await supabase
          .from('users')
          .select('id, name')
          .eq('is_hr', true)
          .eq('is_active', true);
        
        if (hrError) {
          console.error('[useComptrollerBudgetReview] Error fetching HR users:', hrError);
        } else if (hrUsers && hrUsers.length > 0) {
          // Notify all HR users
          const hrNotificationPromises = hrUsers.map(hr =>
            notifyNextApprover(
              hr.id,
              requestId,
              requestInfo?.request_number || 'DRAFT',
              requestInfo?.requester_name || 'Requester',
              'hr'
            ).catch(err => {
              console.error(`[useComptrollerBudgetReview] Failed to notify HR ${hr.id}:`, err);
              return null;
            })
          );
          
          await Promise.all(hrNotificationPromises);
          console.log(`[useComptrollerBudgetReview] Notified ${hrUsers.length} HR user(s) for request ${requestInfo?.request_number}`);
        } else {
          console.warn('[useComptrollerBudgetReview] No active HR users found to notify');
        }
      } catch (notifError) {
        console.error('[useComptrollerBudgetReview] Error creating notifications:', notifError);
      }

      // Invalidate queries to refresh
      await queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
      await queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
      await queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
      // Invalidate notifications for all users - use prefix matching to catch all user-specific queries
      await queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false });
      // Force refetch HR inbox immediately
      await queryClient.refetchQueries({ queryKey: ['hr-inbox'] });

      return { success: true };
    } catch (err: any) {
      console.error('Error approving budget:', err);
      setError(err.message || 'Failed to approve budget');
      Alert.alert('Error', err.message || 'Failed to approve budget');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  const returnToSender = async ({ requestId, reason, signature }: ReturnToSenderParams) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) {
        throw new Error('User profile not found');
      }

      const now = new Date().toISOString();

      // Return to sender (set back to draft so requester can edit and resubmit)
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          status: 'draft',
          comptroller_rejected_at: now,
          comptroller_rejected_by: profile.id,
          comptroller_rejection_reason: reason,
          comptroller_comments: reason,
          comptroller_signature: signature || null,
          comptroller_signed_at: signature ? new Date().toISOString() : null,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Get request info and approver name for notifications
      const { data: requestInfo } = await supabase
        .from('requests')
        .select('requester_id, request_number, requester_name')
        .eq('id', requestId)
        .single();

      const { data: approverProfile } = await supabase
        .from('users')
        .select('name')
        .eq('id', profile.id)
        .single();
      
      const approverName = approverProfile?.name || 'Comptroller';

      // Notify requester
      try {
        if (requestInfo?.requester_id) {
          await notifyRequester(
            requestInfo.requester_id,
            requestId,
            requestInfo.request_number || 'DRAFT',
            'returned',
            approverName,
            'comptroller'
          );
        }
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      return { success: true };
    } catch (err: any) {
      console.error('Error rejecting budget:', err);
      setError(err.message || 'Failed to reject budget');
      Alert.alert('Error', err.message || 'Failed to reject budget');
      return { success: false, error: err.message };
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    updateBudget,
    approveBudget,
    returnToSender,
    isSubmitting,
    error,
  };
}

