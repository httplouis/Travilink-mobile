import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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
import SidebarMenu from '@/components/SidebarMenu';
import FileAttachmentPicker, { AttachmentFile } from '@/components/FileAttachmentPicker';
import PickupPreferenceSelector, { PickupPreference } from '@/components/PickupPreferenceSelector';
import ValidationSummary from '@/components/ValidationSummary';
import { uploadFilesToStorage } from '@/lib/storage';

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
  costs: TravelCosts;
  requesterSignature?: string;
  endorsedByHeadName?: string;
  endorsedByHeadDate?: string;
  endorsedByHeadSignature?: string;
  requesterContactNumber?: string;
  pickupPreference?: PickupPreference;
}

export default function TravelOrderScreen() {
  const { profile, user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showValidationSummary, setShowValidationSummary] = useState(false);
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollViewRef = useRef<ScrollView>(null);
  const fieldRefs = useRef<Record<string, View | null>>({});
  
  // Requesting person tracking
  const [requestingPersonIsHead, setRequestingPersonIsHead] = useState<boolean | null>(null);
  const [requestingPersonHeadName, setRequestingPersonHeadName] = useState<string>('');
  const [isRepresentativeSubmission, setIsRepresentativeSubmission] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  // Form data matching web exactly
  const [formData, setFormData] = useState<TravelOrderData>({
    date: new Date().toISOString().split('T')[0],
    requestingPerson: profile?.name || '',
    department: profile?.department ? `${profile.department.name}${profile.department.code ? ` (${profile.department.code})` : ''}` : '',
    destination: '',
    destinationGeo: null,
    departureDate: '',
    returnDate: '',
    purposeOfTravel: '',
    costs: {},
    requesterSignature: '',
    endorsedByHeadName: '',
    endorsedByHeadDate: '',
    endorsedByHeadSignature: '',
    requesterContactNumber: '',
    pickupPreference: null,
  });

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

    // Contact number validation (if provided, must be valid format)
    if (formData.requesterContactNumber && formData.requesterContactNumber.trim()) {
      const phone = formData.requesterContactNumber.trim();
      const philippinesPhoneRegex = /^(\+63|0)?9\d{9}$/;
      const cleanPhone = phone.replace(/[\s-]/g, '');
      
      if (!philippinesPhoneRegex.test(cleanPhone) && !cleanPhone.startsWith('+63') && !cleanPhone.startsWith('09')) {
        newErrors['travelOrder.requesterContactNumber'] = 'Please enter a valid Philippines phone number (+63XXXXXXXXXX or 09XXXXXXXXX)';
      }
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
        // Show validation summary instead of generic alert
        setShowValidationSummary(true);
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

      // Upload attachments if any
      let uploadedAttachments: any[] = [];
      if (attachments.length > 0 && status === 'submitted') {
        try {
          // Upload files to storage (we'll update with request ID after creation)
          uploadedAttachments = await uploadFilesToStorage(attachments, profile.id);
        } catch (uploadError: any) {
          console.error('Error uploading attachments:', uploadError);
          Alert.alert(
            'Upload Error',
            'Failed to upload some attachments. Do you want to continue without them?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => { setSubmitting(false); return; } },
              { text: 'Continue', onPress: () => {} },
            ]
          );
          // Continue without attachments if user chooses
        }
      }

      // Build request data matching web API exactly
      const requestData: any = {
        request_type: 'travel_order',
        title: formData.purposeOfTravel || 'Travel Request',
        purpose: formData.purposeOfTravel || 'Travel Request',
        destination: formData.destination || 'TBD',
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
        participants: [],
        head_included: requesterIsHead,
        has_budget: hasBudget,
        total_budget: totalBudget,
        expense_breakdown: expenseBreakdown,
        cost_justification: costs.justification || null,
        vehicle_mode: 'owned', // Default for now
        needs_vehicle: false, // Default for now
        status: initialStatus,
        current_approver_role: 
          initialStatus === 'pending_head' || initialStatus === 'pending_requester_signature' ? 'head' :
          initialStatus === 'pending_admin' ? 'admin' :
          initialStatus === 'pending_hr' ? 'hr' :
          initialStatus === 'pending_exec' ? 'exec' : null,
        head_signature: requesterIsHead ? null : (formData.endorsedByHeadSignature || null),
        requester_contact_number: formData.requesterContactNumber || null,
        pickup_preference: formData.pickupPreference || null,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
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

      Alert.alert(
        'Success',
        status === 'draft' 
          ? 'Draft saved successfully!'
          : 'Your travel order has been submitted successfully!',
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
  // Always show signature pad - user can sign even if it's a representative submission
  // The validation will handle whether the signature is required or not
  const shouldShowSignaturePad = true;

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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          scrollEnabled={scrollEnabled}
        >
          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderLeft}>
                <Text style={styles.formTitle}>Travel Order Request</Text>
                <View style={styles.formHeaderBottom}>
                  <Text style={styles.formSubtitle}>Complete all required fields to submit your travel request</Text>
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredBadgeText}>* Required</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                style={styles.fillCurrentButton}
                onPress={() => {
                  if (profile) {
                    const today = new Date();
                    const tomorrow = new Date(today);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const dayAfter = new Date(tomorrow);
                    dayAfter.setDate(dayAfter.getDate() + 1);
                    
                    handleTravelOrderChange({
                      date: today.toISOString().split('T')[0],
                      requestingPerson: profile.name || '',
                      department: profile.department ? `${profile.department.name}${profile.department.code ? ` (${profile.department.code})` : ''}` : '',
                      destination: 'Manila, Philippines',
                      departureDate: tomorrow.toISOString().split('T')[0],
                      returnDate: dayAfter.toISOString().split('T')[0],
                      purposeOfTravel: 'Business travel',
                      requesterContactNumber: profile.phone_number || '',
                    });
                    Alert.alert('Form Filled', 'All required fields have been filled with sample data. Please review and adjust as needed.');
                  }
                }}
              >
                <Ionicons name="person-add" size={16} color="#7a0019" />
                <Text style={styles.fillCurrentButtonText}>Fill Current</Text>
              </TouchableOpacity>
            </View>

            {/* Top Grid Fields */}
            <View style={styles.section}>
              {/* Row 1: Date - Full Width */}
              <View style={styles.fullWidth}>
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

              {/* Row 2: Requesting Person - Full Width */}
              <View style={styles.fullWidth}>
                <UserSearchableSelect
                  value={formData.requestingPerson}
                  onChange={(userName) => handleTravelOrderChange({ requestingPerson: userName })}
                  placeholder="Type to search user..."
                  label="Requesting Person"
                  required
                  error={errors['travelOrder.requestingPerson']}
                />
              </View>

              {/* Row 3: Department - Full Width */}
              <View style={styles.fullWidth}>
                <DepartmentSelect
                  value={formData.department}
                  onChange={handleDepartmentChange}
                  placeholder="Select department..."
                  label="Department"
                  required
                  error={errors['travelOrder.department']}
                />
              </View>

              {/* Row 4: Destination - Full Width */}
              <View style={styles.fullWidth}>
                <LocationField
                  value={formData.destination}
                  geo={formData.destinationGeo}
                  onChange={({ address, geo }) => handleTravelOrderChange({ destination: address, destinationGeo: geo })}
                  placeholder="Enter destination or pick on map"
                  label="Destination"
                  required
                  error={errors['travelOrder.destination']}
                  inputId="to-destination"
                  showMapPreview={false}
                />
              </View>

              {/* Map Preview - Full Width, Separate Section */}
              {formData.destinationGeo?.lat != null && formData.destinationGeo?.lng != null && (
                <View style={styles.fullWidth}>
                  <View style={styles.mapPreviewSection}>
                    <Text style={styles.mapPreviewLabel}>📍 Selected Location</Text>
                    {(() => {
                      let WebView: any = null;
                      if (Platform.OS !== 'web') {
                        try {
                          WebView = require('react-native-webview').WebView;
                        } catch (error) {
                          console.warn('react-native-webview not available');
                        }
                      }

                      const htmlContent = `
                        <!DOCTYPE html>
                        <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                            <style>
                              * { margin: 0; padding: 0; box-sizing: border-box; }
                              body, html { width: 100%; height: 100%; overflow: hidden; }
                              #map { width: 100%; height: 100%; }
                            </style>
                          </head>
                          <body>
                            <div id="map"></div>
                            <script>
                              const map = L.map('map').setView([${formData.destinationGeo.lat}, ${formData.destinationGeo.lng}], 15);
                              L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap contributors',
                                maxZoom: 19
                              }).addTo(map);
                              L.marker([${formData.destinationGeo.lat}, ${formData.destinationGeo.lng}]).addTo(map)
                                .bindPopup('${(formData.destination || 'Selected location').replace(/'/g, "\\'")}')
                                .openPopup();
                            </script>
                          </body>
                        </html>
                      `;

                      return (
                        <View style={styles.mapPreview}>
                          {Platform.OS !== 'web' && WebView ? (
                            <WebView
                              style={styles.mapPreviewMap}
                              source={{ html: htmlContent }}
                              javaScriptEnabled={true}
                              domStorageEnabled={true}
                              scrollEnabled={false}
                              showsHorizontalScrollIndicator={false}
                              showsVerticalScrollIndicator={false}
                            />
                          ) : (
                            <View style={styles.mapPreviewFallback}>
                              <Ionicons name="map-outline" size={32} color="#7a0019" />
                              <Text style={styles.mapPreviewCoords}>
                                {formData.destinationGeo.lat.toFixed(6)}, {formData.destinationGeo.lng.toFixed(6)}
                              </Text>
                            </View>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                </View>
              )}

              {/* Row 3: Departure and Return Dates */}
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <DateInput
                    id="to-departure"
                    label="Departure Date"
                    value={formData.departureDate}
                    onChange={(date) => handleTravelOrderChange({ departureDate: date })}
                    required
                    error={errors['travelOrder.departureDate']}
                    minimumDate={new Date()}
                    maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                  />
                </View>

                <View style={styles.halfWidth}>
                  <DateInput
                    id="to-return"
                    label="Return Date"
                    value={formData.returnDate}
                    onChange={(date) => handleTravelOrderChange({ returnDate: date })}
                    required
                    error={errors['travelOrder.returnDate']}
                    minimumDate={formData.departureDate ? new Date(formData.departureDate) : new Date()}
                    maximumDate={new Date(new Date().setFullYear(new Date().getFullYear() + 2))}
                  />
                </View>
              </View>

              {/* Purpose (full width) */}
              <View style={styles.fullWidth}>
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
                  <View style={{ marginTop: 8 }}>
                    <SignaturePad
                      height={160}
                      value={formData.requesterSignature || null}
                      onSave={(dataUrl) => handleTravelOrderChange({ requesterSignature: dataUrl })}
                      onClear={() => handleTravelOrderChange({ requesterSignature: '' })}
                      onDrawingStart={() => setScrollEnabled(false)}
                      onDrawingEnd={() => setScrollEnabled(true)}
                      hideSaveButton
                    />
                  </View>
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

            {/* Contact Number Section */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Contact Number for Driver/Coordination <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <RNTextInput
                style={[styles.input, errors['travelOrder.requesterContactNumber'] && styles.inputError]}
                placeholder="+63XXXXXXXXXX or 09XXXXXXXXX"
                placeholderTextColor="#9ca3af"
                value={formData.requesterContactNumber || ''}
                onChangeText={(text) => handleTravelOrderChange({ requesterContactNumber: text })}
                keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                Provide your contact number for driver coordination
              </Text>
              {errors['travelOrder.requesterContactNumber'] && (
                <Text style={styles.errorText}>{errors['travelOrder.requesterContactNumber']}</Text>
              )}
            </View>

            {/* Pickup Preference Section */}
            <View style={styles.section}>
              <PickupPreferenceSelector
                value={formData.pickupPreference || null}
                onChange={(value) => handleTravelOrderChange({ pickupPreference: value })}
                error={errors['travelOrder.pickupPreference']}
                disabled={submitting || savingDraft}
              />
            </View>

            {/* File Attachments Section */}
            <View style={styles.section}>
              <FileAttachmentPicker
                files={attachments}
                onChange={setAttachments}
                error={errors['travelOrder.attachments']}
                disabled={submitting || savingDraft}
              />
            </View>

            {/* Endorsement Section - Only show if NOT head requester */}
            {!isHeadRequester && (
              <View style={styles.endorsementSection}>
                <View style={styles.endorsementHeader}>
                  <Text style={styles.endorsementTitle}>Department Head Endorsement</Text>
                  {errors['travelOrder.endorsedByHeadSignature'] && (
                    <View style={styles.errorBadge}>
                      <Text style={styles.errorBadgeText}>{errors['travelOrder.endorsedByHeadSignature']}</Text>
                    </View>
                  )}
                </View>

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
                      value={formData.endorsedByHeadDate}
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
              </View>
            )}

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
                    <Text style={styles.submitButtonText}>Submit Request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: Platform.OS === 'ios' ? 100 : 80 }} />
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      <SidebarMenu visible={sidebarVisible} onClose={() => setSidebarVisible(false)} />
      <ValidationSummary
        visible={showValidationSummary}
        errors={errors}
        onClose={() => setShowValidationSummary(false)}
        onScrollToField={(fieldKey) => {
          // Scroll to the first error field
          const firstErrorKey = Object.keys(errors)[0];
          if (firstErrorKey && scrollViewRef.current) {
            // Try to find and scroll to the field
            const fieldRef = fieldRefs.current[firstErrorKey];
            if (fieldRef) {
              fieldRef.measureLayout(
                scrollViewRef.current as any,
                (x, y) => {
                  scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 100), animated: true });
                },
                () => {}
              );
            }
          }
        }}
      />
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
  },
  scrollContent: {
    padding: 16,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    marginBottom: 16,
    gap: 12,
  },
  formHeaderLeft: {
    flex: 1,
  },
  formHeaderBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 12,
    flexWrap: 'wrap',
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  formSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  requiredBadge: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  requiredBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#7a0019',
  },
  fillCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7a0019',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  fillCurrentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7a0019',
  },
  section: {
    gap: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  required: {
    color: '#dc2626',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
  },
  textArea: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
    marginTop: 4,
  },
  signatureSection: {
    marginTop: 8,
    padding: 16,
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
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  signatureTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  signatureSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
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
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  endorsementHeader: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  endorsementTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
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
    flexDirection: 'row',
    gap: 16,
  },
  endorsementField: {
    flex: 1,
    gap: 8,
  },
  endorsementLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  endorsementInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    height: 44,
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
    gap: 12,
    marginTop: 24,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  submitButton: {
    backgroundColor: '#7a0019',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  mapPreviewSection: {
    marginTop: 8,
    gap: 6,
  },
  mapPreviewLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  mapPreview: {
    height: 280,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapPreviewMap: {
    width: '100%',
    height: '100%',
  },
  mapPreviewFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9fafb',
  },
  mapPreviewCoords: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});
