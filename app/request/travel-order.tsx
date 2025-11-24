import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  KeyboardAvoidingView,
  TextInput as RNTextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { supabase } from '@/lib/supabase/client';
import NavigationHeader from '@/components/NavigationHeader';
import CustomTabBar from '@/components/CustomTabBar';
import DateInput from '@/components/DateInput';
import UserSearchableSelect from '@/components/UserSearchableSelect';
import DepartmentSelect from '@/components/DepartmentSelect';
import LocationField from '@/components/LocationField';
import CostsSection from '@/components/CostsSection';
import SignaturePad from '@/components/SignaturePad';
import ParticipantInvitationEditor from '@/components/ParticipantInvitationEditor';
import SidebarMenu from '@/components/SidebarMenu';
import { useVehicles } from '@/hooks/useVehicles';
import { useDrivers } from '@/hooks/useDrivers';
import VehicleDriverSelection from '@/components/VehicleDriverSelection';

// Types matching web exactly
interface TravelCosts {
  food?: number | null;
  foodDescription?: string;
  driversAllowance?: number | null;
  driversAllowanceDescription?: string;
  rentVehicles?: number | null;
  rentVehiclesDescription?: string;
  hiredDrivers?: number | null;
  hiredDriversDescription?: string;
  accommodation?: number | null;
  accommodationDescription?: string;
  otherItems?: Array<{ label: string; amount: number | null; description?: string }>;
  otherLabel?: string;
  otherAmount?: number | null;
  justification?: string;
}

interface TravelOrderData {
  date: string;
  requestingPerson: string;
  department: string;
  destination: string;
  destinationGeo?: { lat: number; lng: number } | null;
  departureDate: string;
  returnDate: string;
  purposeOfTravel: string;
  vehicleMode?: 'owned' | 'institutional' | 'rent';
  preferredVehicleId?: string | null;
  preferredDriverId?: string | null;
  costs: TravelCosts;
  requesterSignature?: string;
  endorsedByHeadName?: string;
  endorsedByHeadDate?: string;
  endorsedByHeadSignature?: string;
}

