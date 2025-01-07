

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE EXTENSION IF NOT EXISTS "pgsodium" WITH SCHEMA "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."check_ai_report_content"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF NEW.status = 'completed' AND NEW.content IS NULL THEN
    RAISE EXCEPTION 'Completed reports must have content';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_ai_report_content"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_feedback_response"("p_feedback_request_id" "uuid", "p_session_id" "text", "p_relationship" "text", "p_strengths" "text", "p_areas_for_improvement" "text", "p_status" "text", "p_submitted_at" timestamp with time zone) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO feedback_responses (
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


ALTER FUNCTION "public"."create_feedback_response"("p_feedback_request_id" "uuid", "p_session_id" "text", "p_relationship" "text", "p_strengths" "text", "p_areas_for_improvement" "text", "p_status" "text", "p_submitted_at" timestamp with time zone) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_feedback_with_references"("feedback_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- First, null out any references to this feedback
    UPDATE feedback_responses
    SET previous_version_id = NULL
    WHERE previous_version_id = feedback_id;
    
    -- Then delete the feedback itself
    DELETE FROM feedback_responses
    WHERE id = feedback_id;
END;
$$;


ALTER FUNCTION "public"."delete_feedback_with_references"("feedback_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_user_account"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid;
    v_count integer;
BEGIN
    -- Get the current user's ID
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete all review cycles (will cascade to feedback_requests, responses, analytics, etc.)
    DELETE FROM review_cycles WHERE user_id = v_user_id;

    -- Delete all employees
    DELETE FROM employees WHERE user_id = v_user_id;

    -- Verify deletion
    SELECT COUNT(*) INTO v_count
    FROM (
        SELECT id FROM employees WHERE user_id = v_user_id
        UNION ALL
        SELECT id FROM review_cycles WHERE user_id = v_user_id
    ) remaining;

    IF v_count > 0 THEN
        RAISE EXCEPTION 'Failed to delete all user data';
    END IF;
END;
$$;


ALTER FUNCTION "public"."delete_user_account"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_user_account"() IS 'Deletes all data associated with the current user''s account';



CREATE OR REPLACE FUNCTION "public"."handle_feedback_response"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_request_status text;
    v_unique_link text;
BEGIN
    -- Get request info
    SELECT 
        status,
        unique_link
    INTO v_request_status, v_unique_link
    FROM feedback_requests fr
    WHERE id = NEW.feedback_request_id;
    
    -- Check if request exists and has unique link
    IF v_unique_link IS NULL THEN
        RAISE EXCEPTION 'Invalid feedback request';
    END IF;
    
    -- Check if request is still pending (not closed)
    IF v_request_status = 'closed' THEN
        RAISE EXCEPTION 'Feedback request is closed and no longer accepting responses';
    END IF;
    
    -- Set default values for text fields
    NEW.strengths := COALESCE(NEW.strengths, '');
    NEW.areas_for_improvement := COALESCE(NEW.areas_for_improvement, '');
    NEW.submitted_at := CASE 
        WHEN NEW.status = 'submitted' THEN NOW()
        ELSE NULL
    END;

    -- If this is a final submission, check for existing in-progress
    IF NEW.status = 'submitted' THEN
        -- Link to existing in-progress if one exists
        NEW.previous_version_id := (
            SELECT id FROM feedback_responses
            WHERE feedback_request_id = NEW.feedback_request_id
            AND session_id = NEW.session_id
            AND status = 'in_progress'
            ORDER BY submitted_at DESC
            LIMIT 1
        );
    END IF;

    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_feedback_response"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_policy_evaluation"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    RAISE NOTICE 'Policy evaluation: table=%, operation=%, user=%', 
        TG_TABLE_NAME, 
        TG_OP,
        current_user;
    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."log_policy_evaluation"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."random_feedback_text"("category" "text") RETURNS "text"
    LANGUAGE "plpgsql"
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


ALTER FUNCTION "public"."random_feedback_text"("category" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_review_cycle_created_by"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  NEW.created_by = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_review_cycle_created_by"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trigger_set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trigger_set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_feedback_request_status"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- After insert, check if we need to update the feedback request status
    IF TG_OP = 'INSERT' THEN
        -- Update the feedback request status if all expected responses are received
        UPDATE feedback_requests
        SET status = 'completed'
        WHERE id = NEW.feedback_request_id
        AND status = 'in_progress';
        
        RETURN NEW;
    END IF;

    -- After delete, revert status to in_progress if needed
    IF TG_OP = 'DELETE' THEN
        UPDATE feedback_requests
        SET status = 'in_progress'
        WHERE id = OLD.feedback_request_id
        AND status = 'completed';
        
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_feedback_request_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_review_cycle_status"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Update the review cycle status based on all its feedback requests
    UPDATE review_cycles rc
    SET status = CASE 
        WHEN NOT EXISTS (
            SELECT 1 
            FROM feedback_requests fr 
            WHERE fr.review_cycle_id = rc.id 
            AND fr.status = 'pending'
        ) THEN 'completed'
        ELSE 'active'
    END
    WHERE id = (
        SELECT review_cycle_id 
        FROM feedback_requests 
        WHERE id = NEW.id
    );
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_review_cycle_status"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."ai_reports" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "feedback_request_id" "uuid" NOT NULL,
    "content" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_final" boolean DEFAULT false NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "error" "text"
);


ALTER TABLE "public"."ai_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."employees" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid" NOT NULL
);


ALTER TABLE "public"."employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "review_cycle_id" "uuid",
    "employee_id" "uuid",
    "unique_link" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "target_responses" integer DEFAULT 3,
    "manually_completed" boolean DEFAULT false,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "status" "text" DEFAULT 'draft'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "review_by_date" "date" NOT NULL,
    "user_id" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."review_cycles" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."employee_access_paths" AS
 SELECT DISTINCT "e"."id" AS "employee_id",
    ("fr"."unique_link" IS NOT NULL) AS "has_public_access",
    "rc"."user_id" AS "manager_id"
   FROM (("public"."employees" "e"
     LEFT JOIN "public"."feedback_requests" "fr" ON (("fr"."employee_id" = "e"."id")))
     LEFT JOIN "public"."review_cycles" "rc" ON (("rc"."id" = "fr"."review_cycle_id")));


ALTER TABLE "public"."employee_access_paths" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_analyses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "strengths" "text" NOT NULL,
    "areas_for_improvement" "text" NOT NULL,
    "analysis" "jsonb" NOT NULL,
    "model_version" "text" NOT NULL,
    "prompt_version" "text" NOT NULL
);


