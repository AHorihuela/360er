-- AUDITED Migration to fix function search_path security warnings
-- This only fixes functions that actually exist in the current schema
-- Preserves exact current behavior while adding security fixes
-- Addresses Supabase linter warning: function_search_path_mutable

BEGIN;

-- Fix check_ai_report_content function (exists in current schema)
CREATE OR REPLACE FUNCTION public.check_ai_report_content()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.content IS NULL THEN
    RAISE EXCEPTION 'Completed reports must have content';
  END IF;
  RETURN NEW;
END;
$$;

-- Fix delete_feedback_with_references function (exists in current schema)
CREATE OR REPLACE FUNCTION public.delete_feedback_with_references(feedback_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- First, null out any references to this feedback
    UPDATE public.feedback_responses
    SET previous_version_id = NULL
    WHERE previous_version_id = feedback_id;
    
    -- Then delete the feedback itself
    DELETE FROM public.feedback_responses
    WHERE id = feedback_id;
END;
$$;

-- Fix log_policy_evaluation function (exists in current schema)
CREATE OR REPLACE FUNCTION public.log_policy_evaluation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    RAISE NOTICE 'Policy evaluation: table=%, operation=%, user=%', 
        TG_TABLE_NAME, 
        TG_OP,
        current_user;
    RETURN NULL;
END;
$$;

-- Fix random_feedback_text function (exists in current schema - preserve existing implementation)
CREATE OR REPLACE FUNCTION public.random_feedback_text(category text)
RETURNS text
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  strengths_array TEXT[] := ARRAY[
    -- Leadership & Management
    'Excellent at developing and mentoring team members, creating growth opportunities',
    'Strong strategic vision and ability to align team with company goals',
    'Highly effective at managing cross-functional projects and stakeholder relationships',
    'Creates an inclusive environment where team members feel valued and heard',
    'Exceptional at navigating complex organizational challenges with diplomacy',
    
    -- Technical & Execution
    'Consistently delivers high-quality solutions while maintaining clean, maintainable code',
    'Shows deep technical expertise and stays current with industry best practices',
    'Excellent at breaking down complex problems into manageable components',
    'Proactively identifies and resolves technical debt and system bottlenecks',
    'Strong architecture design skills with focus on scalability and performance',
    
    -- Communication & Collaboration
    'Articulates complex technical concepts clearly to non-technical stakeholders',
    'Facilitates productive meetings with clear action items and follow-through',
    'Excellent written communication in documentation and project proposals',
    'Builds strong relationships across departments and hierarchy levels',
    'Effectively manages expectations and communicates project status proactively',
    
    -- Initiative & Innovation
    'Consistently proposes innovative solutions to business challenges',
    'Takes ownership of critical projects without being asked',
    'Identifies process improvements that significantly impact efficiency',
    'Shows great initiative in learning new technologies and methodologies',
    'Actively contributes to company culture and knowledge sharing',
    
    -- Problem Solving & Decision Making
    'Makes well-reasoned decisions based on data and team input',
    'Excellent at prioritizing tasks and managing competing demands',
    'Demonstrates strong analytical skills in complex problem-solving',
    'Effectively balances short-term needs with long-term strategic goals',
    'Shows good judgment in crisis situations and under pressure'
  ];
  
  improvements_array TEXT[] := ARRAY[
    -- Leadership & Management
    'Could delegate more effectively to develop team members capabilities',
    'Would benefit from providing more regular constructive feedback to direct reports',
    'Could improve on setting clearer expectations and success metrics',
    'Might benefit from developing a more strategic long-term vision',
    'Could work on building stronger relationships with other department leaders',
    
    -- Technical & Execution
    'Should focus more on writing comprehensive test coverage for critical features',
    'Could improve code review thoroughness and feedback quality',
    'Would benefit from deeper understanding of system architecture trade-offs',
    'Should document technical decisions and processes more thoroughly',
    'Could improve on estimating project complexity and timeline accuracy',
    
    -- Communication & Collaboration
    'Would benefit from more proactive communication about project blockers',
    'Could improve presentation skills for executive-level audiences',
    'Should provide more context when discussing technical decisions',
    'Could be more active in team discussions and design reviews',
    'Would benefit from more regular status updates to stakeholders',
    
    -- Work Style & Time Management
    'Could improve work-life balance and avoid potential burnout',
    'Should delegate more instead of taking on too much personally',
    'Would benefit from better meeting preparation and agenda setting',
    'Could improve on following up on action items more consistently',
    'Should focus on one project at a time instead of context switching',
    
    -- Growth & Development
    'Would benefit from developing broader industry knowledge',
    'Could take more initiative in mentoring junior team members',
    'Should seek more opportunities to improve public speaking skills',
    'Could be more open to alternative approaches and feedback',
    'Would benefit from expanding network within the industry'
  ];
BEGIN
  IF category = 'strengths' THEN
    RETURN strengths_array[floor(random() * array_length(strengths_array, 1) + 1)];
  ELSE
    RETURN improvements_array[floor(random() * array_length(improvements_array, 1) + 1)];
  END IF;
END;
$$;

-- Fix set_review_cycle_created_by function (exists in current schema - preserve exact behavior)
CREATE OR REPLACE FUNCTION public.set_review_cycle_created_by()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;

-- Fix trigger_set_updated_at function (exists in current schema - preserve exact UTC timezone behavior)
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;

-- Fix update_review_cycle_status function (exists in current schema)
CREATE OR REPLACE FUNCTION public.update_review_cycle_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    -- Update the review cycle status based on all its feedback requests
    UPDATE public.review_cycles rc
    SET status = CASE 
        WHEN NOT EXISTS (
            SELECT 1 
            FROM public.feedback_requests fr 
            WHERE fr.review_cycle_id = rc.id 
            AND fr.status = 'pending'
        ) THEN 'completed'
        ELSE 'active'
    END
    WHERE id = (
        SELECT review_cycle_id 
        FROM public.feedback_requests 
        WHERE id = NEW.id
    );
    
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function (exists in current schema)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Fix create_feedback_response function (exists in current schema - preserve SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.create_feedback_response(
    p_feedback_request_id uuid,
    p_session_id text,
    p_relationship text,
    p_strengths text,
    p_areas_for_improvement text,
    p_status text,
    p_submitted_at timestamp with time zone
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.feedback_responses (
    feedback_request_id,
    session_id,
    relationship,
    strengths,
    areas_for_improvement,
    status,
    submitted_at
  ) VALUES (
    p_feedback_request_id,
    p_session_id,
    p_relationship,
    p_strengths,
    p_areas_for_improvement,
    p_status,
    p_submitted_at
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- Fix update_feedback_request_status function (exists in current schema - preserve SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.update_feedback_request_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- After insert, check if we need to update the feedback request status
    IF TG_OP = 'INSERT' THEN
        -- Update the feedback request status if all expected responses are received
        UPDATE public.feedback_requests
        SET status = 'completed'
        WHERE id = NEW.feedback_request_id
        AND status = 'in_progress';
        
        RETURN NEW;
    END IF;

    -- After delete, revert status to in_progress if needed
    IF TG_OP = 'DELETE' THEN
        UPDATE public.feedback_requests
        SET status = 'in_progress'
        WHERE id = OLD.feedback_request_id
        AND status = 'completed';
        
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;

-- NOTE: The following functions already have proper search_path set and don't need fixing:
-- - delete_user_account (already has SET "search_path" TO 'public')
-- - handle_feedback_response (already has SET "search_path" TO 'public')

-- NOTE: The following functions mentioned in warnings do not exist in current schema:
-- - is_master_account (was dropped or never applied)
-- - get_user_emails (does not exist)
-- - check_feedback_response_delete (does not exist)

-- Add comments to document the security fix
COMMENT ON FUNCTION public.check_ai_report_content() IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.delete_feedback_with_references(uuid) IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.log_policy_evaluation() IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.random_feedback_text(text) IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.set_review_cycle_created_by() IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.trigger_set_updated_at() IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.update_review_cycle_status() IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.update_updated_at_column() IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.create_feedback_response(uuid, text, text, text, text, text, timestamp with time zone) IS 'Fixed search_path security vulnerability by setting search_path = ''''';
COMMENT ON FUNCTION public.update_feedback_request_status() IS 'Fixed search_path security vulnerability by setting search_path = ''''';

COMMIT; 