export default function TravelOrderScreen() {
  const { profile, user } = useAuth();
  const params = useLocalSearchParams();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Fetch vehicles and drivers for institutional mode
  const { vehicles } = useVehicles({ available: true });
  const { drivers } = useDrivers({ available: true });
  
  // Return to sender state
  const [isReturnedRequest, setIsReturnedRequest] = useState(false);
  const [returnReason, setReturnReason] = useState<string | null>(null);
  const [returnComments, setReturnComments] = useState<string | null>(null);
  
  // Requesting person tracking
  const [requestingPersonIsHead, setRequestingPersonIsHead] = useState<boolean | null>(null);
  const [requestingPersonHeadName, setRequestingPersonHeadName] = useState<string>('');
  const [isRepresentativeSubmission, setIsRepresentativeSubmission] = useState(false);
  
  // Participants state
  const [participants, setParticipants] = useState<Array<{ email: string; name?: string; department?: string; status?: 'pending' | 'confirmed' | 'declined'; invitationId?: string }>>([]);
  const [savedRequestId, setSavedRequestId] = useState<string | null>(null);

  // Form data matching web exactly
  const [formData, setFormData] = useState<TravelOrderData>({
    date: new Date().toISOString().split('T')[0],
    requestingPerson: profile?.name || '',
    department: profile?.department ? `${profile.department.name}${profile.department.code ? ` (${profile.department.code})` : ''}` : '',
    destination: __DEV__ ? 'Manila, Philippines' : '',
    destinationGeo: __DEV__ ? { lat: 14.5995, lng: 120.9842 } : null,
    departureDate: __DEV__ ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
    returnDate: __DEV__ ? new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] : '',
    purposeOfTravel: __DEV__ ? 'Attend conference and training workshop' : '',
    vehicleMode: 'owned', // Default to owned
    preferredVehicleId: null,
    preferredDriverId: null,
    costs: __DEV__ ? {
      food: 1500,
      rentVehicles: 2000,
      accommodation: 3000,
    } : {},
    requesterSignature: '',
    endorsedByHeadName: '',
    endorsedByHeadDate: '',
    endorsedByHeadSignature: '',
  });

  // Load existing request if editing (for return to sender)
  useEffect(() => {
    const loadRequest = async () => {
      const requestId = params.id as string | undefined;
      if (!requestId || !profile) return;

      try {
        const { data: request, error } = await supabase
          .from('requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (error) throw error;
        if (!request) return;

        // Check if request was returned to requester
        const wasReturned = request.status === 'returned_to_requester' || 
                           request.returned_to_requester_at !== null;
        
        if (wasReturned) {
          setIsReturnedRequest(true);
          setReturnReason(request.return_reason || null);
          setReturnComments(request.return_comments || null);
        }

        // Load form data from request
        if (request.request_type === 'travel_order') {
          setFormData(prev => ({
            ...prev,
            date: request.created_at ? new Date(request.created_at).toISOString().split('T')[0] : prev.date,
            requestingPerson: request.requester_name || prev.requestingPerson,
            destination: request.destination || prev.destination,
            destinationGeo: request.destination_geo || prev.destinationGeo,
            departureDate: request.travel_start_date ? new Date(request.travel_start_date).toISOString().split('T')[0] : prev.departureDate,
            returnDate: request.travel_end_date ? new Date(request.travel_end_date).toISOString().split('T')[0] : prev.returnDate,
            purposeOfTravel: request.purpose || prev.purposeOfTravel,
            requesterSignature: request.requester_signature || prev.requesterSignature,
            endorsedByHeadName: request.head_approved_by || prev.endorsedByHeadName,
            endorsedByHeadDate: request.head_approved_at ? new Date(request.head_approved_at).toISOString().split('T')[0] : prev.endorsedByHeadDate,
            endorsedByHeadSignature: request.head_signature || prev.endorsedByHeadSignature,
            costs: request.expense_breakdown ? {
              food: request.expense_breakdown.find((e: any) => e.item === 'Food')?.amount || null,
              driversAllowance: request.expense_breakdown.find((e: any) => e.item === "Driver's Allowance")?.amount || null,
              rentVehicles: request.expense_breakdown.find((e: any) => e.item === 'Transportation')?.amount || null,
              accommodation: request.expense_breakdown.find((e: any) => e.item === 'Accommodation')?.amount || null,
              otherItems: request.expense_breakdown.filter((e: any) => !['Food', "Driver's Allowance", 'Transportation', 'Accommodation'].includes(e.item)).map((e: any) => ({
                label: e.item,
                amount: e.amount,
                description: e.description,
              })),
            } : prev.costs,
          }));
        }
      } catch (error) {
        console.error('Error loading request:', error);
      }
    };

    loadRequest();
  }, [params.id, profile]);

  // Pre-fill requesting person with current user on mount
  useEffect(() => {
    if (profile?.name && !formData.requestingPerson) {
      setFormData(prev => ({ ...prev, requestingPerson: profile.name }));
    }
  }, [profile]);

  // Check if requesting person is different from current user (representative submission)
  useEffect(() => {
    if (!formData.requestingPerson || !profile?.name) {
      setIsRepresentativeSubmission(false);
      return;
    }

    const requestingPersonNormalized = formData.requestingPerson.trim().toLowerCase();
    const currentUserNameNormalized = profile.name.trim().toLowerCase();
    const isDifferent = requestingPersonNormalized !== currentUserNameNormalized;
    
    setIsRepresentativeSubmission(isDifferent);
    
    // If different, fetch requesting person's info to determine if head
    if (isDifferent) {
      checkRequestingPerson(formData.requestingPerson, formData.department);
    } else {
      // Same person - use current user's info
      setRequestingPersonIsHead(profile.is_head || false);
      if (profile.department_id) {
        fetchDepartmentHead(profile.department_id);
      }
    }
  }, [formData.requestingPerson, formData.department, profile]);

  const checkRequestingPerson = async (name: string, department: string) => {
    try {
      // Search for user by name
      const { data: users, error } = await supabase
        .from('users')
        .select('id, name, is_head, role, department_id')
        .ilike('name', `%${name}%`)
        .eq('status', 'active')
        .limit(5);

      if (error) throw error;

      // Find exact match
      const exactMatch = users?.find(u => 
        u.name?.toLowerCase().trim() === name.toLowerCase().trim()
      );
      const matchedUser = exactMatch || users?.[0];

      if (matchedUser) {
        const isHead = matchedUser.is_head || matchedUser.role === 'head';
        setRequestingPersonIsHead(isHead);
        
        // Fetch department head for this user's department
        if (matchedUser.department_id) {
          fetchDepartmentHead(matchedUser.department_id);
        }
      } else {
        setRequestingPersonIsHead(null);
        setRequestingPersonHeadName('');
      }
    } catch (error) {
      console.error('Error checking requesting person:', error);
      setRequestingPersonIsHead(null);
    }
  };

  const fetchDepartmentHead = async (departmentId: string) => {
    try {
      const { data: heads, error } = await supabase
        .from('users')
        .select('name')
        .eq('role', 'head')
        .eq('department_id', departmentId)
        .eq('status', 'active')
        .limit(1);

      if (error) throw error;

      if (heads && heads.length > 0) {
        const headName = heads[0].name || '';
        setRequestingPersonHeadName(headName);
        if (!formData.endorsedByHeadName) {
          setFormData(prev => ({ ...prev, endorsedByHeadName: headName }));
        }
      } else {
        setRequestingPersonHeadName('');
      }
    } catch (error) {
      console.error('Error fetching department head:', error);
      setRequestingPersonHeadName('');
    }
  };

  const handleTravelOrderChange = (patch: Partial<TravelOrderData>) => {
    setFormData(prev => ({ ...prev, ...patch }));
    // Clear errors for changed fields
    Object.keys(patch).forEach(key => {
      if (errors[`travelOrder.${key}`]) {
        setErrors(prev => {
          const next = { ...prev };
          delete next[`travelOrder.${key}`];
          return next;
        });
      }
    });
  };

  const handleCostsChange = (patch: Partial<TravelCosts>) => {
    setFormData(prev => ({
      ...prev,
      costs: { ...prev.costs, ...patch },
    }));
  };

  const handleDepartmentChange = async (dept: string) => {
    handleTravelOrderChange({ department: dept });
    
    // Extract department code/name and fetch head
    const deptMatch = dept.match(/^(.+?)\s*\(([^)]+)\)$/);
    const deptName = deptMatch ? deptMatch[1].trim() : dept.trim();
    const deptCode = deptMatch ? deptMatch[2].trim() : null;

    try {
      // Find department ID
      let deptId: string | null = null;
      
      if (deptCode) {
        const { data } = await supabase
          .from('departments')
          .select('id')
          .eq('code', deptCode)
          .single();
        if (data) deptId = data.id;
      }
      
      if (!deptId) {
        const { data } = await supabase
          .from('departments')
          .select('id')
          .eq('name', deptName)
          .single();
        if (data) deptId = data.id;
      }

      if (deptId) {
        await fetchDepartmentHead(deptId);
      }
    } catch (error) {
      console.error('Error fetching department:', error);
    }
  };

  // Validation matching web exactly
  const validateForm = (): { ok: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Required fields
    if (!formData.date?.trim()) {
      newErrors['travelOrder.date'] = 'Date is required';
    }

    if (!formData.requestingPerson?.trim()) {
      newErrors['travelOrder.requestingPerson'] = 'Requesting person is required';
    }

    if (!formData.department?.trim()) {
      newErrors['travelOrder.department'] = 'Department is required';
    }

    if (!formData.destination?.trim()) {
      newErrors['travelOrder.destination'] = 'Destination is required';
    }

    // Departure date validation
    if (!formData.departureDate?.trim()) {
      newErrors['travelOrder.departureDate'] = 'Departure date is required';
    } else {
      const departureDate = new Date(formData.departureDate);
      departureDate.setHours(0, 0, 0, 0);
      
      if (departureDate < today) {
        newErrors['travelOrder.departureDate'] = 'Departure date cannot be in the past';
      } else if (formData.returnDate) {
        const returnDate = new Date(formData.returnDate);
        returnDate.setHours(0, 0, 0, 0);
        if (returnDate < departureDate) {
          newErrors['travelOrder.departureDate'] = 'Departure date must be on or before the return date';
        }
      }
    }

    // Return date validation
    if (!formData.returnDate?.trim()) {
      newErrors['travelOrder.returnDate'] = 'Return date is required';
    } else {
      const returnDate = new Date(formData.returnDate);
      returnDate.setHours(0, 0, 0, 0);
      
      if (returnDate < today) {
        newErrors['travelOrder.returnDate'] = 'Return date cannot be in the past';
      } else if (formData.departureDate) {
        const departureDate = new Date(formData.departureDate);
        departureDate.setHours(0, 0, 0, 0);
        if (returnDate < departureDate) {
          newErrors['travelOrder.returnDate'] = 'Return date must be on or after the departure date';
        }
      }
    }

    if (!formData.purposeOfTravel?.trim()) {
      newErrors['travelOrder.purposeOfTravel'] = 'Purpose of travel is required';
    }

    // Signature validation (skip if representative submission)
    const hasSignature = formData.requesterSignature && 
      formData.requesterSignature.startsWith('data:image') && 
      formData.requesterSignature.length > 3000;
    
    if (!isRepresentativeSubmission && !hasSignature) {
      newErrors['travelOrder.requesterSignature'] = "Requesting person's signature is required";
    }

    // Endorsement signature validation (required if NOT head requester)
    const isHeadRequesterCheck = requestingPersonIsHead ?? false;
    const hasEndorsementSignature = formData.endorsedByHeadSignature && 
      formData.endorsedByHeadSignature.startsWith('data:image') && 
      formData.endorsedByHeadSignature.length > 3000;
    
    if (!isHeadRequesterCheck && !hasEndorsementSignature) {
      newErrors['travelOrder.endorsedByHeadSignature'] = "Department head signature is required";
    }

    // Endorsement name and date validation (required if NOT head requester)
    if (!isHeadRequesterCheck) {
      if (!formData.endorsedByHeadName?.trim()) {
        newErrors['travelOrder.endorsedByHeadName'] = 'Endorsement name is required';
      }
      if (!formData.endorsedByHeadDate?.trim()) {
        newErrors['travelOrder.endorsedByHeadDate'] = 'Endorsement date is required';
      }
    }

    // Justification validation (if rent/hired drivers)
    const needsJustif =
      formData.costs?.rentVehicles || 
      Number(formData.costs?.rentVehicles || 0) > 0 ||
      Number(formData.costs?.hiredDrivers || 0) > 0;

    if (needsJustif && !formData.costs?.justification?.trim()) {
      newErrors['travelOrder.costs.justification'] = 'Please provide a justification for renting / hiring.';
    }

    setErrors(newErrors);
    return { ok: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  // Submission matching web API exactly
  const handleSubmit = async (status: 'draft' | 'submitted' = 'submitted') => {
    // Validate if submitting (not for drafts)
    if (status === 'submitted') {
      const validation = validateForm();
      if (!validation.ok) {
        // Scroll to first error
        Alert.alert('Validation Error', 'Please complete all required fields correctly.');
        return;
      }
    }

    if (!profile || !user) {
      Alert.alert('Error', 'User profile not found. Please sign in again.');
      return;
    }

    setSubmitting(true);

    try {
      // Resolve department ID
      const deptMatch = formData.department.match(/^(.+?)\s*\(([^)]+)\)$/);
      const deptName = deptMatch ? deptMatch[1].trim() : formData.department.trim();
      const deptCode = deptMatch ? deptMatch[2].trim() : null;

      let departmentId: string | null = profile.department_id || null;

      if (deptCode) {
        const { data } = await supabase
          .from('departments')
          .select('id')
          .eq('code', deptCode)
          .single();
        if (data) departmentId = data.id;
      } else if (deptName) {
        const { data } = await supabase
          .from('departments')
          .select('id')
          .eq('name', deptName)
          .single();
        if (data) departmentId = data.id;
      }

      if (!departmentId && status === 'submitted') {
        Alert.alert('Error', 'Department not found. Please select a valid department.');
        setSubmitting(false);
        return;
      }

      // Resolve requester ID (critical for representative submissions)
      let requesterId = profile.id;
      let requesterName = profile.name;
      
      if (isRepresentativeSubmission && formData.requestingPerson !== profile.name) {
        // Search for requesting person
        const { data: users } = await supabase
          .from('users')
          .select('id, name, is_head, role, department_id')
          .ilike('name', `%${formData.requestingPerson}%`)
          .eq('status', 'active')
          .limit(5);

        const exactMatch = users?.find(u => 
          u.name?.toLowerCase().trim() === formData.requestingPerson.toLowerCase().trim()
        );
        const matchedUser = exactMatch || users?.[0];

        if (matchedUser) {
          requesterId = matchedUser.id;
          requesterName = matchedUser.name || formData.requestingPerson;
          setRequestingPersonIsHead(matchedUser.is_head || matchedUser.role === 'head');
          
          // Use requester's department if available
          if (matchedUser.department_id && !departmentId) {
            departmentId = matchedUser.department_id;
          }
        } else if (status === 'submitted') {
          Alert.alert(
            'Error',
            `Cannot find user "${formData.requestingPerson}" in the system. Please check the spelling.`
          );
          setSubmitting(false);
          return;
        }
      }

      // Calculate budget
      const costs = formData.costs || {};
      const expenseBreakdown = [
        costs.food ? { item: 'Food', amount: Number(costs.food), description: costs.foodDescription || 'Meals' } : null,
        costs.driversAllowance ? { item: "Driver's Allowance", amount: Number(costs.driversAllowance), description: costs.driversAllowanceDescription || 'Driver costs' } : null,
        costs.rentVehicles ? { item: 'Transportation', amount: Number(costs.rentVehicles), description: costs.rentVehiclesDescription || 'Vehicle rental' } : null,
        costs.hiredDrivers ? { item: 'Hired Drivers', amount: Number(costs.hiredDrivers), description: costs.hiredDriversDescription || 'Hired driver services' } : null,
        costs.accommodation ? { item: 'Accommodation', amount: Number(costs.accommodation), description: costs.accommodationDescription || 'Lodging' } : null,
        ...(Array.isArray(costs.otherItems) ? costs.otherItems
          .filter((item: any) => item.amount && item.amount > 0)
          .map((item: any) => ({
            item: item.label || 'Other',
            amount: Number(item.amount),
            description: item.description || item.label || 'Miscellaneous',
          })) : []),
      ].filter(item => item !== null && item.amount > 0) as Array<{ item: string; amount: number; description: string }>;

      const totalBudget = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);
      const hasBudget = totalBudget > 0;

      // Determine initial status using workflow engine logic
      // Note: Multiple VP approvals (when participants from different departments have different VP heads)
      // are handled by the backend workflow engine. The mobile app submits participant data,
      // and the backend determines which VPs need to approve based on department hierarchy.
      const requesterIsHead = requestingPersonIsHead ?? false;
      let initialStatus: string;
      
      if (status === 'draft') {
        initialStatus = 'draft';
      } else if (isRepresentativeSubmission && formData.requestingPerson) {
        // Representative submission: send to requesting person first for signature
        if (requesterIsHead) {
          initialStatus = 'pending_head'; // Requesting person is head, they can approve directly
        } else {
          initialStatus = 'pending_requester_signature'; // Need requesting person's signature first
        }
      } else if (requesterIsHead) {
        // Requesting person is a head, can go directly to admin
        initialStatus = 'pending_admin';
      } else {
        // Requesting person is NOT a head, send to their department head first
        initialStatus = 'pending_head';
      }

      // Build request data matching web API exactly
      const requestData: any = {
        request_type: 'travel_order',
        title: formData.purposeOfTravel || 'Travel Request',
        purpose: formData.purposeOfTravel || 'Travel Request',
        destination: formData.destination || 'TBD',
        destination_geo: formData.destinationGeo,
        travel_start_date: formData.departureDate || new Date().toISOString(),
        travel_end_date: formData.returnDate || formData.departureDate || new Date().toISOString(),
        requester_id: requesterId,
        requester_name: requesterName,
        requester_signature: isRepresentativeSubmission ? null : (formData.requesterSignature || null),
        requester_is_head: requesterIsHead,
        department_id: departmentId,
        submitted_by_user_id: profile.id,
        submitted_by_name: profile.name || '',
        is_representative: isRepresentativeSubmission,
        participants: participants.map(p => ({ email: p.email })),
        head_included: requesterIsHead,
        has_budget: hasBudget,
        total_budget: totalBudget,
        expense_breakdown: expenseBreakdown,
        cost_justification: costs.justification || null,
        vehicle_mode: formData.vehicleMode || 'owned',
        preferred_vehicle_id: formData.preferredVehicleId || null,
        preferred_driver_id: formData.preferredDriverId || null,
        needs_vehicle: formData.vehicleMode === 'institutional', // Needs vehicle if institutional mode - backend workflow will skip admin/comptroller if no budget and no vehicle
        status: initialStatus,
        current_approver_role: 
          initialStatus === 'pending_head' || initialStatus === 'pending_requester_signature' ? 'head' :
          initialStatus === 'pending_admin' ? 'admin' :
          initialStatus === 'pending_hr' ? 'hr' :
          initialStatus === 'pending_exec' ? 'exec' : null,
        head_signature: requesterIsHead ? null : (formData.endorsedByHeadSignature || null),
      };

      // Insert request
      const { data: request, error } = await supabase
        .from('requests')
        .insert(requestData)
        .select()
        .single();

      if (error) {
        console.error('Request submission error:', error);
        throw error;
      }

      // Save request ID for participants
      setSavedRequestId(request.id);

      // Create history entry
      await supabase.from('request_history').insert({
        request_id: request.id,
        action: 'created',
        actor_id: profile.id,
        actor_role: isRepresentativeSubmission ? 'submitter' : (requesterIsHead ? 'head' : 'faculty'),
        previous_status: null,
        new_status: initialStatus,
        comments: isRepresentativeSubmission 
          ? `Request submitted on behalf of ${requesterName} by ${profile.name}`
          : 'Request created and submitted',
      });

      // Create notification for submitter
      await supabase.from('notifications').insert({
        user_id: profile.id,
        notification_type: 'request_submitted',
        title: 'Request Submitted',
        message: `Your travel order request ${request.request_number || 'has been submitted'} and is now pending approval.`,
        related_type: 'request',
        related_id: request.id,
        action_url: `/request/${request.id}`,
        priority: 'normal',
      });

      // If representative submission, notify requester
      if (isRepresentativeSubmission && requesterId !== profile.id) {
        await supabase.from('notifications').insert({
          user_id: requesterId,
          notification_type: 'request_pending_signature',
          title: 'Signature Required',
          message: `${profile.name} submitted a travel order request on your behalf. Please sign to proceed.`,
          related_type: 'request',
          related_id: request.id,
          action_url: `/request/${request.id}`,
          priority: 'high',
        });
      }

      // Build routing path message for faculty with budget threshold
      let routingMessage = '';
      if (status === 'submitted' && !requesterIsHead) {
        const isFaculty = !requesterIsHead;
        const budgetThreshold = 15000;
        const exceedsThreshold = totalBudget >= budgetThreshold;
        
        if (isFaculty && hasBudget) {
          if (exceedsThreshold) {
            routingMessage = `\n\nRouting: Department Head → Admin → Comptroller → HR → VP → President (Budget ≥ ₱15,000)`;
          } else {
            routingMessage = `\n\nRouting: Department Head → Admin → Comptroller → HR → VP (Budget < ₱15,000)`;
          }
        } else if (isFaculty && !hasBudget) {
          routingMessage = `\n\nRouting: Department Head → Admin → HR → VP`;
        }
      } else if (status === 'submitted' && requesterIsHead) {
        routingMessage = `\n\nRouting: Admin → Comptroller → HR → VP → President`;
      }

      Alert.alert(
        'Success',
        (status === 'draft' 
          ? 'Draft saved successfully!'
          : 'Your travel order has been submitted successfully!') + routingMessage,
        [
          {
            text: 'OK',
            onPress: () => router.push(`/request/${request.id}`),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting request:', error);
      Alert.alert(
        'Submission Failed',
        error.message || 'An error occurred while submitting your request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    await handleSubmit('draft');
    setSavingDraft(false);
  };

  const needsJustif = 
    Number(formData.costs?.rentVehicles || 0) > 0 ||
    Number(formData.costs?.hiredDrivers || 0) > 0;

  const isHeadRequester = requestingPersonIsHead ?? false;
  const shouldShowSignaturePad = !isHeadRequester && !isRepresentativeSubmission;

  // Calculate next approver for button text with smart routing
  const getNextApproverText = (): string => {
    if (isReturnedRequest) {
      return 'Resubmit Request';
    }

    const totalBudget = (formData.costs?.food || 0) +
      (formData.costs?.driversAllowance || 0) +
      (formData.costs?.rentVehicles || 0) +
      (formData.costs?.hiredDrivers || 0) +
      (formData.costs?.accommodation || 0) +
      (Array.isArray(formData.costs?.otherItems) ? formData.costs.otherItems.reduce((sum, item) => sum + (item.amount || 0), 0) : 0);
    const hasBudget = totalBudget > 0;

    if (isRepresentativeSubmission) {
      return `Forward to ${formData.requestingPerson || 'Requesting Person'}`;
    }

    if (isHeadRequester || requestingPersonIsHead) {
      // Head self-request: smart routing based on vehicle mode and budget
      if (formData.vehicleMode === 'institutional') {
        return 'Forward to Transport Manager';
      }
      if (hasBudget && totalBudget >= 15000 && profile?.role !== 'exec') {
        return 'Forward to President';
      }
      if (!hasBudget && formData.vehicleMode === 'owned') {
        // Skip admin/comptroller, go directly to HR
        return 'Forward to HR';
      }
      return 'Forward to Admin';
    }
    
    // Non-head requester: go to department head first
    return 'Forward to Department Head';
  };
  
  // Get smart routing suggestion helper text
  const getRoutingSuggestion = (): string | null => {
    const totalBudget = (formData.costs?.food || 0) +
      (formData.costs?.driversAllowance || 0) +
      (formData.costs?.rentVehicles || 0) +
      (formData.costs?.hiredDrivers || 0) +
      (formData.costs?.accommodation || 0) +
      (Array.isArray(formData.costs?.otherItems) ? formData.costs.otherItems.reduce((sum, item) => sum + (item.amount || 0), 0) : 0);
    const hasBudget = totalBudget > 0;
    
    // Smart skip suggestions
    if ((isHeadRequester || requestingPersonIsHead) && formData.vehicleMode === 'owned' && !hasBudget) {
      return 'Suggestion: Skip Admin and Comptroller, go directly to HR';
    }
    
    if (formData.vehicleMode === 'institutional' && !hasBudget) {
      return 'Suggestion: Will go to Transport Manager first, then HR';
    }
    
    if (hasBudget && totalBudget >= 15000 && profile?.role !== 'exec') {
      return 'Suggestion: High budget requires President approval';
    }
    
    return null;
  };

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Travel Order"
        onMenuPress={() => setSidebarVisible(true)}
        showNotification={true}
        showMenu={true}
        showBack={true}
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Return to Sender Banner */}
          {isReturnedRequest && (
            <View style={styles.returnBanner}>
              <View style={styles.returnBannerHeader}>
                <Ionicons name="alert-circle" size={24} color="#dc2626" />
                <Text style={styles.returnBannerTitle}>Request Returned for Revision</Text>
              </View>
              <Text style={styles.returnBannerText}>
                This request was returned for revision. Please review the comments below and make the necessary changes.
              </Text>
              {returnReason && (
                <View style={styles.returnReasonBox}>
                  <Text style={styles.returnReasonLabel}>Return Reason:</Text>
                  <Text style={styles.returnReasonText}>{returnReason}</Text>
                </View>
              )}
              {returnComments && (
                <View style={styles.returnCommentsBox}>
                  <Text style={styles.returnCommentsLabel}>Comments:</Text>
                  <Text style={styles.returnCommentsText}>{returnComments}</Text>
                </View>
              )}
            </View>
          )}

          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>Travel Order Request</Text>
                <Text style={styles.formSubtitle}>
                  {isReturnedRequest 
                    ? 'Review and update the request, then resubmit' 
                    : 'Complete all required fields to submit your travel request'}
                </Text>
              </View>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>* Required</Text>
              </View>
            </View>

            {/* Form Fields - Single Column Layout */}
            <View style={styles.section}>
              {/* Date */}
              <View style={styles.fieldContainer}>
                <DateInput
                  id="to-date"
                  label="Date"
                  value={formData.date}
                  onChange={(date) => handleTravelOrderChange({ date })}
                  required
                  error={errors['travelOrder.date']}
                  helper="Date of request"
                />
              </View>

              {/* Requesting Person */}
              <View style={styles.fieldContainer}>
                <UserSearchableSelect
                  value={formData.requestingPerson}
                  onChange={(userName) => handleTravelOrderChange({ requestingPerson: userName })}
                  placeholder="Type to search user..."
                  label="Requesting Person"
                  required
                  error={errors['travelOrder.requestingPerson']}
                />
              </View>

              {/* Department */}
              <View style={styles.fieldContainer}>
                <DepartmentSelect
                  value={formData.department}
                  onChange={handleDepartmentChange}
                  placeholder="Select department..."
                  label="Department"
                  required
                  error={errors['travelOrder.department']}
                />
              </View>

              {/* Destination */}
              <View style={styles.fieldContainer}>
                <LocationField
                  value={formData.destination}
                  geo={formData.destinationGeo}
                  onChange={({ address, geo }) => handleTravelOrderChange({ destination: address, destinationGeo: geo })}
                  placeholder="Enter destination or pick on map"
                  label="Destination"
                  required
                  error={errors['travelOrder.destination']}
                  inputId="to-destination"
                />
              </View>

              {/* Departure Date */}
              <View style={styles.fieldContainer}>
                <DateInput
                  id="to-departure"
                  label="Departure Date"
                  value={formData.departureDate}
                  onChange={(date) => handleTravelOrderChange({ departureDate: date })}
                  required
                  error={errors['travelOrder.departureDate']}
                  minimumDate={new Date()}
                />
              </View>

              {/* Return Date */}
              <View style={styles.fieldContainer}>
                <DateInput
                  id="to-return"
                  label="Return Date"
                  value={formData.returnDate}
                  onChange={(date) => handleTravelOrderChange({ returnDate: date })}
                  required
                  error={errors['travelOrder.returnDate']}
                  minimumDate={formData.departureDate ? new Date(formData.departureDate) : new Date()}
                />
              </View>

              {/* Purpose of Travel */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Purpose of Travel <Text style={styles.required}>*</Text>
                </Text>
                <RNTextInput
                  style={[styles.textArea, errors['travelOrder.purposeOfTravel'] && styles.inputError]}
                  placeholder="Enter purpose of travel"
                  placeholderTextColor="#9ca3af"
                  value={formData.purposeOfTravel}
                  onChangeText={(text) => handleTravelOrderChange({ purposeOfTravel: text })}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                {errors['travelOrder.purposeOfTravel'] && (
                  <Text style={styles.errorText}>{errors['travelOrder.purposeOfTravel']}</Text>
                )}
              </View>

              {/* Vehicle Mode Selection */}
              <View style={styles.fieldContainer}>
                <Text style={styles.label}>
                  Vehicle Mode <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.vehicleModeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.vehicleModeOption,
                      formData.vehicleMode === 'owned' && styles.vehicleModeOptionActive,
                    ]}
                    onPress={() => handleTravelOrderChange({ vehicleMode: 'owned' })}
                  >
                    <Ionicons
                      name={formData.vehicleMode === 'owned' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={formData.vehicleMode === 'owned' ? '#7a0019' : '#9ca3af'}
                    />
                    <Text
                      style={[
                        styles.vehicleModeText,
                        formData.vehicleMode === 'owned' && styles.vehicleModeTextActive,
                      ]}
                    >
                      Owned Vehicle
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.vehicleModeOption,
                      formData.vehicleMode === 'institutional' && styles.vehicleModeOptionActive,
                    ]}
                    onPress={() => handleTravelOrderChange({ vehicleMode: 'institutional' })}
                  >
                    <Ionicons
                      name={formData.vehicleMode === 'institutional' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={formData.vehicleMode === 'institutional' ? '#7a0019' : '#9ca3af'}
                    />
                    <Text
                      style={[
                        styles.vehicleModeText,
                        formData.vehicleMode === 'institutional' && styles.vehicleModeTextActive,
                      ]}
                    >
                      Institutional Vehicle
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.vehicleModeOption,
                      formData.vehicleMode === 'rent' && styles.vehicleModeOptionActive,
                    ]}
                    onPress={() => handleTravelOrderChange({ vehicleMode: 'rent' })}
                  >
                    <Ionicons
                      name={formData.vehicleMode === 'rent' ? 'radio-button-on' : 'radio-button-off'}
                      size={20}
                      color={formData.vehicleMode === 'rent' ? '#7a0019' : '#9ca3af'}
                    />
                    <Text
                      style={[
                        styles.vehicleModeText,
                        formData.vehicleMode === 'rent' && styles.vehicleModeTextActive,
                      ]}
                    >
                      Rent Vehicle
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Vehicle & Driver Selection - Only show when institutional mode */}
              {formData.vehicleMode === 'institutional' && (
                <VehicleDriverSelection
                  vehicles={vehicles}
                  drivers={drivers}
                  selectedVehicleId={formData.preferredVehicleId || null}
                  selectedDriverId={formData.preferredDriverId || null}
                  onVehicleSelect={(vehicleId) => handleTravelOrderChange({ preferredVehicleId: vehicleId })}
                  onDriverSelect={(driverId) => handleTravelOrderChange({ preferredDriverId: driverId })}
                  loading={false}
                />
              )}

              {/* Participants Section */}
              <ParticipantInvitationEditor
                invitations={participants}
                onChange={setParticipants}
                requestId={savedRequestId || (params.id as string | undefined) || undefined}
                disabled={submitting || savingDraft}
              />

              {/* Requesting Person's Signature - HIDE if head or representative */}
              {shouldShowSignaturePad && (
                <View style={[
                  styles.signatureSection,
                  errors['travelOrder.requesterSignature'] && styles.signatureSectionError,
                ]}>
                  <View style={styles.signatureHeader}>
                    <View>
                      <Text style={styles.signatureTitle}>
                        Requesting person's signature <Text style={styles.required}>*</Text>
                      </Text>
                      <Text style={styles.signatureSubtitle}>
                        Sign with finger — it auto-saves when you lift
                      </Text>
                    </View>
                    {errors['travelOrder.requesterSignature'] && (
                      <View style={styles.errorBadge}>
                        <Text style={styles.errorBadgeText}>{errors['travelOrder.requesterSignature']}</Text>
                      </View>
                    )}
                  </View>
                  <SignaturePad
                    height={160}
                    value={formData.requesterSignature || null}
                    onSave={(dataUrl) => handleTravelOrderChange({ requesterSignature: dataUrl })}
                    onClear={() => handleTravelOrderChange({ requesterSignature: '' })}
                    hideSaveButton
                  />
                </View>
              )}
            </View>

            {/* Costs Section */}
            <CostsSection
              costs={formData.costs}
              needsJustif={needsJustif}
              errors={errors}
              onChangeCosts={handleCostsChange}
            />

            {/* Endorsement Section - Show for all, but with auto-endorsed message if head */}
            <View style={styles.endorsementSection}>
              <View style={styles.endorsementHeader}>
                <Text style={styles.endorsementTitle}>Department Head Endorsement</Text>
                {isHeadRequester && (
                  <View style={styles.autoEndorsedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text style={styles.autoEndorsedText}>You are the department head - auto-endorsed</Text>
                  </View>
                )}
                {!isHeadRequester && errors['travelOrder.endorsedByHeadSignature'] && (
                  <View style={styles.errorBadge}>
                    <Text style={styles.errorBadgeText}>{errors['travelOrder.endorsedByHeadSignature']}</Text>
                  </View>
                )}
              </View>

              {isHeadRequester ? (
                <View style={styles.autoEndorsedMessage}>
                  <Text style={styles.autoEndorsedMessageText}>
                    As the department head, your request is automatically endorsed. No additional signature is required.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.endorsementRow}>
                    <View style={styles.endorsementField}>
                      <Text style={styles.endorsementLabel}>
                        Endorsed by <Text style={styles.required}>*</Text>
                      </Text>
                      <RNTextInput
                        style={[styles.endorsementInput, errors['travelOrder.endorsedByHeadName'] && styles.inputError]}
                        value={isRepresentativeSubmission && requestingPersonHeadName 
                          ? requestingPersonHeadName 
                          : (formData.endorsedByHeadName || '')}
                        onChangeText={(text) => handleTravelOrderChange({ endorsedByHeadName: text })}
                        placeholder="Department Head Name"
                        placeholderTextColor="#9ca3af"
                        editable={!isRepresentativeSubmission || !requestingPersonHeadName}
                      />
                      {errors['travelOrder.endorsedByHeadName'] && (
                        <Text style={styles.errorText}>{errors['travelOrder.endorsedByHeadName']}</Text>
                      )}
                      {!formData.endorsedByHeadName && !requestingPersonHeadName && (
                        <Text style={styles.warningText}>
                          ⚠️ No department head found. Please enter the department head name manually.
                        </Text>
                      )}
                    </View>

                    <View style={styles.endorsementField}>
                      <Text style={styles.endorsementLabel}>
                        Endorsement Date <Text style={styles.required}>*</Text>
                      </Text>
                      <DateInput
                        id="endorsement-date"
                        value={formData.endorsedByHeadDate || ''}
                        onChange={(date) => handleTravelOrderChange({ endorsedByHeadDate: date })}
                        placeholder="Select date..."
                        error={errors['travelOrder.endorsedByHeadDate']}
                      />
                    </View>
                  </View>

                  {/* Endorsement Signature */}
                  <View style={[
                    styles.signatureSection,
                    errors['travelOrder.endorsedByHeadSignature'] && styles.signatureSectionError,
                  ]}>
                    <View style={styles.signatureHeader}>
                      <View>
                        <Text style={styles.signatureTitle}>
                          Department Head Signature <Text style={styles.required}>*</Text>
                        </Text>
                        <Text style={styles.signatureSubtitle}>
                          Sign with finger — it auto-saves when you lift
                        </Text>
                      </View>
                      {errors['travelOrder.endorsedByHeadSignature'] && (
                        <View style={styles.errorBadge}>
                          <Text style={styles.errorBadgeText}>{errors['travelOrder.endorsedByHeadSignature']}</Text>
                        </View>
                      )}
                    </View>
                    <SignaturePad
                      height={160}
                      value={formData.endorsedByHeadSignature || null}
                      onSave={(dataUrl) => handleTravelOrderChange({ endorsedByHeadSignature: dataUrl })}
                      onClear={() => handleTravelOrderChange({ endorsedByHeadSignature: '' })}
                      hideSaveButton
                    />
                  </View>
                </>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, styles.draftButton]}
                onPress={handleSaveDraft}
                disabled={savingDraft || submitting}
              >
                {savingDraft ? (
                  <ActivityIndicator size="small" color="#6b7280" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#6b7280" />
                    <Text style={styles.draftButtonText}>Save Draft</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.submitButtonContainer}>
                {getRoutingSuggestion() && (
                  <View style={styles.routingSuggestion}>
                    <Ionicons name="bulb-outline" size={16} color="#f59e0b" />
                    <Text style={styles.routingSuggestionText}>{getRoutingSuggestion()}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={[styles.button, styles.submitButton, (submitting || savingDraft) && styles.submitButtonDisabled]}
                  onPress={() => handleSubmit('submitted')}
                  disabled={submitting || savingDraft}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle" size={20} color="#fff" />
                      <Text style={styles.submitButtonText}>
                        {getNextApproverText()}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    overflow: 'hidden', // Prevent content from overflowing outside screen
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding for submit button
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  formSubtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 22,
  },
  requiredBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requiredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a0019',
  },
  section: {
    gap: 0,
    marginBottom: 32,
  },
  fieldContainer: {
    width: '100%',
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    lineHeight: 22,
  },
  required: {
    color: '#dc2626',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 18,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 140,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 8,
    lineHeight: 20,
  },
  signatureSection: {
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  signatureSectionError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  signatureHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  signatureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  signatureSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 6,
  },
  errorBadge: {
    backgroundColor: '#fee2e2',
    borderWidth: 2,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  errorBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#dc2626',
  },
  endorsementSection: {
    marginTop: 32,
    padding: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  endorsementHeader: {
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  endorsementTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  autoEndorsedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  autoEndorsedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#16a34a',
  },
  endorsementRow: {
    gap: 0,
  },
  endorsementField: {
    width: '100%',
    marginBottom: 24,
  },
  endorsementLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  endorsementInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 56,
  },
  endorsementInputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
  warningText: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 2,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  draftButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#e5e7eb',
  },
  draftButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.2,
  },
  submitButtonContainer: {
    gap: 8,
  },
  routingSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  routingSuggestionText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400e',
    lineHeight: 16,
  },
  submitButton: {
    backgroundColor: '#7a0019',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.3,
  },
  returnBanner: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#fecaca',
  },
  returnBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  returnBannerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#dc2626',
  },
  returnBannerText: {
    fontSize: 15,
    color: '#991b1b',
    lineHeight: 22,
    marginBottom: 12,
  },
  returnReasonBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  returnReasonLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 6,
  },
  returnReasonText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  returnCommentsBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
  },
  returnCommentsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#991b1b',
    marginBottom: 6,
  },
  returnCommentsText: {
    fontSize: 14,
    color: '#111827',
    lineHeight: 20,
  },
  autoEndorsedMessage: {
    backgroundColor: '#dcfce7',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  autoEndorsedMessageText: {
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
    fontWeight: '500',
  },
  vehicleModeContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  vehicleModeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    minWidth: 0, // Allow flex to work
  },
  vehicleModeOptionActive: {
    borderColor: '#7a0019',
    backgroundColor: '#fef2f2',
  },
  vehicleModeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  vehicleModeTextActive: {
    color: '#7a0019',
    fontWeight: '700',
  },
});