ALTER TABLE "public"."feedback_analyses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_analytics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_request_id" "uuid",
    "insights" "jsonb" NOT NULL,
    "last_analyzed_at" timestamp with time zone DEFAULT "now"(),
    "feedback_hash" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."feedback_analytics" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_responses" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "feedback_request_id" "uuid" NOT NULL,
    "relationship" "text" NOT NULL,
    "strengths" "text" DEFAULT ''::"text" NOT NULL,
    "areas_for_improvement" "text" DEFAULT ''::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "overall_rating" integer,
    "status" "text" NOT NULL,
    "session_id" "text",
    "previous_version_id" "uuid",
    CONSTRAINT "feedback_responses_overall_rating_check" CHECK ((("overall_rating" >= 1) AND ("overall_rating" <= 5))),
    CONSTRAINT "feedback_responses_status_check" CHECK (("status" = ANY (ARRAY['in_progress'::"text", 'submitted'::"text", 'superseded'::"text"])))
);


ALTER TABLE "public"."feedback_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."feedback_responses_backup" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "feedback_request_id" "uuid" NOT NULL,
    "relationship" "text" NOT NULL,
    "strengths" "text" DEFAULT ''::"text" NOT NULL,
    "areas_for_improvement" "text" DEFAULT ''::"text" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "overall_rating" integer,
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "session_id" "text",
    CONSTRAINT "feedback_responses_overall_rating_check" CHECK ((("overall_rating" >= 1) AND ("overall_rating" <= 5)))
);


