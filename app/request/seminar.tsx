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
  Switch,
  Image,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useDepartments } from '@/hooks/useDepartments';
import { supabase } from '@/lib/supabase/client';
import NavigationHeader from '@/components/NavigationHeader';
import CustomTabBar from '@/components/CustomTabBar';
import DateInput from '@/components/DateInput';
import DepartmentSelect from '@/components/DepartmentSelect';
import LocationField from '@/components/LocationField';
import CurrencyInput from '@/components/CurrencyInput';
import SignaturePad from '@/components/SignaturePad';
import SidebarMenu from '@/components/SidebarMenu';
import FileAttachmentPicker, { AttachmentFile } from '@/components/FileAttachmentPicker';
import { uploadFilesToStorage } from '@/lib/storage';

// Types matching web exactly
interface BreakdownItem {
  label: string;
  amount: number | null;
  description?: string;
}

interface Applicant {
  name: string;
  department: string;
  availableFdp?: number | null;
  signature?: string | null;
  email?: string;
  invitationId?: string;
}

interface ParticipantInvitation {
  email: string;
  name?: string;
  department?: string;
  availableFdp?: number | null;
  status?: 'pending' | 'confirmed' | 'declined';
  invitationId?: string;
}

interface SeminarData {
  applicationDate: string;
  title: string;
  dateFrom: string;
  dateTo: string;
  typeOfTraining: string[]; // ['Compliance'] or ['Professional Development']
  trainingCategory: string;
  sponsor: string;
  venue: string;
  venueGeo?: { lat: number; lng: number } | null;
  modality: string;
  registrationCost: number | null;
  totalAmount: number | null;
  breakdown: BreakdownItem[];
  makeUpClassSchedule: string;
  applicantUndertaking: boolean;
  fundReleaseLine: number | null;
  requesterSignature?: string;
  applicants: Applicant[];
  participantInvitations: ParticipantInvitation[];
  allParticipantsConfirmed: boolean;
  requesterContactNumber?: string;
}

const TRAINING_TYPES = ['Compliance', 'Professional Development'] as const;
const MODALITY_OPTIONS = ['Onsite', 'Online', 'Hybrid'] as const;
const TRAINING_CATEGORIES = [
  { label: 'Local', value: 'local' },
  { label: 'Regional', value: 'regional' },
  { label: 'National', value: 'national' },
  { label: 'International', value: 'international' },
];

function asNum(v: string): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function computeDays(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const a = new Date(from);
  const b = new Date(to);
  if (isNaN(a.valueOf()) || isNaN(b.valueOf())) return null;
  const ms =
    Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
    Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const diff = Math.floor(ms / 86400000) + 1;
  return diff >= 1 ? diff : null;
}

