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
        const category = item.category?.toLowerCase() || '';
        if (editedBudget[category] !== undefined) {
          return {
            ...item,
            amount: editedBudget[category] || 0,
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

  const approveBudget = async ({ requestId, signature, comments, editedBudget }: ApproveBudgetParams) => {
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
            const category = item.category?.toLowerCase() || '';
            if (editedBudget[category] !== undefined) {
              return {
                ...item,
                amount: editedBudget[category] || 0,
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
      const { error: updateError } = await supabase
        .from('requests')
        .update({
          comptroller_approved_at: now,
          comptroller_approved_by: profile.id,
          comptroller_comments: comments || null,
          status: 'pending_hr', // Move to HR stage
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Invalidate queries to refresh
      queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
      queryClient.invalidateQueries({ queryKey: ['request-tracking'] });

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

  return {
    updateBudget,
    approveBudget,
    isSubmitting,
    error,
  };
}