ALTER TABLE "public"."feedback_responses_backup" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "feedback_request_id" "uuid",
    "user_id" "uuid",
    "session_id" "text" NOT NULL,
    "page_url" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."page_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130_circular" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130_circular" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130_employees" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130_employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130_employees_final" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130_employees_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130_feedback" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130_final" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130_full" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130_full" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240130_responses" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240130_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_all" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_all" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_all_final" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_all_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_employees" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_employees" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_employees_auth" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_employees_auth" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_employees_auth2" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_employees_auth2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_employees_final" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_employees_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_employees_final2" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_employees_final2" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_employees_final3" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_employees_final3" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_employees_final4" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_employees_final4" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_feedback_auth" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_feedback_auth" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_feedback_final" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_feedback_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_feedback_requests" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_feedback_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_final" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_final5" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_final5" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_final6" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_final6" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_review_cycles" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_review_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_review_cycles_anon" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_review_cycles_anon" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_review_cycles_final" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_review_cycles_final" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."policy_backup_20240131_review_cycles_final2" (
    "schemaname" "name",
    "tablename" "name",
    "policyname" "name",
    "permissive" "text",
    "roles" "name"[],
    "cmd" "text",
    "qual" "text" COLLATE "pg_catalog"."C",
    "with_check" "text" COLLATE "pg_catalog"."C"
);


