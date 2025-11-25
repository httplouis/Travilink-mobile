import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

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

      // Approve budget and move to next stage
      const updateData: any = {
        comptroller_approved_at: now,
        comptroller_approved_by: profile.id,
        comptroller_comments: comments || null,
        comptroller_signature: signature,
        comptroller_signed_at: new Date().toISOString(),
        status: 'pending_hr', // Move to HR stage by default
      };

      // Add next approver info if provided
      if (nextApproverId) {
        updateData.next_approver_id = nextApproverId;
      }
      if (nextApproverRole) {
        updateData.next_approver_role = nextApproverRole;
      }

      const { error: updateError } = await supabase
        .from('requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Invalidate queries to refresh
      await queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
      await queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
      await queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
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
          returned_to_requester_at: now,
          returned_by: profile.id,
          return_reason: reason,
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking'] });

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

