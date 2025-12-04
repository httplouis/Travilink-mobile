import { supabase } from './supabase/client';

interface CreateNotificationParams {
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  relatedType?: string | null;
  relatedId?: string | null;
  actionUrl?: string | null;
  actionLabel?: string | null;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Creates a notification for a user
 * @returns true if notification was created successfully, false otherwise
 */
export async function createNotification({
  userId,
  notificationType,
  title,
  message,
  relatedType = null,
  relatedId = null,
  actionUrl = null,
  actionLabel = null,
  priority = 'normal',
}: CreateNotificationParams): Promise<boolean> {
  try {
    // Use database function to bypass RLS - allows authenticated users to create notifications
    const { data, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_notification_type: notificationType,
      p_title: title,
      p_message: message,
      p_related_type: relatedType,
      p_related_id: relatedId,
      p_action_url: actionUrl,
      p_action_label: actionLabel,
      p_priority: priority,
    });

    if (error) {
      console.error('[Notifications] RPC call failed:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        userId,
        notificationType,
      });
      
      // If RPC fails, try direct insert as fallback (might work if RLS allows)
      const { error: insertError } = await supabase.from('notifications').insert({
        user_id: userId,
        notification_type: notificationType,
        title,
        message,
        related_type: relatedType,
        related_id: relatedId,
        action_url: actionUrl,
        action_label: actionLabel,
        priority,
      });

      if (insertError) {
        console.error('[Notifications] Direct insert also failed:', {
          code: insertError.code,
          message: insertError.message?.substring(0, 200),
          details: insertError.details,
          hint: insertError.hint,
          userId,
        });
        return false;
      } else {
        console.log('[Notifications] Notification created via direct insert (fallback)');
        return true;
      }
    } else {
      console.log('[Notifications] Notification created successfully via RPC:', data);
      return true;
    }
  } catch (err: any) {
    console.error('[Notifications] Exception creating notification:', {
      message: err?.message,
      stack: err?.stack?.substring(0, 200),
      userId,
    });
    return false;
  }
}

/**
 * Creates notification for requester when request is approved/rejected/returned
 */
export async function notifyRequester(
  requesterId: string,
  requestId: string,
  requestNumber: string,
  action: 'approved' | 'rejected' | 'returned',
  approverName: string,
  approverRole: string
): Promise<void> {
  const roleLabels: Record<string, string> = {
    head: 'Department Head',
    parent_head: 'Parent Head',
    admin: 'Administrator',
    comptroller: 'Comptroller',
    hr: 'HR',
    vp: 'VP',
    president: 'President',
  };

  const roleLabel = roleLabels[approverRole] || approverRole;

  let title: string;
  let message: string;
  let notificationType: string;

  if (action === 'approved') {
    title = 'Request Approved';
    message = `Your request ${requestNumber} has been approved by ${approverName} (${roleLabel}).`;
    notificationType = 'request_approved';
  } else if (action === 'rejected') {
    title = 'Request Rejected';
    message = `Your request ${requestNumber} has been rejected by ${approverName} (${roleLabel}).`;
    notificationType = 'request_rejected';
  } else {
    title = 'Request Returned';
    message = `Your request ${requestNumber} has been returned by ${approverName} (${roleLabel}) for revision.`;
    notificationType = 'request_returned';
  }

  await createNotification({
    userId: requesterId,
    notificationType,
    title,
    message,
    relatedType: 'request',
    relatedId: requestId,
    actionUrl: `/request/${requestId}`,
    priority: action === 'rejected' ? 'high' : 'normal',
  });
}

/**
 * Creates notification for next approver when request moves to their stage
 * @returns true if notification was created successfully, false otherwise
 */
export async function notifyNextApprover(
  approverId: string,
  requestId: string,
  requestNumber: string,
  requesterName: string,
  role: string
): Promise<boolean> {
  const roleLabels: Record<string, string> = {
    comptroller: 'Comptroller',
    hr: 'HR',
    vp: 'VP',
    president: 'President',
    admin: 'Administrator',
    head: 'Department Head',
  };

  const roleLabel = roleLabels[role] || role;

  return await createNotification({
    userId: approverId,
    notificationType: 'request_pending_review',
    title: 'New Request for Review',
    message: `Request ${requestNumber} from ${requesterName} is pending your ${roleLabel} review.`,
    relatedType: 'request',
    relatedId: requestId,
    actionUrl: `/review/${requestId}?role=${role}`,
    priority: 'high',
  });
}