ALTER TABLE "public"."policy_backup_20240131_review_cycles_final2" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."review_cycles_feedback_summary" AS
 SELECT "rc"."id" AS "review_cycle_id",
    "rc"."user_id",
    "count"("fr"."id") AS "total_requests",
    "count"(
        CASE
            WHEN ("fr"."status" = 'completed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "completed_requests"
   FROM ("public"."review_cycles" "rc"
     LEFT JOIN "public"."feedback_requests" "fr" ON (("fr"."review_cycle_id" = "rc"."id")))
  GROUP BY "rc"."id", "rc"."user_id";


ALTER TABLE "public"."review_cycles_feedback_summary" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."review_cycles_with_feedback" AS
 SELECT "rc"."id",
    "rc"."title",
    "rc"."status",
    "rc"."review_by_date",
    "rc"."created_at",
    "rc"."updated_at",
    "rc"."user_id",
    "fr"."id" AS "feedback_request_id",
    "fr"."status" AS "request_status",
    "fr"."target_responses",
    "fr"."created_at" AS "request_created_at",
    "fr"."updated_at" AS "request_updated_at",
    "fr"."manually_completed",
    "fr"."review_cycle_id",
    "fr"."employee_id",
    "fr"."unique_link",
    "ar"."id" AS "ai_report_id",
    "ar"."status" AS "ai_report_status",
    "ar"."is_final",
    "ar"."created_at" AS "ai_report_created_at",
    "ar"."updated_at" AS "ai_report_updated_at",
    "ar"."error" AS "ai_report_error",
    "ar"."content" AS "ai_report_content",
    "fres"."id" AS "response_id",
    "fres"."status" AS "response_status",
    "fres"."created_at" AS "response_created_at",
    "fres"."submitted_at" AS "response_submitted_at",
    "fres"."relationship",
    "fres"."strengths",
    "fres"."areas_for_improvement",
    "fres"."overall_rating"
   FROM ((("public"."review_cycles" "rc"
     LEFT JOIN "public"."feedback_requests" "fr" ON (("fr"."review_cycle_id" = "rc"."id")))
     LEFT JOIN "public"."ai_reports" "ar" ON (("ar"."feedback_request_id" = "fr"."id")))
     LEFT JOIN "public"."feedback_responses" "fres" ON (("fres"."feedback_request_id" = "fr"."id")));


ALTER TABLE "public"."review_cycles_with_feedback" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."schema_migrations" (
    "version" "text" NOT NULL,
    "executed_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."schema_migrations" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."user_review_cycles" WITH ("security_barrier"='true') AS
 WITH "feedback_counts" AS (
         SELECT "rc_1"."id" AS "review_cycle_id",
            "count"(DISTINCT "fr_1"."id") AS "feedback_request_count",
            "count"(DISTINCT
                CASE
                    WHEN ("fr_1"."status" = 'completed'::"text") THEN "fr_1"."id"
                    ELSE NULL::"uuid"
                END) AS "completed_feedback_count"
           FROM ("public"."review_cycles" "rc_1"
             LEFT JOIN "public"."feedback_requests" "fr_1" ON (("fr_1"."review_cycle_id" = "rc_1"."id")))
          WHERE ("rc_1"."user_id" = "auth"."uid"())
          GROUP BY "rc_1"."id"
        )
 SELECT "rc"."id",
    "rc"."title",
    "rc"."status",
    "rc"."created_at",
    "rc"."created_by",
    "rc"."review_by_date",
    "rc"."user_id",
    "fr"."id" AS "feedback_request_id",
    "fr"."status" AS "feedback_request_status",
    "fr"."target_responses",
    "e"."name" AS "employee_name",
    "e"."role" AS "employee_role",
    COALESCE("fc"."feedback_request_count", (0)::bigint) AS "feedback_request_count",
    COALESCE("fc"."completed_feedback_count", (0)::bigint) AS "completed_feedback_count"
   FROM ((("public"."review_cycles" "rc"
     LEFT JOIN "public"."feedback_requests" "fr" ON (("fr"."review_cycle_id" = "rc"."id")))
     LEFT JOIN "public"."employees" "e" ON (("e"."id" = "fr"."employee_id")))
     LEFT JOIN "feedback_counts" "fc" ON (("fc"."review_cycle_id" = "rc"."id")))
  WHERE ("rc"."user_id" = "auth"."uid"());


ALTER TABLE "public"."user_review_cycles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."ai_reports"
    ADD CONSTRAINT "ai_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_analyses"
    ADD CONSTRAINT "feedback_analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_analytics"
    ADD CONSTRAINT "feedback_analytics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_analytics"
    ADD CONSTRAINT "feedback_analytics_request_id_key" UNIQUE ("feedback_request_id");



ALTER TABLE ONLY "public"."feedback_requests"
    ADD CONSTRAINT "feedback_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_requests"
    ADD CONSTRAINT "feedback_requests_unique_link_key" UNIQUE ("unique_link");



ALTER TABLE ONLY "public"."feedback_responses_backup"
    ADD CONSTRAINT "feedback_responses_backup_feedback_request_id_session_id_key" UNIQUE ("feedback_request_id", "session_id");



ALTER TABLE ONLY "public"."feedback_responses_backup"
    ADD CONSTRAINT "feedback_responses_backup_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."feedback_responses"
    ADD CONSTRAINT "feedback_responses_new_pkey1" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_cycles"
    ADD CONSTRAINT "review_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."schema_migrations"
    ADD CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version");



CREATE INDEX "idx_backup_feedback_request_id" ON "public"."feedback_responses_backup" USING "btree" ("feedback_request_id");



CREATE INDEX "idx_backup_session_id" ON "public"."feedback_responses_backup" USING "btree" ("session_id");



CREATE INDEX "idx_employees_user_id" ON "public"."employees" USING "btree" ("user_id");



CREATE INDEX "idx_feedback_analytics_hash" ON "public"."feedback_analytics" USING "btree" ("feedback_hash");



CREATE INDEX "idx_feedback_analytics_request_id" ON "public"."feedback_analytics" USING "btree" ("feedback_request_id");



CREATE INDEX "idx_feedback_requests_employee_id" ON "public"."feedback_requests" USING "btree" ("employee_id");



CREATE INDEX "idx_feedback_requests_review_cycle_id" ON "public"."feedback_requests" USING "btree" ("review_cycle_id");



CREATE INDEX "idx_feedback_requests_unique_link" ON "public"."feedback_requests" USING "btree" ("unique_link");



CREATE INDEX "idx_page_views_created_at" ON "public"."page_views" USING "btree" ("created_at");



CREATE INDEX "idx_page_views_feedback_request_id" ON "public"."page_views" USING "btree" ("feedback_request_id");



CREATE INDEX "idx_page_views_user_id" ON "public"."page_views" USING "btree" ("user_id");



CREATE INDEX "idx_review_cycles_user_id" ON "public"."review_cycles" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "ensure_completed_has_content" BEFORE INSERT OR UPDATE ON "public"."ai_reports" FOR EACH ROW EXECUTE FUNCTION "public"."check_ai_report_content"();



CREATE OR REPLACE TRIGGER "handle_feedback_response" BEFORE INSERT ON "public"."feedback_responses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_feedback_response"();



CREATE OR REPLACE TRIGGER "log_employees_policies" AFTER INSERT OR DELETE OR UPDATE ON "public"."employees" FOR EACH STATEMENT EXECUTE FUNCTION "public"."log_policy_evaluation"();



CREATE OR REPLACE TRIGGER "log_feedback_requests_policies" AFTER INSERT OR DELETE OR UPDATE ON "public"."feedback_requests" FOR EACH STATEMENT EXECUTE FUNCTION "public"."log_policy_evaluation"();



CREATE OR REPLACE TRIGGER "log_review_cycles_policies" AFTER INSERT OR DELETE OR UPDATE ON "public"."review_cycles" FOR EACH STATEMENT EXECUTE FUNCTION "public"."log_policy_evaluation"();



CREATE OR REPLACE TRIGGER "set_review_cycle_created_by_trigger" BEFORE INSERT ON "public"."review_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."set_review_cycle_created_by"();



CREATE OR REPLACE TRIGGER "set_updated_at" BEFORE UPDATE ON "public"."ai_reports" FOR EACH ROW EXECUTE FUNCTION "public"."trigger_set_updated_at"();



CREATE OR REPLACE TRIGGER "update_ai_reports_updated_at" BEFORE UPDATE ON "public"."ai_reports" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_employees_updated_at" BEFORE UPDATE ON "public"."employees" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_feedback_request_status_trigger" AFTER INSERT OR DELETE ON "public"."feedback_responses" FOR EACH ROW EXECUTE FUNCTION "public"."update_feedback_request_status"();



CREATE OR REPLACE TRIGGER "update_feedback_requests_updated_at" BEFORE UPDATE ON "public"."feedback_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_page_views_updated_at" BEFORE UPDATE ON "public"."page_views" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_review_cycle_status_trigger" AFTER UPDATE OF "status" ON "public"."feedback_requests" FOR EACH ROW EXECUTE FUNCTION "public"."update_review_cycle_status"();



CREATE OR REPLACE TRIGGER "update_review_cycles_updated_at" BEFORE UPDATE ON "public"."review_cycles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."ai_reports"
    ADD CONSTRAINT "ai_reports_feedback_request_id_fkey" FOREIGN KEY ("feedback_request_id") REFERENCES "public"."feedback_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_requests"
    ADD CONSTRAINT "employees_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."employees"
    ADD CONSTRAINT "employees_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."feedback_analytics"
    ADD CONSTRAINT "feedback_analytics_feedback_request_id_fkey" FOREIGN KEY ("feedback_request_id") REFERENCES "public"."feedback_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_responses"
    ADD CONSTRAINT "feedback_responses_feedback_request_id_fkey" FOREIGN KEY ("feedback_request_id") REFERENCES "public"."feedback_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."feedback_responses"
    ADD CONSTRAINT "feedback_responses_previous_version_id_fkey" FOREIGN KEY ("previous_version_id") REFERENCES "public"."feedback_responses"("id");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_feedback_request_id_fkey" FOREIGN KEY ("feedback_request_id") REFERENCES "public"."feedback_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_cycles"
    ADD CONSTRAINT "review_cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."feedback_requests"
    ADD CONSTRAINT "review_cycles_id_fkey" FOREIGN KEY ("review_cycle_id") REFERENCES "public"."review_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."review_cycles"
    ADD CONSTRAINT "review_cycles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



CREATE POLICY "Anyone can create page views" ON "public"."page_views" FOR INSERT TO "anon" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."feedback_requests" "fr"
  WHERE ("fr"."id" = "page_views"."feedback_request_id"))));



