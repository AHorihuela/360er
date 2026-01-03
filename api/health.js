// ABOUTME: Health check endpoint to prevent Supabase free tier from pausing.
// ABOUTME: Performs lightweight database query and returns service status.

import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let activityType = 'none';

    // Primary: INSERT then DELETE to simulate real write activity
    const { data, error: insertError } = await supabase
      .from('keep_alive')
      .insert({})
      .select('id')
      .single();

    if (!insertError && data) {
      // Clean up immediately to prevent table bloat
      await supabase.from('keep_alive').delete().eq('id', data.id);
      activityType = 'write';
    } else {
      // Fallback: SELECT query if keep_alive table doesn't exist yet
      const { error: selectError } = await supabase
        .from('review_cycles')
        .select('id')
        .limit(1);

      if (selectError) {
        return res.status(503).json({
          status: 'unhealthy',
          error: 'Database unavailable'
        });
      }
      activityType = 'read';
    }

    return res.status(200).json({
      status: 'healthy',
      activityType,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    return res.status(503).json({ status: 'error' });
  }
}
