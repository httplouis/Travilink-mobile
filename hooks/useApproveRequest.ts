import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase/client';
import { RequestStatus } from '@/lib/types';
import { useQueryClient } from '@tanstack/react-query';
import { notifyRequester, notifyNextApprover } from '@/lib/notifications';

type ApprovalRole = 'head' | 'vp' | 'president' | 'hr' | 'comptroller';

interface ApproveRequestParams {
  requestId: string;
  role: ApprovalRole;
  action: 'approve' | 'reject' | 'return';
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
    nextApproverId,
    nextApproverRole,
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
        // Get current request first to preserve workflow_metadata and determine next status
        const { data: currentRequest } = await supabase
          .from('requests')
          .select('status, total_budget, requester_is_head, department_id, parent_department_id, workflow_metadata, requester_id, request_number, has_budget, requester_name')
          .eq('id', requestId)
          .single();

        if (!currentRequest) {
          throw new Error('Request not found');
        }

        // Get approver's name for notifications
        const { data: approverProfile } = await supabase
          .from('users')
          .select('name')
          .eq('id', userId)
          .single();
        
        const approverName = approverProfile?.name || 'Approver';

        // Update approval fields based on role
        const updateData: any = {};

        if (role === 'head') {
          updateData.head_approved_at = now;
          updateData.head_approved_by = userId;
          updateData.head_signature = signature;
          if (comments) updateData.head_comments = comments;
          // Store next approver info in workflow_metadata if provided
          if (nextApproverId || nextApproverRole) {
            updateData.workflow_metadata = {
              ...(currentRequest.workflow_metadata || {}),
              next_approver_id: nextApproverId,
              next_approver_role: nextApproverRole,
            };
          }
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
          if (comments)           updateData.hr_comments = comments;
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
            // After head approval, check if it has budget - if yes, skip admin and go directly to comptroller
            // Admin processing is automatic, so we can skip it if there's a budget
            if (currentRequest.has_budget) {
              nextStatus = 'pending_comptroller';
            } else {
              nextStatus = 'pending_admin';
            }
          }
        } else if (role === 'head' && currentRequest.status === 'pending_parent_head') {
          // Parent head approval - check if it has budget
          if (currentRequest.has_budget) {
            nextStatus = 'pending_comptroller';
          } else {
            nextStatus = 'pending_admin';
          }
        } else if (role === 'admin' && currentRequest.status === 'pending_admin') {
          // Admin processing - if has budget, go to comptroller, else HR
          if (currentRequest.has_budget) {
            nextStatus = 'pending_comptroller';
          } else {
            nextStatus = 'pending_hr';
          }
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

        // Create notifications
        try {
          // Notify requester
          if (currentRequest.requester_id) {
            await notifyRequester(
              currentRequest.requester_id,
              requestId,
              currentRequest.request_number || 'DRAFT',
              'approved',
              approverName,
              role
            );
          }

          // Notify next approver based on workflow
          if (nextStatus === 'pending_comptroller' && currentRequest.has_budget) {
            // Find ALL comptroller users and notify each one
            const { data: comptrollerUsers, error: comptrollerError } = await supabase
              .from('users')
              .select('id, name')
              .eq('is_comptroller', true)
              .eq('is_active', true);
            
            if (comptrollerError) {
              console.error('[useApproveRequest] Error fetching comptrollers:', comptrollerError);
            } else if (comptrollerUsers && comptrollerUsers.length > 0) {
              // Notify all comptrollers
              const notificationPromises = comptrollerUsers.map(comptroller =>
                notifyNextApprover(
                  comptroller.id,
                  requestId,
                  currentRequest.request_number || 'DRAFT',
                  currentRequest.requester_name || 'Requester',
                  'comptroller'
                ).catch(err => {
                  console.error(`[useApproveRequest] Failed to notify comptroller ${comptroller.id}:`, err);
                  return null;
                })
              );
              
              await Promise.all(notificationPromises);
              console.log(`[useApproveRequest] Notified ${comptrollerUsers.length} comptroller(s) for request ${currentRequest.request_number}`);
            } else {
              console.warn('[useApproveRequest] No active comptroller users found to notify');
            }
          } else if (nextStatus === 'pending_admin') {
            // Admin processing - no notification needed as it's automatic
            // But if it has budget, it will go to comptroller after admin
            // Actually wait, if has_budget, we skip admin now, so this won't happen
          } else if (nextStatus === 'pending_hr') {
            // Find HR users
            const { data: hrUsers } = await supabase
              .from('users')
              .select('id')
              .eq('is_hr', true)
              .limit(1);
            
            if (hrUsers && hrUsers.length > 0) {
              await notifyNextApprover(
                hrUsers[0].id,
                requestId,
                currentRequest.request_number || 'DRAFT',
                currentRequest.requester_name || 'Requester',
                'hr'
              );
            }
          } else if (nextStatus === 'pending_vp') {
            // Find VP users
            const { data: vpUsers } = await supabase
              .from('users')
              .select('id')
              .eq('is_vp', true)
              .limit(1);
            
            if (vpUsers && vpUsers.length > 0) {
              await notifyNextApprover(
                vpUsers[0].id,
                requestId,
                currentRequest.request_number || 'DRAFT',
                currentRequest.requester_name || 'Requester',
                'vp'
              );
            }
          } else if (nextStatus === 'pending_president') {
            // Find President users
            const { data: presidentUsers } = await supabase
              .from('users')
              .select('id')
              .eq('is_president', true)
              .limit(1);
            
            if (presidentUsers && presidentUsers.length > 0) {
              await notifyNextApprover(
                presidentUsers[0].id,
                requestId,
                currentRequest.request_number || 'DRAFT',
                currentRequest.requester_name || 'Requester',
                'president'
              );
            }
          } else if (nextStatus === 'approved') {
            // Fully approved - notify requester again with final approval message
            if (currentRequest.requester_id) {
              await notifyRequester(
                currentRequest.requester_id,
                requestId,
                currentRequest.request_number || 'DRAFT',
                'approved',
                approverName,
                role
              );
            }
          }
        } catch (notifError) {
          console.error('Error creating notifications:', notifError);
          // Don't fail the approval if notifications fail
        }

        // Invalidate all relevant queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['vp-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['president-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
        queryClient.invalidateQueries({ queryKey: ['request-review'] });
        // Invalidate notifications for all users - use prefix matching to catch all user-specific queries
        queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false });

        // Don't show alert here - let the caller handle it
      } else if (action === 'reject') {
        // Get request info for notifications
        const { data: requestInfo } = await supabase
          .from('requests')
          .select('requester_id, request_number, requester_name')
          .eq('id', requestId)
          .single();

        // Get approver's name for notifications
        const { data: approverProfile } = await supabase
          .from('users')
          .select('name')
          .eq('id', userId)
          .single();
        
        const approverName = approverProfile?.name || 'Approver';

        // Reject request - add signature based on role
        const updateData: any = {
          status: 'rejected' as RequestStatus,
          rejected_at: now,
          rejected_by: userId,
          rejection_reason: rejectionReason || 'No reason provided',
          rejection_stage: role,
        };

        // Add role-specific signature fields
        if (role === 'head') {
          updateData.head_signature = signature;
        } else if (role === 'vp') {
          updateData.vp_signature = signature;
        } else if (role === 'president') {
          updateData.president_signature = signature;
        } else if (role === 'hr') {
          updateData.hr_signature = signature;
        } else if (role === 'comptroller') {
          updateData.comptroller_signature = signature;
        }

        const { error: updateError } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Notify requester
        try {
          if (requestInfo?.requester_id) {
            await notifyRequester(
              requestInfo.requester_id,
              requestId,
              requestInfo.request_number || 'DRAFT',
              'rejected',
              approverName,
              role
            );
          }
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }

        // Invalidate all relevant queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['vp-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['president-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
        queryClient.invalidateQueries({ queryKey: ['request-review'] });
        // Invalidate notifications for all users - use prefix matching to catch all user-specific queries
        queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false });

        // Don't show alert here - let the caller handle it
      } else if (action === 'return') {
        // Get request info for notifications
        const { data: requestInfo } = await supabase
          .from('requests')
          .select('requester_id, request_number, requester_name')
          .eq('id', requestId)
          .single();

        // Get approver's name for notifications
        const { data: approverProfile } = await supabase
          .from('users')
          .select('name')
          .eq('id', userId)
          .single();
        
        const approverName = approverProfile?.name || 'Approver';

        // Return to sender
        const updateData: any = {
          status: 'returned' as RequestStatus,
        };
        
        // Add role-specific return fields
        if (role === 'head') {
          updateData.head_comments = returnReason || comments || null;
        } else if (role === 'admin') {
          updateData.admin_comments = returnReason || comments || null;
        } else if (role === 'comptroller') {
          updateData.comptroller_rejection_reason = returnReason || comments || null;
          updateData.comptroller_comments = returnReason || comments || null;
        } else if (role === 'hr') {
          updateData.hr_comments = returnReason || comments || null;
        } else if (role === 'vp') {
          updateData.vp_comments = returnReason || comments || null;
        } else if (role === 'president') {
          updateData.president_comments = returnReason || comments || null;
        }

        const { error: updateError } = await supabase
          .from('requests')
          .update(updateData)
          .eq('id', requestId);

        if (updateError) throw updateError;

        // Notify requester
        try {
          if (requestInfo?.requester_id) {
            await notifyRequester(
              requestInfo.requester_id,
              requestId,
              requestInfo.request_number || 'DRAFT',
              'returned',
              approverName,
              role
            );
          }
        } catch (notifError) {
          console.error('Error creating notification:', notifError);
        }

        // Invalidate all relevant queries to refresh the list
        queryClient.invalidateQueries({ queryKey: ['head-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['vp-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['president-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['hr-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['comptroller-inbox'] });
        queryClient.invalidateQueries({ queryKey: ['request-tracking'] });
        queryClient.invalidateQueries({ queryKey: ['request-review'] });
        // Invalidate notifications for all users - use prefix matching to catch all user-specific queries
        queryClient.invalidateQueries({ queryKey: ['notifications'], exact: false });

        // Don't show alert here - let the caller handle it
      }

      return { success: true };
    } catch (err: any) {
      console.error('Error approving request:', err);
      setError(err.message || 'Failed to process request');
      // Don't show alert here - let the caller handle it
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