CREATE POLICY "Anyone can view AI reports through unique link" ON "public"."ai_reports" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."feedback_requests" "fr"
  WHERE (("fr"."id" = "ai_reports"."feedback_request_id") AND ("fr"."unique_link" IS NOT NULL)))));



CREATE POLICY "Users can create AI reports for their feedback requests" ON "public"."ai_reports" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE (("fr"."id" = "ai_reports"."feedback_request_id") AND ("rc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create and update feedback analytics for their employ" ON "public"."feedback_analytics" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE (("fr"."id" = "feedback_analytics"."feedback_request_id") AND ("rc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can create their own review cycles" ON "public"."review_cycles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own AI reports" ON "public"."ai_reports" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE (("fr"."id" = "ai_reports"."feedback_request_id") AND ("rc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can delete their own employees" ON "public"."employees" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete their own review cycles" ON "public"."review_cycles" FOR DELETE TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert their own employees" ON "public"."employees" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update their own AI reports" ON "public"."ai_reports" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE (("fr"."id" = "ai_reports"."feedback_request_id") AND ("rc"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE (("fr"."id" = "ai_reports"."feedback_request_id") AND ("rc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can update their own employees" ON "public"."employees" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own review cycles" ON "public"."review_cycles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view AI reports for their feedback requests" ON "public"."ai_reports" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE (("fr"."id" = "ai_reports"."feedback_request_id") AND ("rc"."user_id" = "auth"."uid"())))));



CREATE POLICY "Users can view feedback analytics for their employees" ON "public"."feedback_analytics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE (("fr"."id" = "feedback_analytics"."feedback_request_id") AND ("rc"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."ai_reports" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "anon_insert_feedback_analyses" ON "public"."feedback_analyses" FOR INSERT TO "anon" WITH CHECK (true);



CREATE POLICY "auth_view_feedback_analyses" ON "public"."feedback_analyses" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."employees" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "employees_anon_select" ON "public"."employees" FOR SELECT USING (("id" IN ( SELECT "feedback_requests"."employee_id"
   FROM "public"."feedback_requests"
  WHERE ("feedback_requests"."unique_link" IS NOT NULL))));



CREATE POLICY "employees_auth_select" ON "public"."employees" FOR SELECT TO "authenticated" USING ((("user_id" = "auth"."uid"()) OR ("id" IN ( SELECT "feedback_requests"."employee_id"
   FROM "public"."feedback_requests"
  WHERE ("feedback_requests"."review_cycle_id" IN ( SELECT "review_cycles"."id"
           FROM "public"."review_cycles"
          WHERE ("review_cycles"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."feedback_analyses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_analyses_insert_policy" ON "public"."feedback_analyses" FOR INSERT WITH CHECK (true);



CREATE POLICY "feedback_analyses_select_policy" ON "public"."feedback_analyses" FOR SELECT USING (true);



ALTER TABLE "public"."feedback_analytics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."feedback_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_requests_anon_select" ON "public"."feedback_requests" FOR SELECT USING (("unique_link" IS NOT NULL));



CREATE POLICY "feedback_requests_auth_select" ON "public"."feedback_requests" FOR SELECT TO "authenticated" USING (("review_cycle_id" IN ( SELECT "review_cycles"."id"
   FROM "public"."review_cycles"
  WHERE ("review_cycles"."user_id" = "auth"."uid"()))));



CREATE POLICY "feedback_requests_auth_update" ON "public"."feedback_requests" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."review_cycles"
  WHERE (("review_cycles"."id" = "feedback_requests"."review_cycle_id") AND ("review_cycles"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."feedback_responses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "feedback_responses_anon_insert" ON "public"."feedback_responses" FOR INSERT TO "anon" WITH CHECK (("feedback_request_id" IN ( SELECT "fr"."id"
   FROM "public"."feedback_requests" "fr"
  WHERE ("fr"."unique_link" IS NOT NULL))));



CREATE POLICY "feedback_responses_anon_select" ON "public"."feedback_responses" FOR SELECT USING (("feedback_request_id" IN ( SELECT "feedback_requests"."id"
   FROM "public"."feedback_requests"
  WHERE ("feedback_requests"."unique_link" IS NOT NULL))));



CREATE POLICY "feedback_responses_anon_update" ON "public"."feedback_responses" FOR UPDATE TO "anon" USING ((("session_id" IS NOT NULL) AND ("status" = 'in_progress'::"text"))) WITH CHECK ((("session_id" IS NOT NULL) AND (("status" = 'in_progress'::"text") OR (("status" = 'submitted'::"text") AND ("submitted_at" IS NOT NULL)))));



CREATE POLICY "feedback_responses_auth_access" ON "public"."feedback_responses" TO "authenticated" USING (("feedback_request_id" IN ( SELECT "feedback_requests"."id"
   FROM "public"."feedback_requests"
  WHERE ("feedback_requests"."review_cycle_id" IN ( SELECT "review_cycles"."id"
           FROM "public"."review_cycles"
          WHERE ("review_cycles"."user_id" = "auth"."uid"())))))) WITH CHECK (("feedback_request_id" IN ( SELECT "feedback_requests"."id"
   FROM "public"."feedback_requests"
  WHERE ("feedback_requests"."review_cycle_id" IN ( SELECT "review_cycles"."id"
           FROM "public"."review_cycles"
          WHERE ("review_cycles"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."page_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "page_views_insert_policy" ON "public"."page_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "page_views_select_policy" ON "public"."page_views" FOR SELECT USING (true);



ALTER TABLE "public"."review_cycles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "review_cycles_anon_select" ON "public"."review_cycles" FOR SELECT USING (("id" IN ( SELECT "feedback_requests"."review_cycle_id"
   FROM "public"."feedback_requests"
  WHERE ("feedback_requests"."unique_link" IS NOT NULL))));



CREATE POLICY "review_cycles_auth_select" ON "public"."review_cycles" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "update_previous_version_policy" ON "public"."feedback_responses" FOR UPDATE TO "authenticated" USING (("feedback_request_id" IN ( SELECT "fr"."id"
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE ("rc"."user_id" = "auth"."uid"())))) WITH CHECK (("feedback_request_id" IN ( SELECT "fr"."id"
   FROM ("public"."feedback_requests" "fr"
     JOIN "public"."review_cycles" "rc" ON (("fr"."review_cycle_id" = "rc"."id")))
  WHERE ("rc"."user_id" = "auth"."uid"()))));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";
GRANT USAGE ON SCHEMA "public" TO "anon";




















































































































































































GRANT ALL ON FUNCTION "public"."check_ai_report_content"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_ai_report_content"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_ai_report_content"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_feedback_response"("p_feedback_request_id" "uuid", "p_session_id" "text", "p_relationship" "text", "p_strengths" "text", "p_areas_for_improvement" "text", "p_status" "text", "p_submitted_at" timestamp with time zone) TO "anon";
GRANT ALL ON FUNCTION "public"."create_feedback_response"("p_feedback_request_id" "uuid", "p_session_id" "text", "p_relationship" "text", "p_strengths" "text", "p_areas_for_improvement" "text", "p_status" "text", "p_submitted_at" timestamp with time zone) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_feedback_response"("p_feedback_request_id" "uuid", "p_session_id" "text", "p_relationship" "text", "p_strengths" "text", "p_areas_for_improvement" "text", "p_status" "text", "p_submitted_at" timestamp with time zone) TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_feedback_with_references"("feedback_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_feedback_with_references"("feedback_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_feedback_with_references"("feedback_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_user_account"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_feedback_response"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_feedback_response"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_feedback_response"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_policy_evaluation"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_policy_evaluation"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_policy_evaluation"() TO "service_role";



GRANT ALL ON FUNCTION "public"."random_feedback_text"("category" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."random_feedback_text"("category" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."random_feedback_text"("category" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_review_cycle_created_by"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_review_cycle_created_by"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_review_cycle_created_by"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trigger_set_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_feedback_request_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_feedback_request_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_feedback_request_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_review_cycle_status"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_review_cycle_status"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_review_cycle_status"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."ai_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."ai_reports" TO "service_role";
GRANT SELECT ON TABLE "public"."ai_reports" TO "anon";



GRANT ALL ON TABLE "public"."employees" TO "service_role";
GRANT SELECT ON TABLE "public"."employees" TO "anon";
GRANT ALL ON TABLE "public"."employees" TO "authenticated";



GRANT ALL ON TABLE "public"."feedback_requests" TO "service_role";
GRANT SELECT ON TABLE "public"."feedback_requests" TO PUBLIC;
GRANT SELECT,UPDATE ON TABLE "public"."feedback_requests" TO "anon";
GRANT ALL ON TABLE "public"."feedback_requests" TO "authenticated";



GRANT ALL ON TABLE "public"."review_cycles" TO "service_role";
GRANT SELECT ON TABLE "public"."review_cycles" TO PUBLIC;
GRANT SELECT ON TABLE "public"."review_cycles" TO "anon";
GRANT ALL ON TABLE "public"."review_cycles" TO "authenticated";



GRANT ALL ON TABLE "public"."employee_access_paths" TO "anon";
GRANT ALL ON TABLE "public"."employee_access_paths" TO "authenticated";
GRANT ALL ON TABLE "public"."employee_access_paths" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_analyses" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."feedback_analyses" TO "anon";



GRANT ALL ON TABLE "public"."feedback_analytics" TO "anon";
GRANT ALL ON TABLE "public"."feedback_analytics" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_analytics" TO "service_role";



GRANT ALL ON TABLE "public"."feedback_responses" TO "service_role";
GRANT INSERT ON TABLE "public"."feedback_responses" TO PUBLIC;
GRANT SELECT,INSERT,DELETE,UPDATE ON TABLE "public"."feedback_responses" TO "anon";
GRANT ALL ON TABLE "public"."feedback_responses" TO "authenticated";



GRANT ALL ON TABLE "public"."feedback_responses_backup" TO "anon";
GRANT ALL ON TABLE "public"."feedback_responses_backup" TO "authenticated";
GRANT ALL ON TABLE "public"."feedback_responses_backup" TO "service_role";



GRANT ALL ON TABLE "public"."page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."page_views" TO "service_role";
GRANT SELECT,INSERT ON TABLE "public"."page_views" TO "anon";



GRANT ALL ON TABLE "public"."policy_backup_20240130" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240130_circular" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130_circular" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130_circular" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240130_employees" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130_employees" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240130_employees_final" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130_employees_final" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130_employees_final" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240130_feedback" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240130_final" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130_final" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130_final" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240130_full" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130_full" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130_full" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240130_responses" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240130_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240130_responses" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_all" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_all" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_all" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_all_final" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_all_final" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_all_final" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_employees" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_auth" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_auth" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_auth" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_auth2" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_auth2" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_auth2" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final2" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final2" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final2" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final3" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final3" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final3" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final4" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final4" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_employees_final4" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_auth" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_auth" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_auth" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_final" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_final" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_final" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_requests" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_feedback_requests" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_final" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_final" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_final" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_final5" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_final5" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_final5" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_final6" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_final6" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_final6" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_anon" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_anon" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_anon" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_final" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_final" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_final" TO "service_role";



GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_final2" TO "anon";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_final2" TO "authenticated";
GRANT ALL ON TABLE "public"."policy_backup_20240131_review_cycles_final2" TO "service_role";



GRANT ALL ON TABLE "public"."review_cycles_feedback_summary" TO "anon";
GRANT ALL ON TABLE "public"."review_cycles_feedback_summary" TO "authenticated";
GRANT ALL ON TABLE "public"."review_cycles_feedback_summary" TO "service_role";



GRANT ALL ON TABLE "public"."review_cycles_with_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."review_cycles_with_feedback" TO "service_role";



GRANT ALL ON TABLE "public"."schema_migrations" TO "anon";
GRANT ALL ON TABLE "public"."schema_migrations" TO "authenticated";
GRANT ALL ON TABLE "public"."schema_migrations" TO "service_role";



GRANT ALL ON TABLE "public"."user_review_cycles" TO "anon";
GRANT ALL ON TABLE "public"."user_review_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_review_cycles" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























RESET ALL;
