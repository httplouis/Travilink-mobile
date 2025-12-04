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
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useUsers } from '@/hooks/useUsers';
import { useDrivers } from '@/hooks/useDrivers';
import { useVehicles } from '@/hooks/useVehicles';
import { supabase } from '@/lib/supabase/client';
import NavigationHeader from '@/components/NavigationHeader';
import CustomTabBar from '@/components/CustomTabBar';
import DateInput from '@/components/DateInput';
import UserSearchableSelect from '@/components/UserSearchableSelect';
import HeadSearchableSelect from '@/components/HeadSearchableSelect';
import VehicleDriverSelection from '@/components/VehicleDriverSelection';
import DepartmentSelect from '@/components/DepartmentSelect';
import LocationField from '@/components/LocationField';
import CostsSection from '@/components/CostsSection';
import SignaturePad from '@/components/SignaturePad';
import SidebarMenu from '@/components/SidebarMenu';
import FileAttachmentPicker, { AttachmentFile } from '@/components/FileAttachmentPicker';
import PickupPreferenceSelector, { PickupPreference } from '@/components/PickupPreferenceSelector';
import ValidationSummary from '@/components/ValidationSummary';
import { uploadFilesToStorage } from '@/lib/storage';
import { WorkflowEngine } from '@/lib/workflow';

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
  vehicleMode?: 'owned' | 'institutional' | 'rent';
  preferredVehicleId?: string | null;
  preferredDriverId?: string | null;
}

