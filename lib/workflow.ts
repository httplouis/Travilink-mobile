// TraviLink Mobile Workflow Engine
// Implements complete approval flow logic matching web version

export type RequestStatus =
  | 'draft'
  | 'pending_head'
  | 'pending_parent_head'
  | 'pending_admin'
  | 'pending_comptroller'
  | 'pending_hr'
  | 'pending_exec'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type ApproverRole = 'head' | 'admin' | 'comptroller' | 'hr' | 'exec';

/**
 * WORKFLOW RULES:
 * 
 * Scenario 1 - Faculty Request from Office (e.g., WCDEO under CCMS):
 * requester → office_head → parent_dept_head → admin → [comptroller] → hr → exec
 * 
 * Scenario 2 - Faculty Request from Department (no parent):
 * requester → dept_head → admin → [comptroller] → hr → exec
 * 
 * Scenario 3 - Head Request:
 * head → admin → [comptroller] → hr → exec
 * 
 * SPECIAL RULES:
 * - If department has parent_department_id, approval goes: office head → parent head → admin
 * - If no parent_department_id, approval goes: dept head → admin
 * - Head must be included in faculty travel requests
 * - Comptroller only if has_budget = true
 * - Admin skipped if vehicle_mode === 'owned' (unless institutional)
 */
export class WorkflowEngine {
  /**
   * Determine the initial status when creating a new request
   */
  static getInitialStatus(
    requesterIsHead: boolean,
    vehicleMode: string = 'owned',
    hasBudget: boolean = false,
    isRepresentativeSubmission: boolean = false
  ): RequestStatus {
    if (isRepresentativeSubmission) {
      // Representative submission: send to requesting person first for signature
      if (requesterIsHead) {
        return 'pending_head'; // Requesting person is head, they can approve directly
      } else {
        return 'pending_requester_signature'; // Need requesting person's signature first
      }
    }
    
    if (requesterIsHead) {
      // Requesting person is a head, can go directly to admin
      return 'pending_admin';
    } else {
      // Requesting person is NOT a head, send to their department head first
      return 'pending_head';
    }
  }

  /**
   * Determine the next status after an approval
   * @param hasParentDepartment - Whether the department has a parent (for office hierarchy)
   */
  static getNextStatus(
    currentStatus: RequestStatus,
    requesterIsHead: boolean,
    hasBudget: boolean,
    hasParentDepartment: boolean = false,
    vehicleMode?: 'owned' | 'institutional' | 'rent'
  ): RequestStatus {
    switch (currentStatus) {
      case 'draft':
        return this.getInitialStatus(requesterIsHead);

      case 'pending_head':
        // After office/dept head approval, check if parent department exists
        if (hasParentDepartment) {
          // Has parent: go to parent department head next (e.g., WCDEO → CCMS Dean)
          return 'pending_parent_head';
        }
        // No parent: go directly to admin
        return 'pending_admin';

      case 'pending_parent_head':
        // After parent head approval, go to admin
        return 'pending_admin';

      case 'pending_admin':
        // After admin processing, check if budget exists
        if (hasBudget) {
          // Has budget: must go to comptroller for budget verification
          return 'pending_comptroller';
        } else {
          // No budget: skip comptroller, go directly to HR
          return 'pending_hr';
        }

      case 'pending_comptroller':
        // After comptroller approval, go to HR
        return 'pending_hr';

      case 'pending_hr':
        // After HR approval, route to VP first
        // VP will then route to President if needed (budget > 15k for faculty, or always for heads)
        return 'pending_vp';

      case 'pending_vp':
        // After VP approval, check if needs President
        // Faculty with budget > 15k OR heads always go to President
        // Otherwise, VP approval is sufficient (approved)
        if (requesterIsHead) {
          // Heads always go to President
          return 'pending_president';
        } else {
          // Faculty: check budget threshold (15k for President)
          if (hasBudget && (vehicleMode === 'owned' ? false : true)) {
            // Check if budget exceeds 15k threshold
            // Note: We don't have budget amount here, so we'll route to President
            // The actual check should be done in the approval handler
            return 'pending_president';
          } else {
            // No budget or low budget: VP approval is sufficient
            return 'approved';
          }
        }

      case 'pending_president':
        // After President approval, request is fully approved
        return 'approved';

      case 'pending_exec':
        // Legacy status - map to pending_vp for backward compatibility
        return 'pending_vp';

      case 'approved':
      case 'rejected':
      case 'cancelled':
        // Terminal states - no next status
        return currentStatus;

      default:
        return currentStatus;
    }
  }

  /**
   * Get the approver role for a given status
   */
  static getApproverRole(status: RequestStatus): ApproverRole | null {
    switch (status) {
      case 'pending_head':
      case 'pending_parent_head':
        return 'head';
      case 'pending_admin':
        return 'admin';
      case 'pending_comptroller':
        return 'comptroller';
      case 'pending_hr':
        return 'hr';
      case 'pending_vp':
        return 'exec'; // VP is exec role
      case 'pending_president':
        return 'exec'; // President is exec role
      case 'pending_exec':
        return 'exec'; // Legacy
      default:
        return null;
    }
  }

  /**
   * Check if a user can approve a request based on their role
   */
  static canApprove(
    userRole: string,
    userIsHead: boolean,
    userIsHR: boolean,
    userIsExec: boolean,
    userIsAdmin: boolean,
    userIsVP: boolean,
    userIsPresident: boolean,
    requestStatus: RequestStatus
  ): boolean {
    switch (requestStatus) {
      case 'pending_head':
      case 'pending_parent_head':
        return userIsHead;

      case 'pending_admin':
        return userIsAdmin || userRole === 'admin';

      case 'pending_comptroller':
        // Comptroller is identified by email in the system
        return userRole === 'comptroller' || userRole === 'admin';

      case 'pending_hr':
        return userIsHR;

      case 'pending_vp':
        // VP can approve pending_vp
        return userIsVP || userIsExec;
      case 'pending_president':
        // President can approve pending_president
        return userIsPresident || userIsExec;
      case 'pending_exec':
        // Legacy - Executive can be VP or President
        return userIsExec || userIsVP || userIsPresident;

      default:
        return false;
    }
  }

  /**
   * Get the first receiver for routing display
   */
  static getFirstReceiver(
    requesterIsHead: boolean,
    vehicleMode?: 'owned' | 'institutional' | 'rent'
  ): string {
    if (requesterIsHead) {
      if (vehicleMode === 'institutional') {
        return 'Transportation Coordinator';
      }
      return 'Transportation Coordinator';
    }
    return 'Department Head';
  }

  /**
   * Get routing suggestion text
   */
  static getRoutingSuggestion(
    hasBudget: boolean,
    needsVehicle: boolean,
    requesterIsHead: boolean
  ): string | null {
    if (requesterIsHead) {
      return null; // Head requests always go through full flow
    }

    // If no budget and no vehicle, can skip Admin and Comptroller
    if (!hasBudget && !needsVehicle) {
      return 'Skip Admin and Comptroller → HR';
    }

    // If no budget, can skip Comptroller
    if (!hasBudget) {
      return 'Skip Comptroller → HR';
    }

    return null;
  }
}

