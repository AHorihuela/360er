# Squad360 Database Documentation

## Core Tables

### Review Cycles
Primary table for managing feedback review cycles.
- `id`: UUID (PK)
- `title`: text
- `status`: text (default: 'draft')
- `review_by_date`: date
- `user_id`: UUID (owner)
- `created_by`: UUID
- Timestamps: `created_at`, `updated_at`

### Employees
Stores employee information managed by users.
- `id`: UUID (PK)
- `name`: text
- `role`: text
- `user_id`: UUID (owner)
- Timestamps: `created_at`, `updated_at`

### Feedback Requests
Links employees to review cycles and manages feedback collection.
- `id`: UUID (PK)
- `review_cycle_id`: UUID (FK → review_cycles)
- `employee_id`: UUID (FK → employees)
- `unique_link`: text (unique)
- `status`: text (default: 'pending')
- `target_responses`: integer (default: 3)
- `manually_completed`: boolean
- Timestamps: `created_at`, `updated_at`

### Feedback Responses
Stores individual feedback responses.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests)
- `relationship`: text
- `strengths`: text
- `areas_for_improvement`: text
- `overall_rating`: integer
- `status`: text
- `session_id`: text
- `previous_version_id`: UUID (FK → feedback_responses)
- Timestamps: `submitted_at`, `created_at`

## Analytics Tables

### Feedback Analytics
Stores AI-generated insights from feedback.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests)
- `insights`: jsonb
- `feedback_hash`: text
- Timestamps: `last_analyzed_at`, `created_at`, `updated_at`

### AI Reports
Stores AI-generated reports.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests)
- `content`: text
- `status`: text (default: 'pending')
- `is_final`: boolean
- `error`: text
- Timestamps: `created_at`, `updated_at`

### Page Views
Tracks page views for analytics.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests)
- `user_id`: UUID
- `session_id`: text
- `page_url`: text
- Timestamps: `created_at`, `updated_at`

## Key Relationships
1. Review Cycles (1) → Feedback Requests (*)
2. Employees (1) → Feedback Requests (*)
3. Feedback Requests (1) → Feedback Responses (*)
4. Feedback Requests (1) → Feedback Analytics (1)
5. Feedback Requests (1) → AI Reports (*)

## Indexes
1. Primary Keys: All tables have UUID primary keys
2. Foreign Keys: All relationships are indexed
3. Special Indexes:
   - `feedback_requests`: unique_link (unique + index)
   - `feedback_analytics`: feedback_hash
   - `page_views`: created_at

## RLS Policies

### Authentication Levels
1. Public (anonymous)
2. Authenticated users

### Key Policy Patterns
1. **Review Cycles**
   - Authenticated: CRUD on own cycles
   - Public: SELECT with unique_link

2. **Feedback Requests**
   - Authenticated: CRUD on own requests
   - Public: SELECT with unique_link

3. **Feedback Responses**
   - Authenticated: Full access to own cycle responses
   - Public: INSERT/UPDATE with session_id
   - Public: SELECT with unique_link

4. **Analytics**
   - Authenticated: Full access to own analytics
   - No public access

## Functions
1. `update_feedback_request_status`: Trigger
2. `check_ai_report_content`: Trigger
3. `delete_feedback_with_references`: Utility
4. `create_feedback_response`: Core
5. `handle_feedback_response`: Trigger
6. `update_review_cycle_status`: Trigger
7. `set_review_cycle_created_by`: Trigger
8. `update_updated_at_column`: Trigger

## Security Model
1. All tables have RLS enabled
2. Authentication through Supabase auth
3. Row-level ownership through user_id
4. Anonymous access through unique_link
5. Session-based response tracking

## Performance Considerations
1. Indexed foreign keys for relationship queries
2. Hash indexes for analytics lookups
3. Composite indexes for common query patterns
4. Trigger-based status updates
5. Optimized unique_link lookups

## Backup Tables
- `feedback_responses_backup`: Mirror of feedback_responses
- Multiple policy backup tables (dated 20240130/31)

## Migration Management
- Uses `schema_migrations` table
- Tracks version and execution time

## Database Schema

### feedback_analytics
- `id` UUID PRIMARY KEY
- `feedback_request_id` UUID REFERENCES feedback_requests(id)
- `insights` JSONB[]
- `last_analyzed_at` TIMESTAMPTZ
- `feedback_hash` TEXT
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()

The `insights` array contains structured feedback analysis with the following sections:
- themes (array of strings)
- competencies (array of objects with name, score, confidence, description, evidenceCount, roleSpecificNotes)
- relationship (string: "aggregate", "senior", "peer", "junior")
- responseCount (number)
- uniquePerspectives (array of strings)

### feedback_responses
- `relationship` TEXT
- `strengths` TEXT
- `areas_for_improvement` TEXT
- `feedback_request_id` UUID REFERENCES feedback_requests(id)

Relationship types:
- senior_colleague
- equal_colleague
- junior_colleague

### ai_reports
- `id` UUID PRIMARY KEY
- `feedback_request_id` UUID REFERENCES feedback_requests(id)
- `content` TEXT
- `created_at` TIMESTAMPTZ DEFAULT NOW()
- `updated_at` TIMESTAMPTZ DEFAULT NOW()
- `is_final` BOOLEAN
- `status` TEXT
- `error` TEXT

Status types:
- completed
- error
- pending

### RLS Policies

#### feedback_analytics
- Users can view analytics for feedback requests they have access to
- Users can create and update analytics for feedback requests they own