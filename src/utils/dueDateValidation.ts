import { anonymousClient } from '@/lib/supabase';

export interface DueDateValidationResult {
  isValid: boolean;
  reason: string;
  dueDate: string;
  currentDate: string;
  timezoneInfo: {
    userTimezone: string;
    userDate: string;
    utcDate: string;
  };
}

/**
 * Validates if a review cycle is still accepting submissions
 * This helps us debug due date issues without modifying database policies
 */
export async function validateDueDateAccess(reviewCycleId: string): Promise<DueDateValidationResult> {
  const now = new Date();
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
  // Get review cycle info
  const { data: reviewCycle, error } = await anonymousClient
    .from('review_cycles')
    .select('review_by_date, status, title')
    .eq('id', reviewCycleId)
    .single();

  if (error || !reviewCycle) {
    return {
      isValid: false,
      reason: 'Review cycle not found',
      dueDate: 'N/A',
      currentDate: now.toISOString(),
      timezoneInfo: {
        userTimezone,
        userDate: now.toLocaleString(),
        utcDate: now.toISOString()
      }
    };
  }

  const dueDate = new Date(reviewCycle.review_by_date);
  
  // Set comparison times for fair evaluation
  const dueDateEndOfDay = new Date(dueDate);
  dueDateEndOfDay.setHours(23, 59, 59, 999);
  
  const currentDateStartOfDay = new Date(now);
  currentDateStartOfDay.setHours(0, 0, 0, 0);

  const isValid = currentDateStartOfDay <= dueDateEndOfDay;
  
  let reason = '';
  if (!isValid) {
    const daysDiff = Math.ceil((currentDateStartOfDay.getTime() - dueDateEndOfDay.getTime()) / (1000 * 60 * 60 * 24));
    reason = `Due date passed ${daysDiff} day(s) ago`;
  } else if (reviewCycle.status === 'closed') {
    reason = 'Review cycle is closed';
  } else {
    reason = 'Within valid submission period';
  }

  return {
    isValid: isValid && reviewCycle.status !== 'closed',
    reason,
    dueDate: reviewCycle.review_by_date,
    currentDate: now.toISOString(),
    timezoneInfo: {
      userTimezone,
      userDate: now.toLocaleString(),
      utcDate: now.toISOString()
    }
  };
}

/**
 * SAFE test function to check if database policies are working correctly
 * This attempts a dry-run test without creating actual records
 */
export async function testDatabasePolicyEnforcement(feedbackRequestId: string, sessionId: string): Promise<{
  canSubmit: boolean;
  error?: string;
  policyDetails?: any;
}> {
  try {
    // Instead of actually inserting, let's check if the feedback request exists
    // and what the policy conditions would evaluate to
    const { data: feedbackRequest, error } = await anonymousClient
      .from('feedback_requests')
      .select(`
        id,
        status,
        unique_link,
        review_cycle_id,
        review_cycle:review_cycles (
          review_by_date,
          status
        )
      `)
      .eq('id', feedbackRequestId)
      .single();

    if (error || !feedbackRequest) {
      return {
        canSubmit: false,
        error: 'Feedback request not found',
        policyDetails: { error }
      };
    }

    const reviewCycle = Array.isArray(feedbackRequest.review_cycle) 
      ? feedbackRequest.review_cycle[0] 
      : feedbackRequest.review_cycle;

    // Check policy conditions manually (safer than actually inserting)
    const hasUniqueLink = !!feedbackRequest.unique_link;
    const isNotClosed = feedbackRequest.status !== 'closed';
    const dueDateCheck = new Date(reviewCycle.review_by_date) >= new Date();

    const policyWouldAllow = hasUniqueLink && isNotClosed && dueDateCheck;

    return {
      canSubmit: policyWouldAllow,
      policyDetails: {
        hasUniqueLink,
        isNotClosed,
        dueDateCheck,
        reviewByDate: reviewCycle.review_by_date,
        currentDate: new Date().toISOString(),
        note: 'This is a safe read-only check - no test records created'
      }
    };
  } catch (error) {
    return {
      canSubmit: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Debug function to get detailed information about a feedback request
 */
export async function debugFeedbackRequestState(uniqueLink: string) {
  // Fetch feedback_request first to avoid !inner join issues
  const { data: feedbackRequest, error } = await anonymousClient
    .from('feedback_requests')
    .select(`
      id,
      status,
      unique_link,
      created_at,
      review_cycle_id
    `)
    .ilike('unique_link', uniqueLink.replace(/[-]+$/, ''))
    .single();

  if (error) return { data: null, error };
  if (!feedbackRequest) return { data: null, error: { message: 'Feedback request not found' } };

  // Fetch review_cycle separately
  const { data: reviewCycle, error: cycleError } = await anonymousClient
    .from('review_cycles')
    .select(`
      id,
      title,
      review_by_date,
      status,
      created_at
    `)
    .eq('id', feedbackRequest.review_cycle_id)
    .single();

  if (cycleError) return { data: null, error: cycleError };

  // Manually combine the data
  const combinedData = {
    ...feedbackRequest,
    review_cycle: reviewCycle
  };

  const dueDateValidation = await validateDueDateAccess(reviewCycle.id as string);

  return {
    feedbackRequest: combinedData,
    dueDateValidation,
    currentPolicies: {
      // We can add policy checking here if needed
      note: 'Use SQL queries to check current RLS policies'
    }
  };
} 