# Squad360 Database Documentation

## Core Tables

### Review Cycles
Primary table for managing feedback review cycles.
- `id`: UUID (PK)
- `title`: text
- `status`: text (default: 'draft')
- `review_by_date`: date
- `user_id`: UUID (owner)
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
- `review_cycle_id`: UUID (FK → review_cycles, CASCADE)
- `employee_id`: UUID (FK → employees, CASCADE)
- `unique_link`: text (unique)
- `status`: text (default: 'pending')
- `target_responses`: integer (default: 3)
- `manually_completed`: boolean
- Timestamps: `created_at`, `updated_at`

### Feedback Responses
Stores individual feedback responses.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests, CASCADE)
- `relationship`: text
- `strengths`: text
- `areas_for_improvement`: text
- `session_id`: UUID
- `previous_version_id`: UUID (FK → feedback_responses, NO ACTION)
- Timestamps: `submitted_at`, `created_at`

## Analytics Tables

### Feedback Analytics
Stores AI-generated insights from feedback.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests, CASCADE)
- `insights`: jsonb
- `feedback_hash`: text
- Timestamps: `last_analyzed_at`, `created_at`, `updated_at`

### AI Reports
Stores AI-generated reports.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests, CASCADE)
- `content`: text
- `status`: text (default: 'pending')
- `is_final`: boolean
- `error`: text
- Timestamps: `created_at`, `updated_at`

### Page Views
Tracks page views for analytics.
- `id`: UUID (PK)
- `feedback_request_id`: UUID (FK → feedback_requests, CASCADE)
- `user_id`: UUID (FK → auth.users, CASCADE)
- `session_id`: text
- `page_url`: text
- Timestamps: `created_at`, `updated_at`

## Key Relationships and Cascade Rules
1. Review Cycles (1) → Feedback Requests (*) [CASCADE]
2. Employees (1) → Feedback Requests (*) [CASCADE]
3. Feedback Requests (1) → Feedback Responses (*) [CASCADE]
4. Feedback Requests (1) → Feedback Analytics (1) [CASCADE]
5. Feedback Requests (1) → AI Reports (*) [CASCADE]
6. Feedback Requests (1) → Page Views (*) [CASCADE]
7. Feedback Responses (1) → Feedback Responses (*) [NO ACTION] (previous_version_id)

## Row Level Security (RLS) Policies

### Authentication Levels
1. Public (anonymous)
   - Basic SELECT access with unique_link
   - Limited INSERT/UPDATE for feedback responses
   - No direct table ownership
   - Access through feedback_requests.unique_link only
2. Authenticated users
   - Full CRUD on owned resources
   - SELECT access to related resources
   - Primary ownership through user_id
   - Cascading access through relationships

### Table-Specific Policies

1. **Review Cycles** (Base Table)
   ```sql
   -- Auth Select: Only checks auth.uid()
   CREATE POLICY "review_cycles_auth_select" ON review_cycles
       FOR SELECT TO authenticated
       USING (user_id = auth.uid());

   -- Anon Select: Through feedback requests
   CREATE POLICY "review_cycles_anon_select" ON review_cycles
       FOR SELECT TO public
       USING (EXISTS (
           SELECT 1 FROM feedback_requests 
           WHERE feedback_requests.review_cycle_id = review_cycles.id 
           AND feedback_requests.unique_link IS NOT NULL
       ));
   ```

2. **Feedback Requests** (Depends on Review Cycles)
   ```sql
   -- Auth Select: Through review cycle ownership
   CREATE POLICY "feedback_requests_auth_select" ON feedback_requests
       FOR SELECT TO authenticated
       USING (EXISTS (
           SELECT 1 FROM review_cycles 
           WHERE review_cycles.id = feedback_requests.review_cycle_id 
           AND review_cycles.user_id = auth.uid()
       ));

   -- Anon Select: Direct unique_link check
   CREATE POLICY "feedback_requests_anon_select" ON feedback_requests
       FOR SELECT TO public
       USING (unique_link IS NOT NULL);
   ```

3. **Employees** (Direct ownership OR through feedback requests)
   ```sql
   -- Auth Select: Direct ownership OR through feedback requests
   CREATE POLICY "employees_auth_select" ON employees
       FOR SELECT TO authenticated
       USING (
           user_id = auth.uid()
           OR 
           EXISTS (
               SELECT 1 FROM feedback_requests fr
               WHERE fr.employee_id = employees.id
               AND EXISTS (
                   SELECT 1 FROM review_cycles rc
                   WHERE rc.id = fr.review_cycle_id
                   AND rc.user_id = auth.uid()
               )
           )
       );

   -- Anon Select: Through feedback requests
   CREATE POLICY "employees_anon_select" ON employees
       FOR SELECT TO public
       USING (EXISTS (
           SELECT 1 FROM feedback_requests
           WHERE feedback_requests.employee_id = employees.id
           AND feedback_requests.unique_link IS NOT NULL
       ));
   ```

### Performance Optimizations
1. Required Indexes
   ```sql
   CREATE INDEX idx_employees_user_id ON employees(user_id);
   CREATE INDEX idx_review_cycles_user_id ON review_cycles(user_id);
   CREATE INDEX idx_feedback_requests_review_cycle_id ON feedback_requests(review_cycle_id);
   CREATE INDEX idx_feedback_requests_employee_id ON feedback_requests(employee_id);
   ```

### Policy Design Principles
1. Hierarchical Access
   - Review Cycles: Base table, only checks auth.uid()
   - Feedback Requests: Only depends on review cycles
   - Employees: Direct ownership OR through feedback requests

2. Query Optimization
   - Use EXISTS clauses for better performance with indexes
   - Avoid circular dependencies in policy definitions
   - Keep policy checks as simple as possible
   - Use proper indexes for all foreign key relationships

3. Access Patterns
   - Authenticated: Direct ownership through user_id
   - Anonymous: Single entry point through unique_link
   - Hierarchical: Clear parent-child relationships

4. Security Considerations
   - RLS enabled on all tables
   - No circular policy references
   - Clear separation between anonymous and authenticated access
   - Proper index coverage for policy queries

### Lessons Learned
1. Policy Structure
   - Keep policies simple and hierarchical
   - Avoid complex joins in policy definitions
   - Use EXISTS over IN for better performance
   - Ensure proper indexing for all policy queries

2. Common Issues
   - Circular dependencies can cause infinite recursion
   - Complex joins can lead to performance issues
   - Missing indexes can slow down policy evaluation
   - Overly complex policies are hard to maintain

3. Best Practices
   - Start with simple policies and add complexity only when needed
   - Test policies with real-world data volumes
   - Monitor query performance with EXPLAIN ANALYZE
   - Keep policy chains short and direct

### Current Table Status
- Active Tables: review_cycles (5), employees (13), feedback_requests (9), feedback_responses (43), ai_reports (9), feedback_analytics (7), page_views (1617)
- All tables have RLS enabled and properly configured
- Indexes in place for all policy-related queries
- No circular dependencies in policy definitions

## Data Integrity
- No orphaned records found in any tables
- All CASCADE delete rules working correctly
- Single NO ACTION constraint on feedback_responses.previous_version_id
- Verified RLS policies on all tables

## Security Considerations
1. All tables have RLS enabled and properly configured
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

## Migration Management
- Uses `schema_migrations` table
- Tracks version and execution time
- Multiple policy backup tables present from January 2024 migrations

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