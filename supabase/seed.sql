-- Seed data for local development and testing
-- Creates comprehensive mock data mirroring production patterns
-- Run with: supabase db reset

-- ============================================
-- EMPLOYEES (6 employees with varying roles)
-- ============================================
-- Note: user_id is NULL because these are employees managed by an authenticated user
-- The authenticated user will be created separately via Supabase Auth UI

INSERT INTO employees (id, name, role, user_id, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Alice Chen', 'Senior Software Engineer', NULL, NOW() - INTERVAL '6 months', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'Bob Martinez', 'Engineering Manager', NULL, NOW() - INTERVAL '6 months', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'Carol Johnson', 'UX Designer', NULL, NOW() - INTERVAL '5 months', NOW()),
  ('44444444-4444-4444-4444-444444444444', 'David Kim', 'Product Manager', NULL, NOW() - INTERVAL '4 months', NOW()),
  ('55555555-5555-5555-5555-555555555555', 'Eva Williams', 'Junior Developer', NULL, NOW() - INTERVAL '3 months', NOW()),
  ('66666666-6666-6666-6666-666666666666', 'Frank Brown', 'Tech Lead', NULL, NOW() - INTERVAL '2 months', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- REVIEW CYCLES (2 cycles: 1 completed, 1 active)
-- ============================================

INSERT INTO review_cycles (id, title, status, review_by_date, user_id, created_at, updated_at) VALUES
  -- Completed cycle from Q4 2024
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Q4 2024 Performance Review', 'completed', '2024-12-31', NULL, NOW() - INTERVAL '3 months', NOW() - INTERVAL '1 month'),
  -- Active cycle for Q1 2025
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Q1 2025 Performance Review', 'active', '2025-03-31', NULL, NOW() - INTERVAL '1 week', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FEEDBACK REQUESTS (8 requests with varying statuses)
-- ============================================

-- Q4 2024 cycle (completed) - all requests completed
INSERT INTO feedback_requests (id, review_cycle_id, employee_id, unique_link, status, target_responses, manually_completed, created_at, updated_at) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'alice-q4-2024', 'completed', 5, false, NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'bob-q4-2024', 'completed', 5, false, NOW() - INTERVAL '3 months', NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- Q1 2025 cycle (active) - various statuses
INSERT INTO feedback_requests (id, review_cycle_id, employee_id, unique_link, status, target_responses, manually_completed, created_at, updated_at) VALUES
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'alice-q1-2025', 'pending', 5, false, NOW() - INTERVAL '1 week', NOW()),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'bob-q1-2025', 'pending', 5, false, NOW() - INTERVAL '1 week', NOW()),
  ('11111111-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'carol-q1-2025', 'pending', 5, false, NOW() - INTERVAL '1 week', NOW()),
  ('22222222-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'david-q1-2025', 'pending', 3, false, NOW() - INTERVAL '1 week', NOW()),
  ('33333333-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'eva-q1-2025', 'pending', 3, false, NOW() - INTERVAL '1 week', NOW()),
  ('44444444-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '66666666-6666-6666-6666-666666666666', 'frank-q1-2025', 'pending', 5, false, NOW() - INTERVAL '1 week', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FEEDBACK RESPONSES (15+ responses with varying relationships)
-- ============================================

-- Alice's Q4 2024 feedback (5 responses - completed)
INSERT INTO feedback_responses (id, feedback_request_id, relationship, strengths, areas_for_improvement, session_id, submitted_at) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'manager',
   'Alice consistently delivers high-quality code with excellent attention to detail. Her technical expertise in React and TypeScript is outstanding. She proactively identifies potential issues and addresses them before they become problems.',
   'Could benefit from being more vocal in team meetings and sharing her expertise with junior developers. Sometimes takes on too much work without delegating.',
   'aaa11111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 months'),
  ('a2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'equal_colleague',
   'Great collaborator who is always willing to help with code reviews. Her documentation is thorough and helpful for onboarding new team members.',
   'Could improve time estimation for complex tasks. Sometimes underestimates the scope of work.',
   'aaa22222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 months'),
  ('a3333333-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'equal_colleague',
   'Excellent problem-solving skills and deep knowledge of the codebase. Always available for pair programming sessions.',
   'Would benefit from taking more ownership of cross-team initiatives.',
   'aaa33333-3333-3333-3333-333333333333', NOW() - INTERVAL '2 months'),
  ('a4444444-4444-4444-4444-444444444444', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'direct_report',
   'Amazing mentor! Alice helped me understand complex architectural decisions and always explains the "why" behind code patterns.',
   'Sometimes moves too fast during explanations - would help to slow down occasionally.',
   'aaa44444-4444-4444-4444-444444444444', NOW() - INTERVAL '2 months'),
  ('a5555555-5555-5555-5555-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'client',
   'Very responsive to client requests and delivers features on time. Clear communication about technical constraints.',
   'Could provide more regular status updates on long-running projects.',
   'aaa55555-5555-5555-5555-555555555555', NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- Bob's Q4 2024 feedback (4 responses - completed)
INSERT INTO feedback_responses (id, feedback_request_id, relationship, strengths, areas_for_improvement, session_id, submitted_at) VALUES
  ('a6666666-6666-6666-6666-666666666666', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'equal_colleague',
   'Bob is an excellent manager who truly cares about his team. He creates a supportive environment and advocates for resources when needed.',
   'Could work on providing more specific technical feedback during code reviews.',
   'bbb11111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 months'),
  ('a7777777-7777-7777-7777-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'direct_report',
   'Very supportive manager who helps with career development. Regular 1:1s are always valuable and focused on growth.',
   'Sometimes shields the team too much from organizational changes - more transparency would be appreciated.',
   'bbb22222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 months'),
  ('a8888888-8888-8888-8888-888888888888', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'direct_report',
   'Creates clear goals and expectations. Good at removing blockers and advocating for the team.',
   'Could improve delegation - sometimes gets too involved in implementation details.',
   'bbb33333-3333-3333-3333-333333333333', NOW() - INTERVAL '2 months'),
  ('a9999999-9999-9999-9999-999999999999', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'manager',
   'Bob runs a high-performing team and handles conflicts professionally. Good at balancing technical debt with feature delivery.',
   'Should work on strategic planning and presenting roadmaps to stakeholders.',
   'bbb44444-4444-4444-4444-444444444444', NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- Some Q1 2025 feedback (active cycle - partial responses)
INSERT INTO feedback_responses (id, feedback_request_id, relationship, strengths, areas_for_improvement, session_id, submitted_at) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'equal_colleague',
   'Alice continues to be a technical leader. Her recent work on the API refactoring was impressive.',
   'Could share more of her knowledge through tech talks or blog posts.',
   'ccc11111-1111-1111-1111-111111111111', NOW() - INTERVAL '3 days'),
  ('b2222222-2222-2222-2222-222222222222', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'manager',
   'Consistently exceeds expectations. Takes ownership of complex problems and sees them through.',
   'Should consider stepping into a tech lead role formally.',
   'ccc22222-2222-2222-2222-222222222222', NOW() - INTERVAL '2 days'),
  ('b3111111-1111-1111-1111-111111111111', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'direct_report',
   'Bob has improved his technical involvement this quarter. More hands-on with architecture decisions.',
   'Still could delegate more operational tasks.',
   'ccc33333-3333-3333-3333-333333333333', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- AI REPORTS (various statuses)
-- ============================================

-- Completed AI report for Alice Q4
INSERT INTO ai_reports (id, feedback_request_id, status, is_final, content, created_at, updated_at) VALUES
  ('ae111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'completed', true,
   '# Performance Summary: Alice Chen\n\n## Overall Assessment\nAlice demonstrates exceptional technical skills and is highly valued by her team.\n\n## Key Strengths\n- Outstanding technical expertise in React and TypeScript\n- Excellent code quality and attention to detail\n- Proactive problem identification\n- Strong mentoring abilities\n\n## Areas for Development\n- Increase visibility in team meetings\n- Improve task estimation accuracy\n- Consider taking on cross-team leadership opportunities\n\n## Recommendations\n1. Consider formal tech lead role\n2. Lead a knowledge-sharing initiative\n3. Mentor junior developers more formally',
   NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
  -- Completed AI report for Bob Q4
  ('ae222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'completed', true,
   '# Performance Summary: Bob Martinez\n\n## Overall Assessment\nBob is an effective manager who creates a supportive team environment.\n\n## Key Strengths\n- Strong people management skills\n- Advocates effectively for team resources\n- Creates clear goals and expectations\n- Handles conflicts professionally\n\n## Areas for Development\n- Provide more technical feedback during reviews\n- Improve organizational transparency with team\n- Delegate implementation details more effectively\n\n## Recommendations\n1. Develop strategic planning presentations\n2. Create delegation framework\n3. Schedule regular team all-hands for transparency',
   NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

-- Pending AI report for active cycle
INSERT INTO ai_reports (id, feedback_request_id, status, is_final, content, created_at, updated_at) VALUES
  ('ae333333-3333-3333-3333-333333333333', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'pending', false, NULL, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- FEEDBACK ANALYTICS (for completed requests)
-- ============================================

INSERT INTO feedback_analytics (id, feedback_request_id, insights, feedback_hash, last_analyzed_at, created_at, updated_at) VALUES
  ('fa111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc',
   '[{"relationship": "manager", "competencies": [{"name": "Technical Skills", "score": 4.8, "confidence": 0.9, "description": "Strong technical expertise", "evidenceCount": 3, "evidenceQuotes": []}, {"name": "Communication", "score": 4.0, "confidence": 0.85, "description": "Clear communication", "evidenceCount": 2, "evidenceQuotes": []}]}, {"relationship": "equal_colleague", "competencies": [{"name": "Collaboration", "score": 4.5, "confidence": 0.88, "description": "Great team player", "evidenceCount": 4, "evidenceQuotes": []}, {"name": "Problem Solving", "score": 4.6, "confidence": 0.9, "description": "Excellent problem solver", "evidenceCount": 3, "evidenceQuotes": []}]}]',
   'hash-alice-q4-2024', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month'),
  ('fa222222-2222-2222-2222-222222222222', 'dddddddd-dddd-dddd-dddd-dddddddddddd',
   '[{"relationship": "direct_report", "competencies": [{"name": "Leadership", "score": 4.5, "confidence": 0.9, "description": "Strong leadership", "evidenceCount": 3, "evidenceQuotes": []}, {"name": "Mentoring", "score": 4.3, "confidence": 0.85, "description": "Supportive mentor", "evidenceCount": 2, "evidenceQuotes": []}]}, {"relationship": "manager", "competencies": [{"name": "Strategic Planning", "score": 3.8, "confidence": 0.8, "description": "Needs improvement", "evidenceCount": 2, "evidenceQuotes": []}, {"name": "Delegation", "score": 3.5, "confidence": 0.75, "description": "Could delegate more", "evidenceCount": 2, "evidenceQuotes": []}]}]',
   'hash-bob-q4-2024', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month', NOW() - INTERVAL '1 month')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER ROLES (for testing role-based access)
-- ============================================

-- Note: These will be linked to actual auth users created via Supabase Auth
-- For testing, create a user in Studio and then update these records

-- ============================================
-- PAGE VIEWS (for analytics testing)
-- ============================================

INSERT INTO page_views (id, feedback_request_id, user_id, session_id, page_url, created_at, updated_at) VALUES
  ('ab111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, 'anon-session-1', '/feedback/alice-q4-2024', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
  ('ab222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', NULL, 'anon-session-2', '/feedback/alice-q4-2024', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months'),
  ('ab333333-3333-3333-3333-333333333333', 'dddddddd-dddd-dddd-dddd-dddddddddddd', NULL, 'anon-session-3', '/feedback/bob-q4-2024', NOW() - INTERVAL '2 months', NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- SUMMARY
-- ============================================
-- This seed creates:
-- - 6 employees (various roles)
-- - 2 review cycles (1 completed, 1 active)
-- - 8 feedback requests (2 completed, 6 pending)
-- - 12 feedback responses (various relationships)
-- - 3 AI reports (2 completed, 1 pending)
-- - 2 feedback analytics records
-- - 3 page views for analytics
--
-- To create a test user:
-- 1. Go to http://localhost:54323 (Supabase Studio)
-- 2. Navigate to Authentication > Users
-- 3. Create a new user: test@example.com / testpassword123
-- 4. Copy the user's UUID and update employee records if needed
