import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: './frontend/.env' });
dotenv.config({ path: './frontend/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function test() {
  const { data, error } = await supabase.auth.resetPasswordForEmail('test@example.com');
  console.log('Data:', data);
  console.log('Error:', error);
}

test();