export default function SeminarScreen() {
  const { profile, user } = useAuth();
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [scrollEnabled, setScrollEnabled] = useState(true);

  const [formData, setFormData] = useState<SeminarData>({
    applicationDate: new Date().toISOString().split('T')[0],
    title: '',
    dateFrom: '',
    dateTo: '',
    typeOfTraining: [],
    trainingCategory: '',
    sponsor: '',
    venue: '',
    modality: 'Onsite',
    registrationCost: null,
    totalAmount: null,
    breakdown: [],
    makeUpClassSchedule: '',
    applicantUndertaking: false,
    fundReleaseLine: null,
    requesterSignature: '',
    applicants: [],
    participantInvitations: [],
    allParticipantsConfirmed: false,
    requesterContactNumber: '',
  });

  // Auto-calculate days
  const calculatedDays = useMemo(() => {
    return computeDays(formData.dateFrom, formData.dateTo);
  }, [formData.dateFrom, formData.dateTo]);

  const handleChange = (patch: Partial<SeminarData>) => {
    setFormData((prev) => ({ ...prev, ...patch }));
    // Clear errors for changed fields
    Object.keys(patch).forEach((key) => {
      if (errors[`seminar.${key}`]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[`seminar.${key}`];
          return next;
        });
      }
    });
  };

  // Validation matching web exactly
  const validateForm = (): { ok: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (!formData.applicationDate?.trim()) {
      newErrors['seminar.applicationDate'] = 'Application date is required';
    }

    if (!formData.title?.trim()) {
      newErrors['seminar.title'] = 'Seminar title is required';
    }

    if (!formData.dateFrom?.trim()) {
      newErrors['seminar.dateFrom'] = 'Departure date is required';
    } else {
      const departureDate = new Date(formData.dateFrom);
      departureDate.setHours(0, 0, 0, 0);
      if (departureDate < today) {
        newErrors['seminar.dateFrom'] = 'Departure date cannot be in the past';
      }
    }

    if (!formData.dateTo?.trim()) {
      newErrors['seminar.dateTo'] = 'End date is required';
    } else {
      const endDate = new Date(formData.dateTo);
      endDate.setHours(0, 0, 0, 0);
      if (endDate < today) {
        newErrors['seminar.dateTo'] = 'End date cannot be in the past';
      }
      if (formData.dateFrom) {
        const departureDate = new Date(formData.dateFrom);
        departureDate.setHours(0, 0, 0, 0);
        if (endDate < departureDate) {
          newErrors['seminar.dateTo'] = 'End date must be on or after the departure date';
        }
      }
    }

    if (formData.typeOfTraining.length === 0) {
      newErrors['seminar.typeOfTraining'] = 'Type of training is required';
    }

    if (!formData.venue?.trim()) {
      newErrors['seminar.venue'] = 'Venue is required';
    }

    if (!formData.modality?.trim()) {
      newErrors['seminar.modality'] = 'Modality is required';
    }

    // Applicants validation
    if (formData.applicants.length === 0) {
      newErrors['seminar.applicants'] = 'At least one applicant is required';
    }

    // Signature validation
    const hasSignature =
      formData.requesterSignature &&
      formData.requesterSignature.startsWith('data:image') &&
      formData.requesterSignature.length > 3000;

    if (!hasSignature) {
      newErrors['seminar.requesterSignature'] = "Organizer's signature is required";
    }

    // Contact number validation (if provided, must be valid format)
    if (formData.requesterContactNumber && formData.requesterContactNumber.trim()) {
      const phone = formData.requesterContactNumber.trim();
      const philippinesPhoneRegex = /^(\+63|0)?9\d{9}$/;
      const cleanPhone = phone.replace(/[\s-]/g, '');
      
      if (!philippinesPhoneRegex.test(cleanPhone) && !cleanPhone.startsWith('+63') && !cleanPhone.startsWith('09')) {
        newErrors['seminar.requesterContactNumber'] = 'Please enter a valid Philippines phone number (+63XXXXXXXXXX or 09XXXXXXXXX)';
      }
    }

    setErrors(newErrors);
    return { ok: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  // Submission matching web API exactly
  const handleSubmit = async (status: 'draft' | 'submitted' = 'submitted') => {
    if (status === 'submitted') {
      const validation = validateForm();
      if (!validation.ok) {
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
      // Get department ID from profile (seminar uses organizer's department)
      const departmentId = profile.department_id;

      if (!departmentId && status === 'submitted') {
        Alert.alert('Error', 'Department not found. Please contact support.');
        setSubmitting(false);
        return;
      }

      // Calculate expense breakdown from breakdown array
      const expenseBreakdown = formData.breakdown
        .filter((item) => item.amount && item.amount > 0)
        .map((item) => ({
          item: item.label || 'Other',
          amount: Number(item.amount),
          description: item.description || item.label || 'Miscellaneous',
        }));

      const totalBudget = expenseBreakdown.reduce((sum, item) => sum + item.amount, 0);
      const hasBudget = totalBudget > 0 || (formData.registrationCost || 0) > 0 || (formData.totalAmount || 0) > 0;

      // Upload attachments if any
      let uploadedAttachments: any[] = [];
      if (attachments.length > 0 && status === 'submitted') {
        try {
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
        }
      }

      // Determine initial status using workflow engine logic
      const requesterIsHead = profile.is_head || false;
      let initialStatus: string;

      if (status === 'draft') {
        initialStatus = 'draft';
      } else if (requesterIsHead) {
        initialStatus = 'pending_admin';
      } else {
        initialStatus = 'pending_head';
      }

      // Check if head is included in applicants
      const headIncluded =
        formData.applicants.some((app) => {
          // Check if any applicant might be a head (would need to check database)
          return false; // Simplified for now
        }) || requesterIsHead;

      // Build request data matching web API exactly
      const requestData: any = {
        request_type: 'seminar',
        title: formData.title || 'Seminar Application',
        purpose: formData.title || 'Seminar Application',
        destination: formData.venue || 'TBD',
        travel_start_date: formData.dateFrom || new Date().toISOString(),
        travel_end_date: formData.dateTo || formData.dateFrom || new Date().toISOString(),
        requester_id: profile.id,
        requester_name: profile.name || '',
        requester_signature: formData.requesterSignature || null,
        requester_is_head: requesterIsHead,
        department_id: departmentId,
        submitted_by_user_id: profile.id,
        submitted_by_name: profile.name || '',
        is_representative: false,
        participants: formData.applicants.map((app) => ({
          name: app.name,
          department: app.department,
          available_fdp: app.availableFdp,
          signature: app.signature,
        })),
        head_included: headIncluded,
        has_budget: hasBudget,
        total_budget: totalBudget || formData.totalAmount || formData.registrationCost || 0,
        expense_breakdown: expenseBreakdown,
        cost_justification: null,
        vehicle_mode: 'none',
        needs_vehicle: false,
        status: initialStatus,
        current_approver_role:
          initialStatus === 'pending_head'
            ? 'head'
            : initialStatus === 'pending_admin'
              ? 'admin'
              : initialStatus === 'pending_hr'
                ? 'hr'
                : initialStatus === 'pending_exec'
                  ? 'exec'
                  : null,
        requester_contact_number: formData.requesterContactNumber || null,
        attachments: uploadedAttachments.length > 0 ? uploadedAttachments : null,
        // Seminar-specific data
        seminar_data: {
          applicationDate: formData.applicationDate || new Date().toISOString().split('T')[0],
          title: formData.title || '',
          dateFrom: formData.dateFrom || new Date().toISOString(),
          dateTo: formData.dateTo || new Date().toISOString(),
          typeOfTraining: formData.typeOfTraining || [],
          trainingCategory: formData.trainingCategory || '',
          sponsor: formData.sponsor || '',
          venue: formData.venue || '',
          venueGeo: formData.venueGeo || null,
          modality: formData.modality || 'Onsite',
          registrationCost: formData.registrationCost ?? null,
          totalAmount: formData.totalAmount ?? null,
          breakdown: formData.breakdown || [],
          makeUpClassSchedule: formData.makeUpClassSchedule || '',
          applicantUndertaking: formData.applicantUndertaking || false,
          fundReleaseLine: formData.fundReleaseLine ?? null,
          requesterSignature: formData.requesterSignature || null,
          applicants: formData.applicants || [],
          participantInvitations: formData.participantInvitations || [],
          allParticipantsConfirmed: formData.allParticipantsConfirmed || false,
        },
      };

      // Insert request - EXPLICITLY set request_number to NULL so the database trigger generates it
      // The trigger checks "IF NEW.request_number IS NULL" so we MUST set it to null explicitly
      const insertData: any = {
        ...requestData,
        request_number: null, // EXPLICITLY set to null to trigger database generation
      };
      
      console.log('[Seminar] Inserting request with request_number explicitly set to NULL for database trigger');
      
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
            console.log(`[Seminar] Retry attempt ${attempt}, waiting ${Math.round(delay)}ms...`);
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
            console.warn(`[Seminar] Insert error on attempt ${attempt}:`, {
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
        console.error('Seminar submission error after', maxRetries, 'attempts:', insertError);
        throw insertError || new Error('Failed to create request after retries');
      }

      // Create history entry
      await supabase.from('request_history').insert({
        request_id: request.id,
        action: 'created',
        actor_id: profile.id,
        actor_role: requesterIsHead ? 'head' : 'faculty',
        previous_status: null,
        new_status: initialStatus,
        comments: 'Seminar application created and submitted',
      });

      // Create notification for requester (silently fail if RLS blocks it)
      try {
        await supabase.from('notifications').insert({
          user_id: profile.id,
          notification_type: 'request_submitted',
          title: 'Seminar Application Submitted',
          message: `Your seminar application ${request.request_number || 'has been submitted'} and is now pending approval.`,
          related_type: 'request',
          related_id: request.id,
          action_url: `/request/${request.id}`,
          priority: 'normal',
        });
      } catch (notifError: any) {
        // Silently handle notification errors - not critical
        console.warn('[Seminar] Notification creation failed (non-critical):', notifError?.code);
      }

      // Notify next approver based on initial status
      try {
        const { notifyNextApprover } = await import('@/lib/notifications');
        
        if (initialStatus === 'pending_head') {
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
              console.error('[Seminar] Error fetching head:', headError);
            } else if (headUsers && headUsers.length > 0) {
              try {
                const success = await notifyNextApprover(
                  headUsers[0].id,
                  request.id,
                  request.request_number || 'DRAFT',
                  profile.name || 'Requester',
                  'head'
                );
                if (success) {
                  console.log(`[Seminar] ✅ Notified head ${headUsers[0].id} for request ${request.request_number}`);
                } else {
                  console.error(`[Seminar] ❌ Failed to notify head ${headUsers[0].id} for request ${request.request_number}`);
                }
              } catch (notifErr: any) {
                console.error('[Seminar] Exception notifying head:', {
                  error: notifErr,
                  message: notifErr?.message,
                  code: notifErr?.code,
                });
              }
            } else {
              console.warn('[Seminar] No active head users found in department', departmentId);
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
            console.error('[Seminar] Error fetching admins:', adminError);
          } else if (adminUsers && adminUsers.length > 0) {
            const notificationPromises = adminUsers.map(admin =>
              notifyNextApprover(
                admin.id,
                request.id,
                request.request_number || 'DRAFT',
                profile.name || 'Requester',
                'admin'
              ).catch(err => {
                console.error(`[Seminar] Failed to notify admin ${admin.id}:`, {
                  error: err,
                  message: err?.message,
                  code: err?.code,
                });
                return false;
              })
            );
            
            const results = await Promise.all(notificationPromises);
            const successCount = results.filter(r => r === true).length;
            if (successCount > 0) {
              console.log(`[Seminar] ✅ Notified ${successCount}/${adminUsers.length} admin(s) for request ${request.request_number}`);
            } else {
              console.error(`[Seminar] ❌ Failed to notify any admins for request ${request.request_number}`);
            }
          } else {
            console.warn('[Seminar] No active admin users found to notify');
          }
        }
      } catch (notifError: any) {
        // Log full error details for debugging
        console.error('[Seminar] Next approver notification failed:', {
          error: notifError,
          message: notifError?.message,
          code: notifError?.code,
          stack: notifError?.stack?.substring(0, 200),
          initialStatus,
          requestNumber: request.request_number,
        });
      }

      Alert.alert(
        'Success',
        status === 'draft' ? 'Draft saved successfully!' : 'Your seminar application has been submitted successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.push(`/request/${request.id}`),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error submitting seminar:', error);
      
      // Handle specific error types with empathetic messages
      let errorMessage = 'An error occurred while submitting your application. Please try again.';
      let errorTitle = 'Submission Failed';
      let showRetry = false;
      
      if (error.code === '23505') {
        errorTitle = 'Submission Conflict';
        errorMessage = 'A request with the same number already exists. Please try again - the system will generate a new request number.';
        showRetry = true;
      } else if (error.code === '23503') {
        errorTitle = 'Invalid Information';
        errorMessage = 'Some of the information provided is not valid. Please check your selections and try again.';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        errorTitle = 'Connection Error';
        errorMessage = 'We couldn\'t connect to the server. Please check your internet connection and try again.';
        showRetry = true;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
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
                  setTimeout(() => {
                    handleSubmit(status);
                  }, 500);
                }
              }
            ]
          : [{ text: 'OK', style: 'default' }]
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

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Seminar Application"
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
          scrollEnabled={scrollEnabled}
        >
          {/* Form Container */}
          <View style={styles.formContainer}>
            <View style={styles.formHeader}>
              <View>
                <Text style={styles.formTitle}>Seminar Application</Text>
                <Text style={styles.formSubtitle}>Complete all required fields to submit your seminar application</Text>
              </View>
              <View style={styles.requiredBadge}>
                <Text style={styles.requiredBadgeText}>* Required</Text>
              </View>
            </View>

            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <DateInput
                    id="sem-applicationDate"
                    label="Application date"
                    value={formData.applicationDate}
                    onChange={(date) => handleChange({ applicationDate: date })}
                    required
                    error={errors['seminar.applicationDate']}
                  />
                </View>

                <View style={styles.halfWidth}>
                  <RNTextInput
                    style={[styles.input, errors['seminar.title'] && styles.inputError]}
                    placeholder="Seminar / Training / Workshop Title"
                    placeholderTextColor="#9ca3af"
                    value={formData.title}
                    onChangeText={(text) => handleChange({ title: text })}
                  />
                  {errors['seminar.title'] && (
                    <Text style={styles.errorText}>{errors['seminar.title']}</Text>
                  )}
                  <Text style={styles.label}>
                    Seminar / Training / Workshop Title <Text style={styles.required}>*</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <DateInput
                    id="sem-dateFrom"
                    label="Departure date"
                    value={formData.dateFrom}
                    onChange={(date) => handleChange({ dateFrom: date })}
                    required
                    error={errors['seminar.dateFrom']}
                    minimumDate={new Date()}
                  />
                </View>

                <View style={styles.halfWidth}>
                  <DateInput
                    id="sem-dateTo"
                    label="Date to"
                    value={formData.dateTo}
                    onChange={(date) => handleChange({ dateTo: date })}
                    required
                    error={errors['seminar.dateTo']}
                    minimumDate={formData.dateFrom ? new Date(formData.dateFrom) : new Date()}
                  />
                </View>
              </View>

              {calculatedDays && (
                <View style={styles.daysDisplay}>
                  <Text style={styles.daysLabel}>No. of Day/s:</Text>
                  <Text style={styles.daysValue}>
                    {calculatedDays} {calculatedDays === 1 ? 'day' : 'days'}
                  </Text>
                </View>
              )}

              {/* Type of Training */}
              <View style={styles.field}>
                <Text style={styles.label}>
                  Type of Training <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.radioContainer}>
                  {TRAINING_TYPES.map((type) => {
                    const isSelected = formData.typeOfTraining.includes(type);
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.radioOption, isSelected && styles.radioOptionActive]}
                        onPress={() =>
                          handleChange({
                            typeOfTraining: isSelected ? [] : [type],
                          })
                        }
                      >
                        <View style={[styles.radioCircle, isSelected && styles.radioCircleActive]}>
                          {isSelected && <View style={styles.radioInner} />}
                        </View>
                        <Text style={[styles.radioText, isSelected && styles.radioTextActive]}>{type}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {errors['seminar.typeOfTraining'] && (
                  <Text style={styles.errorText}>{errors['seminar.typeOfTraining']}</Text>
                )}
              </View>

              {/* Training Category */}
              <View style={styles.halfWidth}>
                <Text style={styles.label}>Training category</Text>
                <TouchableOpacity
                  style={styles.selectButton}
                  onPress={() => {
                    Alert.alert(
                      'Select Category',
                      'Choose a training category',
                      TRAINING_CATEGORIES.map((cat) => ({
                        text: cat.label,
                        onPress: () => handleChange({ trainingCategory: cat.value }),
                      })).concat([{ text: 'Cancel', style: 'cancel' }])
                    );
                  }}
                >
                  <Text
                    style={[
                      styles.selectText,
                      !formData.trainingCategory && styles.selectPlaceholder,
                    ]}
                  >
                    {TRAINING_CATEGORIES.find((c) => c.value === formData.trainingCategory)?.label ||
                      'Select category...'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Provider / Venue / Modality */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Provider / Venue / Modality</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Sponsor / Provider</Text>
                  <RNTextInput
                    style={styles.input}
                    placeholder="Organization / Agency (Do not use acronym)"
                    placeholderTextColor="#9ca3af"
                    value={formData.sponsor}
                    onChangeText={(text) => handleChange({ sponsor: text })}
                  />
                  <Text style={styles.helperText}>Full organization name, no acronyms</Text>
                </View>

                <View style={styles.halfWidth}>
                  <LocationField
                    value={formData.venue}
                    onChange={({ address }) => handleChange({ venue: address })}
                    placeholder="Type address or pick on map"
                    label="Venue"
                    required
                    error={errors['seminar.venue']}
                    inputId="sem-venue"
                  />
                </View>
              </View>

              <View style={styles.halfWidth}>
                <Text style={styles.label}>
                  Modality <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.modalityContainer}>
                  {MODALITY_OPTIONS.map((mod) => (
                    <TouchableOpacity
                      key={mod}
                      style={[
                        styles.modalityOption,
                        formData.modality === mod && styles.modalityOptionActive,
                      ]}
                      onPress={() => handleChange({ modality: mod })}
                    >
                      <Text
                        style={[styles.modalityText, formData.modality === mod && styles.modalityTextActive]}
                      >
                        {mod}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {errors['seminar.modality'] && (
                  <Text style={styles.errorText}>{errors['seminar.modality']}</Text>
                )}
              </View>
            </View>

            {/* Financial Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Information</Text>

              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <CurrencyInput
                    label="Registration cost"
                    placeholder="0.00"
                    value={formData.registrationCost?.toString() || ''}
                    onChange={(value) => handleChange({ registrationCost: asNum(value) })}
                  />
                </View>

                <View style={styles.halfWidth}>
                  <CurrencyInput
                    label="Total amount of expenses"
                    placeholder="0.00"
                    value={formData.totalAmount?.toString() || ''}
                    onChange={(value) => handleChange({ totalAmount: asNum(value) })}
                  />
                </View>
              </View>
            </View>

            {/* Breakdown of Expenses */}
            <BreakdownEditor
              items={formData.breakdown}
              onChange={(items) => handleChange({ breakdown: items })}
            />

            {/* Applicants Table */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Applicants</Text>
              <Text style={styles.sectionSubtitle}>List all applicants attending the seminar</Text>

              <ApplicantsEditor
                list={formData.applicants}
                onChange={(applicants) => handleChange({ applicants })}
              />

              {errors['seminar.applicants'] && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{errors['seminar.applicants']}</Text>
                </View>
              )}
            </View>

            {/* Make-up Class Schedule & Undertaking */}
            <View style={styles.section}>
              <View style={styles.row}>
                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Make-up Class Schedule (for faculty)</Text>
                  <RNTextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="If faculty, indicate proposed make-up classes for verification"
                    placeholderTextColor="#9ca3af"
                    value={formData.makeUpClassSchedule}
                    onChangeText={(text) => handleChange({ makeUpClassSchedule: text })}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                  <Text style={styles.helperText}>Required for faculty members attending seminars</Text>
                </View>

                <View style={styles.halfWidth}>
                  <Text style={styles.label}>Applicant's Undertaking</Text>
                  <View style={styles.checkboxContainer}>
                    <Switch
                      value={formData.applicantUndertaking}
                      onValueChange={(value) => handleChange({ applicantUndertaking: value })}
                      trackColor={{ false: '#d1d5db', true: '#7a0019' }}
                      thumbColor="#fff"
                    />
                    <Text style={styles.checkboxText}>
                      I agree to liquidate advanced amounts within 5 working days, submit required documents,
                      and serve as a resource speaker in an echo seminar.
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Fund Release Line */}
            <View style={styles.section}>
              <CurrencyInput
                label="Fund release line"
                placeholder="0.00"
                value={formData.fundReleaseLine?.toString() || ''}
                onChange={(value) => handleChange({ fundReleaseLine: asNum(value) })}
                helper="Budget line item for fund release"
              />
            </View>

            {/* Contact Number Section */}
            <View style={styles.section}>
              <Text style={styles.label}>
                Contact Number for Driver/Coordination <Text style={styles.optional}>(Optional)</Text>
              </Text>
              <RNTextInput
                style={[styles.input, errors['seminar.requesterContactNumber'] && styles.inputError]}
                placeholder="+63XXXXXXXXXX or 09XXXXXXXXX"
                placeholderTextColor="#9ca3af"
                value={formData.requesterContactNumber || ''}
                onChangeText={(text) => handleChange({ requesterContactNumber: text })}
                keyboardType="phone-pad"
              />
              <Text style={styles.helperText}>
                Provide your contact number for driver coordination
              </Text>
              {errors['seminar.requesterContactNumber'] && (
                <Text style={styles.errorText}>{errors['seminar.requesterContactNumber']}</Text>
              )}
            </View>

            {/* File Attachments Section */}
            <View style={styles.section}>
              <FileAttachmentPicker
                files={attachments}
                onChange={setAttachments}
                error={errors['seminar.attachments']}
                disabled={submitting || savingDraft}
              />
            </View>

            {/* Organizer's Signature */}
            <View style={styles.section}>
              <View style={styles.signatureHeader}>
                <View>
                  <Text style={styles.signatureTitle}>
                    Organizer's signature <Text style={styles.required}>*</Text>
                  </Text>
                  <Text style={styles.signatureSubtitle}>
                    Sign with finger — it auto-saves when you lift
                  </Text>
                </View>
                {errors['seminar.requesterSignature'] && (
                  <View style={styles.errorBadge}>
                    <Text style={styles.errorBadgeText}>{errors['seminar.requesterSignature']}</Text>
                  </View>
                )}
              </View>
              <View
                style={[
                  styles.signatureSection,
                  errors['seminar.requesterSignature'] && styles.signatureSectionError,
                ]}
              >
                <SignaturePad
                  height={160}
                  value={formData.requesterSignature || null}
                  onSave={(dataUrl) => handleChange({ requesterSignature: dataUrl })}
                  onClear={() => handleChange({ requesterSignature: '' })}
                  onDrawingStart={() => setScrollEnabled(false)}
                  onDrawingEnd={() => setScrollEnabled(true)}
                  hideSaveButton
                />
              </View>
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
                    <Text style={styles.submitButtonText}>Submit Application</Text>
                  </>
                )}
              </TouchableOpacity>
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

// Breakdown Editor Component
function BreakdownEditor({
  items,
  onChange,
}: {
  items: BreakdownItem[];
  onChange: (items: BreakdownItem[]) => void;
}) {
  const setItem = (i: number, patch: Partial<BreakdownItem>) => {
    const next = [...items];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const add = () => {
    onChange([...(items || []), { label: '', amount: null, description: '' }]);
  };

  const remove = (i: number) => {
    const next = [...items];
    next.splice(i, 1);
    onChange(next);
  };

  const total = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <View style={styles.breakdownSection}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>Breakdown of Expenses</Text>
          <Text style={styles.sectionSubtitle}>List all expense items, amounts, and justifications</Text>
        </View>
        {total > 0 && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>
              Total: ₱{total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No expense items added yet</Text>
          <Text style={styles.emptyStateSubtext}>Click "Add Expense Item" below to add expenses</Text>
        </View>
      ) : (
        <View style={styles.breakdownList}>
          {items.map((it, i) => (
            <View key={i} style={styles.breakdownItem}>
              <View style={styles.breakdownRow}>
                <View style={styles.breakdownItemField}>
                  {i === 0 && <Text style={styles.breakdownLabel}>Expense Item</Text>}
                  <RNTextInput
                    style={styles.input}
                    placeholder="e.g., Accommodation / Transport / Materials"
                    placeholderTextColor="#9ca3af"
                    value={it.label}
                    onChangeText={(text) => setItem(i, { label: text })}
                  />
                </View>
                <View style={styles.breakdownAmountField}>
                  {i === 0 && <Text style={styles.breakdownLabel}>Amount</Text>}
                  <CurrencyInput
                    placeholder="0.00"
                    value={it.amount?.toString() || ''}
                    onChange={(value) => setItem(i, { amount: asNum(value) })}
                  />
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => remove(i)}>
                  <Ionicons name="trash-outline" size={20} color="#dc2626" />
                </TouchableOpacity>
              </View>
              <View style={styles.breakdownDescriptionField}>
                {i === 0 && <Text style={styles.breakdownLabel}>Justification</Text>}
                <RNTextInput
                  style={styles.input}
                  placeholder="e.g., Details or justification for this expense"
                  placeholderTextColor="#9ca3af"
                  value={it.description || ''}
                  onChangeText={(text) => setItem(i, { description: text })}
                />
              </View>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={add}>
        <Ionicons name="add-circle-outline" size={20} color="#7a0019" />
        <Text style={styles.addButtonText}>Add Expense Item</Text>
      </TouchableOpacity>
    </View>
  );
}

// Applicants Editor Component
function ApplicantsEditor({
  list,
  onChange,
}: {
  list: Applicant[];
  onChange: (list: Applicant[]) => void;
}) {
  const [signatureModal, setSignatureModal] = useState<{ index: number; visible: boolean }>({
    index: -1,
    visible: false,
  });
  const { data: departments = [] } = useDepartments();

  const setRow = (i: number, patch: Partial<Applicant>) => {
    const next = [...list];
    next[i] = { ...next[i], ...patch };
    onChange(next);
  };

  const add = () => {
    onChange([...list, { name: '', department: '', availableFdp: null, signature: null }]);
  };

  const remove = (i: number) => {
    const next = [...list];
    next.splice(i, 1);
    onChange(next);
  };

  const openSignature = (index: number) => {
    setSignatureModal({ index, visible: true });
  };

  const closeSignature = () => {
    setSignatureModal({ index: -1, visible: false });
  };

  const saveSignature = (index: number, dataUrl: string) => {
    setRow(index, { signature: dataUrl });
    closeSignature();
  };

  const handleDepartmentSelect = (i: number) => {
    Alert.alert(
      'Select Department',
      'Choose a department',
      departments.map((dept) => ({
        text: dept.code ? `${dept.name} (${dept.code})` : dept.name,
        onPress: () => {
          const deptString = dept.code ? `${dept.name} (${dept.code})` : dept.name;
          setRow(i, { department: deptString });
        },
      })).concat([{ text: 'Cancel', style: 'cancel' }])
    );
  };

  return (
    <View style={styles.applicantsSection}>
      {list.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No applicants added yet</Text>
          <Text style={styles.emptyStateSubtext}>Click "Add Applicant" below to add applicants</Text>
        </View>
      ) : (
        <View style={styles.applicantsList}>
          {list.map((row, i) => (
            <View key={i} style={styles.applicantRow}>
              <View style={styles.applicantField}>
                <RNTextInput
                  style={styles.input}
                  placeholder="Full name"
                  placeholderTextColor="#9ca3af"
                  value={row.name}
                  onChangeText={(text) => setRow(i, { name: text })}
                />
              </View>
              <TouchableOpacity
                style={[styles.applicantField, styles.selectButton]}
                onPress={() => handleDepartmentSelect(i)}
              >
                <Text
                  style={[styles.selectText, !row.department && styles.selectPlaceholder]}
                >
                  {row.department || 'Select department'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#6b7280" />
              </TouchableOpacity>
              <View style={styles.applicantFdpField}>
                <RNTextInput
                  style={[styles.input, styles.fdpInput]}
                  placeholder="FDP"
                  placeholderTextColor="#9ca3af"
                  value={row.availableFdp?.toString() || ''}
                  onChangeText={(text) => setRow(i, { availableFdp: asNum(text) })}
                  keyboardType="numeric"
                />
              </View>
              <TouchableOpacity
                style={styles.signatureButton}
                onPress={() => openSignature(i)}
              >
                {row.signature ? (
                  <Image source={{ uri: row.signature }} style={styles.signaturePreview} />
                ) : (
                  <View style={styles.signaturePlaceholder}>
                    <Ionicons name="create-outline" size={16} color="#6b7280" />
                    <Text style={styles.signaturePlaceholderText}>Sign</Text>
                  </View>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.removeButton} onPress={() => remove(i)}>
                <Ionicons name="trash-outline" size={20} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity style={styles.addButton} onPress={add}>
        <Ionicons name="add-circle-outline" size={20} color="#7a0019" />
        <Text style={styles.addButtonText}>Add Applicant</Text>
      </TouchableOpacity>

      {/* Signature Modal */}
      <Modal
        visible={signatureModal.visible}
        transparent
        animationType="slide"
        onRequestClose={closeSignature}
      >
        <View style={styles.signatureModalOverlay}>
          <View style={styles.signatureModal}>
            <View style={styles.signatureModalHeader}>
              <Text style={styles.signatureModalTitle}>Sign here</Text>
              <TouchableOpacity onPress={closeSignature}>
                <Ionicons name="close" size={24} color="#111827" />
              </TouchableOpacity>
            </View>
            {signatureModal.index >= 0 && (
              <SignaturePad
                height={220}
                value={list[signatureModal.index]?.signature || null}
                onSave={(dataUrl) => saveSignature(signatureModal.index, dataUrl)}
                onClear={() => setRow(signatureModal.index, { signature: null })}
                onDrawingStart={() => setScrollEnabled(false)}
                onDrawingEnd={() => setScrollEnabled(true)}
                hideSaveButton
              />
            )}
          </View>
        </View>
      </Modal>
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
    padding: 20,
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
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
    marginBottom: 24,
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  requiredBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#7a0019',
  },
  section: {
    marginBottom: 24,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    gap: 16,
  },
  halfWidth: {
    flex: 1,
  },
  field: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#dc2626',
  },
  input: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#fff',
    minHeight: 44,
  },
  inputError: {
    borderColor: '#dc2626',
    backgroundColor: '#fef2f2',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#dc2626',
    marginTop: 4,
  },
  errorContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  optional: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6b7280',
  },
  helperText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  daysDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  daysValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  radioContainer: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    flex: 1,
    minWidth: '45%',
  },
  radioOptionActive: {
    borderColor: '#7a0019',
    backgroundColor: '#fef2f2',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#7a0019',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#7a0019',
  },
  radioText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  radioTextActive: {
    color: '#7a0019',
  },
  modalityContainer: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  modalityOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modalityOptionActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#7a0019',
  },
  modalityText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  modalityTextActive: {
    color: '#7a0019',
    fontWeight: '600',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#374151',
  },
  breakdownSection: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  totalBadge: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e40af',
  },
  breakdownList: {
    gap: 16,
    marginBottom: 16,
  },
  breakdownItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-end',
  },
  breakdownItemField: {
    flex: 1,
    gap: 8,
  },
  breakdownAmountField: {
    width: 140,
    gap: 8,
  },
  breakdownDescriptionField: {
    gap: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  removeButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyStateSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#7a0019',
    backgroundColor: '#fff',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7a0019',
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
    minHeight: 44,
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  selectPlaceholder: {
    color: '#9ca3af',
  },
  applicantsSection: {
    gap: 16,
  },
  applicantsList: {
    gap: 12,
  },
  applicantRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  applicantField: {
    flex: 1,
    gap: 8,
  },
  applicantFdpField: {
    width: 80,
    gap: 8,
  },
  fdpInput: {
    textAlign: 'center',
  },
  signatureButton: {
    width: 100,
    height: 40,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signaturePreview: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    resizeMode: 'contain',
  },
  signaturePlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  signaturePlaceholderText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  signatureModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  signatureModal: {
    width: '100%',
    maxWidth: 600,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  signatureModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  signatureModalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
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
  signatureSection: {
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
});