// Preferred Vehicle & Driver Section Component
function PreferredVehicleDriverSection({
  preferredVehicleId,
  preferredDriverId,
  onVehicleChange,
  onDriverChange,
}: {
  preferredVehicleId: string | null | undefined;
  preferredDriverId: string | null | undefined;
  onVehicleChange: (vehicleId: string | null) => void;
  onDriverChange: (driverId: string | null) => void;
}) {
  const { vehicles, isLoading: vehiclesLoading } = useVehicles({ available: true });
  const { data: drivers, isLoading: driversLoading } = useDrivers({ status: 'active' });
  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [driverModalVisible, setDriverModalVisible] = useState(false);

  const selectedVehicle = vehicles?.find(v => v.id === preferredVehicleId);
  const selectedDriver = drivers?.find(d => d.id === preferredDriverId);

  return (
    <>
      <View style={styles.preferredSection}>
        <View style={styles.row}>
          <View style={styles.halfWidth}>
            <Text style={styles.label}>Preferred Driver (Optional)</Text>
            {driversLoading ? (
              <ActivityIndicator size="small" color="#7A0010" style={{ marginTop: 8 }} />
            ) : (
              <View style={styles.selectContainer}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setDriverModalVisible(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {selectedDriver?.name || 'Select driver...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={styles.halfWidth}>
            <Text style={styles.label}>Preferred Vehicle (Optional)</Text>
            {vehiclesLoading ? (
              <ActivityIndicator size="small" color="#7A0010" style={{ marginTop: 8 }} />
            ) : (
              <View style={styles.selectContainer}>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => setVehicleModalVisible(true)}
                >
                  <Text style={styles.selectButtonText}>
                    {selectedVehicle
                      ? `${selectedVehicle.vehicle_name} • ${selectedVehicle.plate_number}`
                      : 'Select vehicle...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Vehicle Selection Modal */}
      <VehicleDriverSelection
        visible={vehicleModalVisible}
        onClose={() => setVehicleModalVisible(false)}
        type="vehicle"
        selectedId={preferredVehicleId || null}
        onSelect={(id) => {
          onVehicleChange(id);
          setVehicleModalVisible(false);
        }}
      />

      {/* Driver Selection Modal */}
      <VehicleDriverSelection
        visible={driverModalVisible}
        onClose={() => setDriverModalVisible(false)}
        type="driver"
        selectedId={preferredDriverId || null}
        onSelect={(id) => {
          onDriverChange(id);
          setDriverModalVisible(false);
        }}
      />
    </>
  );
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
  const errorAnimations = useRef<Record<string, Animated.Value>>({});
  
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
    costs: {
      food: 1000, // Prefilled default
      driversAllowance: 500, // Prefilled default
    },
    requesterSignature: '',
    endorsedByHeadName: '',
    endorsedByHeadDate: '',
    endorsedByHeadSignature: '',
    requesterContactNumber: '',
    pickupPreference: null,
    vehicleMode: 'owned',
    preferredVehicleId: null,
    preferredDriverId: null,
  });

  // Pre-fill requesting person with current user on mount
  useEffect(() => {
    if (profile?.name && !formData.requestingPerson) {
      setFormData(prev => ({ ...prev, requestingPerson: profile.name }));
    }
  }, [profile]);

  // Auto-fill removed - form starts empty

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
    if (!departmentId) {
      setRequestingPersonHeadName('');
      return;
    }

    // Minimal retry logic - only 1 retry to prevent request storms
    const maxRetries = 1;
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data: heads, error } = await supabase
          .from('users')
          .select('name')
          .eq('role', 'head')
          .eq('department_id', departmentId)
          .eq('status', 'active')
          .limit(1);

        if (error) {
          // Check if it's an abort error - don't retry, just fail silently
          if (error.message?.includes('Aborted') || error.message?.includes('abort') || error.name === 'AbortError') {
            // Abort errors are usually from timeouts or component unmounts - don't log as error
            if (__DEV__) {
              console.log('[fetchDepartmentHead] Request aborted (likely timeout or component unmount)');
            }
            return;
          }
          throw error;
        }

        if (heads && heads.length > 0) {
          const headName = heads[0].name || '';
          setRequestingPersonHeadName(headName);
          if (!formData.endorsedByHeadName) {
            setFormData(prev => ({ ...prev, endorsedByHeadName: headName }));
          }
        } else {
          setRequestingPersonHeadName('');
        }
        return; // Success, exit retry loop
      } catch (error: any) {
        lastError = error;
        
        // Don't retry on abort errors
        if (error.message?.includes('Aborted') || error.message?.includes('abort') || error.name === 'AbortError') {
          if (__DEV__) {
            console.log('[fetchDepartmentHead] Request aborted');
          }
          return;
        }

        // Don't retry on network/timeout errors - they indicate Supabase is overloaded
        // Retrying would make it worse
        if (error.message?.includes('network') || 
            error.message?.includes('fetch') ||
            error.message?.includes('timeout') ||
            error.message?.includes('upstream')) {
          // These indicate server/network issues - don't retry, just fail
          if (__DEV__) {
            console.log('[fetchDepartmentHead] Network/server error - not retrying to prevent request storms');
          }
          return;
        }
        
        // Only retry on transient database errors (very rare)
        if (attempt < maxRetries && error.code?.startsWith('57')) {
          // PostgreSQL connection errors - wait briefly before retry
          await new Promise(resolve => setTimeout(resolve, 300));
          continue;
        }

        // Log only meaningful errors (not aborts)
        if (__DEV__ && error.message && !error.message.includes('Aborted')) {
          console.warn(`[fetchDepartmentHead] Error fetching department head (attempt ${attempt}/${maxRetries}):`, {
            message: error.message,
            code: error.code,
          });
        }
      }
    }

    // If all retries failed, set empty and log final error
    setRequestingPersonHeadName('');
    if (lastError && __DEV__ && lastError.message && !lastError.message.includes('Aborted')) {
      console.warn('[fetchDepartmentHead] Failed after retries:', {
        message: lastError.message,
        code: lastError.code,
      });
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

  // Get next approver text based on routing logic
  const getNextApproverText = (): string => {
    if (isRepresentativeSubmission && formData.requestingPerson) {
      return `Send to ${formData.requestingPerson}`;
    }
    
    const requesterIsHead = requestingPersonIsHead ?? false;
    // For head users, just show "Forward" with suggestions
    if (requesterIsHead) {
      return 'Forward';
    }
    
    const vehicleMode = formData.vehicleMode || 'owned';
    return `Forward to ${WorkflowEngine.getFirstReceiver(requesterIsHead, vehicleMode as 'owned' | 'institutional' | 'rent')}`;
  };

  // Get routing suggestion text
  const getRoutingSuggestion = (): string | null => {
    const hasBudget = (formData.costs?.food || 0) + 
                     (formData.costs?.driversAllowance || 0) + 
                     (formData.costs?.rentVehicles || 0) + 
                     (formData.costs?.hiredDrivers || 0) + 
                     (formData.costs?.accommodation || 0) > 0;
    const needsVehicle = formData.vehicleMode === 'institutional' || formData.vehicleMode === 'rent';
    const requesterIsHead = requestingPersonIsHead ?? false;
    
    return WorkflowEngine.getRoutingSuggestion(hasBudget, needsVehicle, requesterIsHead);
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

    // Validate vehicle mode
    if (!formData.vehicleMode) {
      newErrors['travelOrder.vehicleMode'] = 'Vehicle mode is required';
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

    // Contact number validation - REQUIRED for institutional vehicle, optional otherwise
    if (formData.vehicleMode === 'institutional') {
      if (!formData.requesterContactNumber || !formData.requesterContactNumber.trim()) {
        newErrors['travelOrder.requesterContactNumber'] = 'Contact number is required for institutional vehicle requests';
      } else {
        const phone = formData.requesterContactNumber.trim();
        const philippinesPhoneRegex = /^(\+63|0)?9\d{9}$/;
        const cleanPhone = phone.replace(/[\s-]/g, '');
        
        if (!philippinesPhoneRegex.test(cleanPhone) && !cleanPhone.startsWith('+63') && !cleanPhone.startsWith('09')) {
          newErrors['travelOrder.requesterContactNumber'] = 'Please enter a valid Philippines phone number (+63XXXXXXXXXX or 09XXXXXXXXX)';
        }
      }
    } else if (formData.requesterContactNumber && formData.requesterContactNumber.trim()) {
      // Optional validation if provided for owned/rent
      const phone = formData.requesterContactNumber.trim();
      const philippinesPhoneRegex = /^(\+63|0)?9\d{9}$/;
      const cleanPhone = phone.replace(/[\s-]/g, '');
      
      if (!philippinesPhoneRegex.test(cleanPhone) && !cleanPhone.startsWith('+63') && !cleanPhone.startsWith('09')) {
        newErrors['travelOrder.requesterContactNumber'] = 'Please enter a valid Philippines phone number (+63XXXXXXXXXX or 09XXXXXXXXX)';
      }
    }

    setErrors(newErrors);
    
    // Animate error fields
    Object.keys(newErrors).forEach((errorKey) => {
      if (!errorAnimations.current[errorKey]) {
        errorAnimations.current[errorKey] = new Animated.Value(0);
      }
      // Start pulsing animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(errorAnimations.current[errorKey], {
            toValue: 1,
            duration: 800,
            useNativeDriver: false,
          }),
          Animated.timing(errorAnimations.current[errorKey], {
            toValue: 0,
            duration: 800,
            useNativeDriver: false,
          }),
        ])
      ).start();
    });
    
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
        // Search for requesting person - improved search with multiple attempts
        const searchName = formData.requestingPerson.trim();
        let matchedUser: any = null;
        
        // Try multiple search strategies
        // 1. Exact match (case-insensitive)
        let { data: users } = await supabase
          .from('users')
          .select('id, name, is_head, role, department_id')
          .ilike('name', `%${searchName}%`)
          .eq('status', 'active')
          .limit(20); // Increase limit to find more matches

        if (users && users.length > 0) {
          // Try exact match first
          matchedUser = users.find(u => 
            u.name?.toLowerCase().trim() === searchName.toLowerCase().trim()
          );
          
          // If no exact match, try partial match (first name + last name)
          if (!matchedUser) {
            const nameParts = searchName.toLowerCase().split(/\s+/).filter(p => p.length > 2);
            matchedUser = users.find(u => {
              const uName = u.name?.toLowerCase() || '';
              return nameParts.every(part => uName.includes(part));
            });
          }
          
          // If still no match, try first or last name match
          if (!matchedUser && nameParts.length > 0) {
            matchedUser = users.find(u => {
              const uName = u.name?.toLowerCase() || '';
              return nameParts.some(part => uName.includes(part));
            });
          }
          
          // Fallback to first result
          if (!matchedUser) {
            matchedUser = users[0];
          }
        }
        
        // If still not found, try without status filter (RLS might be blocking)
        if (!matchedUser) {
          const { data: allUsers } = await supabase
            .from('users')
            .select('id, name, is_head, role, department_id')
            .ilike('name', `%${searchName}%`)
            .limit(20);
          
          if (allUsers && allUsers.length > 0) {
            matchedUser = allUsers.find(u => 
              u.name?.toLowerCase().trim() === searchName.toLowerCase().trim()
            ) || allUsers[0];
          }
        }

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
            `Cannot find user "${formData.requestingPerson}" in the system. Please check the spelling or select from the dropdown.`
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
      const vehicleMode = formData.vehicleMode || 'owned';
      let initialStatus: string;
      
      if (status === 'draft') {
        initialStatus = 'draft';
      } else {
        initialStatus = WorkflowEngine.getInitialStatus(
          requesterIsHead,
          vehicleMode,
          hasBudget,
          isRepresentativeSubmission
        );
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
      // Note: request_number is NOT set - let the database trigger generate it
      
      const requestData: any = {
        request_type: 'travel_order',
        // DO NOT include request_number - let database generate it
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
        vehicle_mode: formData.vehicleMode || 'owned',
        needs_vehicle: formData.vehicleMode === 'institutional' || formData.vehicleMode === 'rent',
        preferred_vehicle_id: formData.preferredVehicleId || null,
        preferred_driver_id: formData.preferredDriverId || null,
        status: initialStatus,
        current_approver_role: 
          initialStatus === 'pending_head' || initialStatus === 'pending_requester_signature' ? 'head' :
          initialStatus === 'pending_admin' ? 'admin' :
          initialStatus === 'pending_comptroller' ? 'comptroller' :
          initialStatus === 'pending_hr' ? 'hr' :
          initialStatus === 'pending_vp' ? 'vp' :
          initialStatus === 'pending_president' ? 'president' :
          initialStatus === 'pending_exec' ? 'exec' : null,
        head_signature: requesterIsHead ? null : (formData.endorsedByHeadSignature || null),
        requester_contact_number: formData.requesterContactNumber || null,
        pickup_preference: formData.pickupPreference || null,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
      };

      // Insert request - EXPLICITLY set request_number to NULL so the database trigger generates it
      // The trigger checks "IF NEW.request_number IS NULL" so we MUST set it to null explicitly
      const insertData: any = {
        ...requestData,
        request_number: null, // EXPLICITLY set to null to trigger database generation
      };
      
      console.log('[TravelOrder] Inserting request with request_number explicitly set to NULL for database trigger');
      
      const maxRetries = 8; // Increased retries
      let request: any = null;
      let insertError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Add exponential backoff delay between retries
          if (attempt > 1) {
            const baseDelay = 1000 * Math.pow(2, attempt - 2); // 1000ms, 2000ms, 4000ms, etc.
            const jitter = Math.random() * 300; // 0-300ms random jitter
            const delay = baseDelay + jitter;
            console.log(`[TravelOrder] Retry attempt ${attempt}, waiting ${Math.round(delay)}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }

          const { data, error } = await supabase
            .from('requests')
            .insert(insertData)
            .select()
            .single();

          if (!error && data) {
            console.log(`✅ Request created successfully on attempt ${attempt}:`, data.request_number);
            request = data;
            insertError = null;
            break;
          }
          
          // Log error details for debugging
          if (error) {
            console.warn(`[TravelOrder] Insert error on attempt ${attempt}:`, {
              code: error.code,
              message: error.message?.substring(0, 100),
              isDuplicate: error.code === '23505',
            });
          }

          // Only retry for duplicate key errors (race condition), not for network/abort errors
          const isAbortError = error.message?.includes('Aborted') || error.message?.includes('abort') || error.name === 'AbortError';
          const isTimeoutError = error.message?.includes('timeout') || error.message?.includes('Timeout');
          
          // Don't retry on abort/timeout - these indicate network issues, not server issues
          if (isAbortError || isTimeoutError) {
            insertError = error;
            break;
          }

          // Check if it's a duplicate key error on request_number
          const isDuplicateKey = error.code === '23505' && (
            error.message?.includes('request_number') || 
            error.message?.includes('requests_request_number_key') ||
            error.details?.includes('request_number') ||
            error.hint?.includes('request_number')
          );

          // If it's a duplicate key error, retry with minimal delay
          // PostgreSQL sequences are atomic, so this should be rare
          if (isDuplicateKey && attempt < maxRetries) {
            console.warn(`🔄 Duplicate request number detected on attempt ${attempt}/${maxRetries}, retrying...`);
            // Minimal delay - sequences are atomic, just need a tiny gap
            const delay = 100 + Math.random() * 200; // 100-300ms
            await new Promise(resolve => setTimeout(resolve, delay));
            // Ensure request_number is explicitly null for retry
            insertData.request_number = null;
            continue;
          }

          // For other errors or final attempt, break and throw
          insertError = error;
          break;
        } catch (err: any) {
          // Catch any unexpected errors during insert
          insertError = err;
          break;
        }
      }

      if (insertError || !request) {
        console.error('Request submission error after', maxRetries, 'attempts:', insertError);
        throw insertError || new Error('Failed to create request after retries');
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

      // Create notification for submitter (silently fail if RLS blocks it)
      try {
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
      } catch (notifError: any) {
        // Silently handle notification errors - not critical
        console.warn('[TravelOrder] Notification creation failed (non-critical):', notifError?.code);
      }

      // If representative submission, notify requester (silently fail if RLS blocks it)
      if (isRepresentativeSubmission && requesterId !== profile.id) {
        try {
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
        } catch (notifError: any) {
          // Silently handle notification errors - not critical
          console.warn('[TravelOrder] Notification creation failed (non-critical):', notifError?.code);
        }
      }

      // Notify next approver based on initial status
      console.log('[TravelOrder] Notification check:', {
        initialStatus,
        hasBudget,
        requestNumber: request.request_number,
        requestId: request.id,
        condition: initialStatus === 'pending_comptroller' && hasBudget,
      });
      
      try {
        const { notifyNextApprover } = await import('@/lib/notifications');
        
        if (initialStatus === 'pending_comptroller' && hasBudget) {
          console.log('[TravelOrder] Creating notifications for comptroller...');
          // Find ALL comptroller users and notify each one
          const { data: comptrollerUsers, error: comptrollerError } = await supabase
            .from('users')
            .select('id, name')
            .eq('is_comptroller', true)
            .eq('is_active', true);
          
          if (comptrollerError) {
            console.error('[TravelOrder] Error fetching comptrollers:', comptrollerError);
          } else if (comptrollerUsers && comptrollerUsers.length > 0) {
            console.log(`[TravelOrder] Found ${comptrollerUsers.length} comptroller(s) to notify:`, comptrollerUsers.map(u => ({ id: u.id, name: u.name })));
            // Notify all comptrollers
            const notificationPromises = comptrollerUsers.map(comptroller =>
              notifyNextApprover(
                comptroller.id,
                request.id,
                request.request_number || 'DRAFT',
                requesterName,
                'comptroller'
              ).catch(err => {
                console.error(`[TravelOrder] Failed to notify comptroller ${comptroller.id}:`, {
                  error: err,
                  message: err?.message,
                  code: err?.code,
                  stack: err?.stack?.substring(0, 200),
                });
                return false;
              })
            );
            
            const results = await Promise.all(notificationPromises);
            const successCount = results.filter(r => r === true).length;
            console.log(`[TravelOrder] Notification results:`, {
              total: results.length,
              success: successCount,
              failed: results.length - successCount,
              results: results,
            });
            if (successCount > 0) {
              console.log(`[TravelOrder] ✅ Notified ${successCount}/${comptrollerUsers.length} comptroller(s) for request ${request.request_number}`);
            } else {
              console.error(`[TravelOrder] ❌ Failed to notify any comptrollers for request ${request.request_number}`);
            }
          } else {
            console.warn('[TravelOrder] No active comptroller users found to notify');
          }
        } else if (initialStatus === 'pending_head') {
          // Find department head and notify
          if (departmentId) {
            const { data: headUsers, error: headError } = await supabase
              .from('users')
              .select('id, name')
              .eq('department_id', departmentId)
              .eq('is_head', true)
              .eq('is_active', true)
              .limit(1);
            
            if (headError) {
              console.error('[TravelOrder] Error fetching head:', headError);
            } else if (headUsers && headUsers.length > 0) {
              try {
                const success = await notifyNextApprover(
                  headUsers[0].id,
                  request.id,
                  request.request_number || 'DRAFT',
                  requesterName,
                  'head'
                );
                if (success) {
                  console.log(`[TravelOrder] ✅ Notified head ${headUsers[0].id} for request ${request.request_number}`);
                } else {
                  console.error(`[TravelOrder] ❌ Failed to notify head ${headUsers[0].id} for request ${request.request_number}`);
                }
              } catch (headNotifErr: any) {
                console.error('[TravelOrder] Exception notifying head:', {
                  error: headNotifErr,
                  message: headNotifErr?.message,
                  code: headNotifErr?.code,
                });
              }
            } else {
              console.warn('[TravelOrder] No active head users found in department', departmentId);
            }
          }
        } else if (initialStatus === 'pending_admin') {
          // Find admin users and notify
          const { data: adminUsers, error: adminError } = await supabase
            .from('users')
            .select('id, name')
            .eq('is_admin', true)
            .eq('is_active', true)
            .limit(5); // Notify up to 5 admins
          
          if (adminError) {
            console.error('[TravelOrder] Error fetching admins:', adminError);
          } else if (adminUsers && adminUsers.length > 0) {
            const notificationPromises = adminUsers.map(admin =>
              notifyNextApprover(
                admin.id,
                request.id,
                request.request_number || 'DRAFT',
                requesterName,
                'admin'
              ).catch(err => {
                console.error(`[TravelOrder] Failed to notify admin ${admin.id}:`, {
                  error: err,
                  message: err?.message,
                  code: err?.code,
                  stack: err?.stack?.substring(0, 200),
                });
                return false;
              })
            );
            
            const results = await Promise.all(notificationPromises);
            const successCount = results.filter(r => r === true).length;
            if (successCount > 0) {
              console.log(`[TravelOrder] ✅ Notified ${successCount}/${adminUsers.length} admin(s) for request ${request.request_number}`);
            } else {
              console.error(`[TravelOrder] ❌ Failed to notify any admins for request ${request.request_number}`);
            }
          } else {
            console.warn('[TravelOrder] No active admin users found to notify');
          }
        }
      } catch (notifError: any) {
        // Log full error details for debugging
        console.error('[TravelOrder] Next approver notification failed:', {
          error: notifError,
          message: notifError?.message,
          code: notifError?.code,
          stack: notifError?.stack?.substring(0, 200),
          initialStatus,
          hasBudget,
          requestNumber: request.request_number,
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
      // Log error details without triggering Expo's error overlay
      const errorDetails = {
        code: error.code,
        message: error.message,
        details: error.details,
      };
      console.warn('Request submission error:', errorDetails);
      
      // Handle specific error types with empathetic messages
      let errorMessage = 'We encountered an issue while submitting your request.';
      let errorTitle = 'Submission Failed';
      let showRetry = false;
      
      if (error.code === '23505') {
        // Duplicate key error (likely request_number)
        errorTitle = 'Submission Conflict';
        errorMessage = 'A request with the same number already exists. Please try again - the system will generate a new request number.';
        showRetry = true;
      } else if (error.code === '23503') {
        // Foreign key constraint
        errorTitle = 'Invalid Information';
        errorMessage = 'Some of the information provided is not valid. Please check your selections and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorTitle = 'Connection Error';
        errorMessage = 'We couldn\'t connect to the server. Please check your internet connection and try again.';
        showRetry = true;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Show error with retry option if applicable
      Alert.alert(
        errorTitle,
        errorMessage,
        showRetry
          ? [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Retry', 
                style: 'default',
                onPress: () => {
                  // Retry submission after a short delay
                  setTimeout(() => {
                    handleSubmit(status);
                  }, 500);
                }
              }
            ]
          : [{ text: 'OK', style: 'default' }]
      );
      
      // Scroll to first error field if validation errors exist
      if (Object.keys(errors).length > 0) {
        const firstErrorKey = Object.keys(errors)[0];
        // Trigger scroll to error field
        setTimeout(() => {
          // This will be handled by the validation summary modal
        }, 100);
      }
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
          bounces={false}
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
                    // Add randomization to prevent identical submissions
                    const today = new Date();
                    const randomDaysAhead = Math.floor(Math.random() * 30) + 1; // 1-30 days ahead
                    const randomDuration = Math.floor(Math.random() * 7) + 1; // 1-7 days duration
                    
                    const departureDate = new Date(today);
                    departureDate.setDate(departureDate.getDate() + randomDaysAhead);
                    
                    const returnDate = new Date(departureDate);
                    returnDate.setDate(returnDate.getDate() + randomDuration);
                    
                    // Random destinations to prevent identical submissions
                    const destinations = [
                      'Manila, Philippines',
                      'Makati, Philippines',
                      'Quezon City, Philippines',
                      'Pasig, Philippines',
                      'Baguio, Philippines',
                      'Cebu, Philippines',
                      'Davao, Philippines',
                      'Iloilo, Philippines',
                    ];
                    const randomDestination = destinations[Math.floor(Math.random() * destinations.length)];
                    
                    // Random purpose variations
                    const purposes = [
                      'Business travel',
                      'Official business',
                      'Work-related travel',
                      'Academic conference',
                      'Training session',
                      'Coordination meeting',
                      'Field research',
                      'Site visit',
                    ];
                    const randomPurpose = purposes[Math.floor(Math.random() * purposes.length)];
                    
                    // Add random milliseconds to make each submission unique
                    const randomSuffix = Math.floor(Math.random() * 1000);
                    
                    handleTravelOrderChange({
                      date: today.toISOString().split('T')[0],
                      requestingPerson: profile.name || '',
                      department: profile.department ? `${profile.department.name}${profile.department.code ? ` (${profile.department.code})` : ''}` : '',
                      destination: randomDestination,
                      departureDate: departureDate.toISOString().split('T')[0],
                      returnDate: returnDate.toISOString().split('T')[0],
                      purposeOfTravel: `${randomPurpose} ${randomSuffix > 500 ? '(Ref: ' + randomSuffix + ')' : ''}`.trim(),
                      requesterContactNumber: profile.phone_number || '',
                    });
                    Alert.alert('Form Filled', 'All required fields have been filled with randomized sample data. Please review and adjust as needed.');
                  }
                }}
              >
                <Ionicons name="person-add" size={16} color="#7A0010" />
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
                  showMapPreview={true}
                />
              </View>

              {/* Vehicle Mode Selection */}
              <View style={styles.fullWidth}>
                <Text style={styles.label}>
                  Vehicle Mode <Text style={styles.required}>*</Text>
                </Text>
                <Text style={styles.helperText}>
                  Select how you will travel to your destination
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
                      name="car-outline"
                      size={24}
                      color={formData.vehicleMode === 'owned' ? '#7A0010' : '#6b7280'}
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
                      name="school-outline"
                      size={24}
                      color={formData.vehicleMode === 'institutional' ? '#7A0010' : '#6b7280'}
                    />
                    <Text
                      style={[
                        styles.vehicleModeText,
                        formData.vehicleMode === 'institutional' && styles.vehicleModeTextActive,
                      ]}
                    >
                      Institutional
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
                      name="car-sport-outline"
                      size={24}
                      color={formData.vehicleMode === 'rent' ? '#7A0010' : '#6b7280'}
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
                {errors['travelOrder.vehicleMode'] && (
                  <Text style={styles.errorText}>{errors['travelOrder.vehicleMode']}</Text>
                )}
              </View>

              {/* Preferred Vehicle & Driver - Only show for institutional or rent */}
              {(formData.vehicleMode === 'institutional' || formData.vehicleMode === 'rent') && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Preferred Vehicle & Driver</Text>
                  <Text style={styles.helperText}>
                    Suggest your preferred driver and vehicle (optional). The Transportation Coordinator will make the final assignment.
                  </Text>
                  <PreferredVehicleDriverSection
                    preferredVehicleId={formData.preferredVehicleId}
                    preferredDriverId={formData.preferredDriverId}
                    onVehicleChange={(vehicleId) => handleTravelOrderChange({ preferredVehicleId: vehicleId })}
                    onDriverChange={(driverId) => handleTravelOrderChange({ preferredDriverId: driverId })}
                  />
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
                Contact Number for Driver/Coordination 
                {formData.vehicleMode === 'institutional' ? (
                  <Text style={styles.required}> *</Text>
                ) : (
                  <Text style={styles.optional}> (Optional)</Text>
                )}
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
                    <HeadSearchableSelect
                      value={isRepresentativeSubmission && requestingPersonHeadName 
                        ? requestingPersonHeadName 
                        : (formData.endorsedByHeadName || '')}
                      onChange={(headName) => handleTravelOrderChange({ endorsedByHeadName: headName })}
                      placeholder="Search department head..."
                      label="Endorsed by"
                      required
                      error={errors['travelOrder.endorsedByHeadName']}
                      disabled={isRepresentativeSubmission && !!requestingPersonHeadName}
                      departmentId={profile?.department_id || null}
                    />
                  </View>

                  <View style={styles.endorsementField}>
                    <Text style={styles.endorsementLabel}>
                      Endorsement Date <Text style={styles.required}>*</Text>
                    </Text>
                    <DateInput
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
                    onSave={(dataUrl) => handleTravelOrderChange({ endorsedByHeadSignature: dataUrl || '' })}
                    onClear={() => handleTravelOrderChange({ endorsedByHeadSignature: '' })}
                    hideSaveButton
                    onDrawingStart={() => setScrollEnabled(false)}
                    onDrawingEnd={() => setScrollEnabled(true)}
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
                    <Ionicons name="send-outline" size={20} color="#fff" />
                    <Text style={styles.submitButtonText}>{getNextApproverText()}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
            
            {/* Smart Routing Suggestions */}
            {(() => {
              const suggestion = getRoutingSuggestion();
              const hasBudget = (formData.costs?.food || 0) + 
                               (formData.costs?.driversAllowance || 0) + 
                               (formData.costs?.rentVehicles || 0) + 
                               (formData.costs?.hiredDrivers || 0) + 
                               (formData.costs?.accommodation || 0) > 0;
              const needsVehicle = formData.vehicleMode === 'institutional' || formData.vehicleMode === 'rent';
              const requesterIsHead = requestingPersonIsHead ?? false;
              
              // Show routing path preview - accurate workflow
              const totalBudget = (formData.costs?.food || 0) + 
                                 (formData.costs?.driversAllowance || 0) + 
                                 (formData.costs?.rentVehicles || 0) + 
                                 (formData.costs?.hiredDrivers || 0) + 
                                 (formData.costs?.accommodation || 0);
              
              if (requesterIsHead) {
                // Head request routing
                const routingPath = [];
                if (needsVehicle) {
                  routingPath.push('Transportation Coordinator');
                }
                if (hasBudget) {
                  routingPath.push('Comptroller');
                }
                routingPath.push('HR');
                routingPath.push('VP');
                routingPath.push('President'); // Heads always go to President
                
                return (
                  <View style={styles.routingPathContainer}>
                    <View style={styles.routingPathHeader}>
                      <Ionicons name="route-outline" size={16} color="#7a0019" />
                      <Text style={styles.routingPathTitle}>Routing Path (Head Request)</Text>
                    </View>
                    <View style={styles.routingPathList}>
                      {routingPath.map((step, index) => (
                        <View key={index} style={styles.routingPathItem}>
                          <View style={styles.routingPathNumber}>
                            <Text style={styles.routingPathNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.routingPathStep}>{step}</Text>
                          {index < routingPath.length - 1 && (
                            <Ionicons name="arrow-down" size={16} color="#9ca3af" style={styles.routingPathArrow} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              } else if (!suggestion) {
                // Faculty request routing
                const routingPath = [];
                routingPath.push('Department Head');
                // Check if has parent department (would show parent head, but we don't have that info here)
                // Transportation Coordinator comes after head approval (if vehicle needed)
                if (needsVehicle) {
                  routingPath.push('Transportation Coordinator');
                }
                // Comptroller only if has budget
                if (hasBudget) {
                  routingPath.push('Comptroller');
                }
                routingPath.push('HR');
                routingPath.push('VP');
                // President if budget > 15k for faculty
                if (totalBudget > 15000) {
                  routingPath.push('President');
                }
                
                return (
                  <View style={styles.routingPathContainer}>
                    <View style={styles.routingPathHeader}>
                      <Ionicons name="route-outline" size={16} color="#7a0019" />
                      <Text style={styles.routingPathTitle}>Routing Path</Text>
                    </View>
                    <View style={styles.routingPathList}>
                      {routingPath.map((step, index) => (
                        <View key={index} style={styles.routingPathItem}>
                          <View style={styles.routingPathNumber}>
                            <Text style={styles.routingPathNumberText}>{index + 1}</Text>
                          </View>
                          <Text style={styles.routingPathStep}>{step}</Text>
                          {index < routingPath.length - 1 && (
                            <Ionicons name="arrow-down" size={16} color="#9ca3af" style={styles.routingPathArrow} />
                          )}
                        </View>
                      ))}
                    </View>
                  </View>
                );
              }
              
              if (suggestion) {
                return (
                  <View style={styles.routingSuggestion}>
                    <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
                    <Text style={styles.routingSuggestionText}>{suggestion}</Text>
                  </View>
                );
              }
              
              return null;
            })()}
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
    overflow: 'hidden',
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
    color: '#7A0010',
  },
  fillCurrentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#7A0010',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexShrink: 0,
  },
  fillCurrentButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A0010',
  },
  section: {
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
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
    borderWidth: 2,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
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
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
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
    alignSelf: 'flex-start',
    marginTop: 4,
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
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  endorsementHeader: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#d1d5db',
  },
  endorsementTitle: {
    fontSize: 20,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  endorsementInput: {
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    height: 50,
    minHeight: 50,
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
    backgroundColor: '#7A0010',
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
  vehicleModeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  vehicleModeOption: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 8,
    minHeight: 100,
  },
  vehicleModeOptionActive: {
    borderColor: '#7A0010',
    backgroundColor: '#fef2f2',
  },
  vehicleModeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    textAlign: 'center',
  },
  vehicleModeTextActive: {
    color: '#7A0010',
  },
  preferredSection: {
    marginTop: 8,
  },
  selectContainer: {
    marginTop: 8,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#fff',
    minHeight: 48,
  },
  selectButtonText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  routingSuggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb',
  },
  routingSuggestionText: {
    fontSize: 13,
    color: '#1e40af',
    fontWeight: '500',
    flex: 1,
  },
  routingPathContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  routingPathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  routingPathTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  routingPathList: {
    gap: 8,
  },
  routingPathItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  routingPathNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7a0019',
    justifyContent: 'center',
    alignItems: 'center',
  },
  routingPathNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  routingPathStep: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  routingPathArrow: {
    marginLeft: 'auto',
  },
});
