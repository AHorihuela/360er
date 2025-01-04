import { supabase } from '../lib/supabase';

async function checkDrafts() {
  const { data, error } = await supabase
    .from('feedback_responses')
    .select('id, status, created_at, submitted_at, updated_at')
    .eq('status', 'in_progress')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching drafts:', error);
    return;
  }

  console.log('Recent drafts:');
  console.table(data);
}

checkDrafts(); 