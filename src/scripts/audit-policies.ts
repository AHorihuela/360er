import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable')
}

if (!supabaseKey) {
  throw new Error('Missing VITE_SUPABASE_ANON_KEY environment variable')
}

// Script-specific Supabase client - isolated from other clients
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Don't persist session in scripts
    autoRefreshToken: false, // No auto-refresh in scripts
    detectSessionInUrl: false // No URL detection in scripts
  },
  global: {
    headers: {
      'X-Client-Info': 'audit-script-client' // Help identify in logs
    }
  }
})

async function auditPolicies() {
  try {
    // First get a valid review cycle
    const { data: cycles, error: cycleError } = await supabase
      .from('review_cycles')
      .select('id, user_id')
      .limit(1)

    if (cycleError) {
      console.error('Error getting review cycles:', cycleError)
      return
    }

    console.log('Found review cycle:', cycles?.[0])

    if (!cycles?.[0]) {
      console.error('No review cycles found')
      return
    }

    // Try to read feedback_requests table
    const { data: requests, error: reqError } = await supabase
      .from('feedback_requests')
      .select('*')
      .eq('review_cycle_id', cycles[0].id)
      .limit(1)

    if (reqError) {
      console.error('Error reading feedback_requests:', reqError)
    } else {
      console.log('Can read feedback_requests:', requests)
    }

    // Try to insert a test record with valid review_cycle_id
    const { data: insertTest, error: insertError } = await supabase
      .from('feedback_requests')
      .insert([
        {
          review_cycle_id: cycles[0].id,
          employee_id: '2a4a6410-79df-4f92-9e79-cbe20f2f56db', // Using existing employee ID
          unique_link: 'test-link',
          status: 'pending'
        }
      ])
      .select()

    if (insertError) {
      console.error('Insert test failed:', insertError)
      console.error('Policy requires:')
      console.error('1. Authenticated user (current: anon)')
      console.error(`2. User must own review cycle (id: ${cycles[0].id}, user_id: ${cycles[0].user_id})`)
    } else {
      console.log('Insert test succeeded:', insertTest)
      
      // Clean up test record
      await supabase
        .from('feedback_requests')
        .delete()
        .eq('unique_link', 'test-link')
    }

  } catch (err) {
    console.error('Unexpected error:', err)
  }
}

auditPolicies() 