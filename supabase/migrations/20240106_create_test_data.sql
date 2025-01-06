-- Create test user if not exists
INSERT INTO auth.users (id, email)
VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    'test@example.com'
) ON CONFLICT (id) DO NOTHING;

-- Set up variables
DO $$
DECLARE
    v_cycle_id UUID := gen_random_uuid();
    v_request_id UUID := gen_random_uuid();
    v_employee_id UUID;
BEGIN
    -- Insert test employee
    INSERT INTO employees (id, name, role, user_id)
    VALUES (
        gen_random_uuid(),
        'Test Employee',
        'Software Engineer',
        '00000000-0000-0000-0000-000000000000'::uuid
    )
    RETURNING id INTO v_employee_id;

    -- Insert test review cycle
    INSERT INTO review_cycles (id, user_id, title, status, review_by_date)
    VALUES (
        v_cycle_id,
        '00000000-0000-0000-0000-000000000000'::uuid,
        'Test Review Cycle',
        'active',
        CURRENT_DATE + INTERVAL '30 days'
    );

    -- Insert test feedback request
    INSERT INTO feedback_requests (id, review_cycle_id, employee_id, unique_link, status, target_responses)
    VALUES (
        v_request_id,
        v_cycle_id,
        v_employee_id,
        encode(gen_random_bytes(32), 'hex'),
        'pending',
        3
    );

    -- Insert test feedback responses
    INSERT INTO feedback_responses (feedback_request_id, relationship, strengths, areas_for_improvement, overall_rating, submitted_at)
    VALUES
        (v_request_id, 'senior', 'Great leadership skills and strategic thinking', 'Could improve delegation', 5, NOW()),
        (v_request_id, 'peer', 'Strong team player and communicator', 'Sometimes takes on too much work', 4, NOW()),
        (v_request_id, 'junior', 'Very supportive and helps team growth', 'Could provide more regular feedback', 4, NOW());

    -- Store the request ID for testing
    PERFORM app_settings.set_setting('test_request_id', v_request_id::text, 'Test feedback request ID for analysis testing');
END $$; 