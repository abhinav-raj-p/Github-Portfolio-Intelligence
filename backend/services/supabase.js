const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
// We use the SECRET key for the backend (service_role) to bypass Row-Level Security 
// and avoid permission errors without needing complex dashboard setup!
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
const supabase = (supabaseUrl && supabaseKey)
    ? createClient(supabaseUrl, supabaseKey)
    : null;

module.exports = { supabase };
