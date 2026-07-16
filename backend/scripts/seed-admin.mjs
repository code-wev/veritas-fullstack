#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'admin@123';
const ADMIN_FULL_NAME = 'Admin';
const REQUIRED_TABLES = ['profiles', 'user_roles'];

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  const envText = readFileSync(filePath, 'utf8');
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    if (process.env[key]) continue;

    process.env[key] = rawValue.trim().replace(/^['"]|['"]$/g, '');
  }
}

async function findUserByEmail(supabase, email) {
  const targetEmail = email.toLowerCase();
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) throw error;

    const user = data.users.find((item) => item.email?.toLowerCase() === targetEmail);
    if (user) return user;
    if (data.users.length < 1000) return null;

    page += 1;
  }
}

function isMissingTableError(error) {
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    /Could not find the table|does not exist|schema cache/i.test(error?.message || '')
  );
}

async function ensureRequiredSchema(supabase) {
  const missingTables = [];

  for (const tableName of REQUIRED_TABLES) {
    const { error } = await supabase.from(tableName).select('*').limit(1);
    if (isMissingTableError(error)) {
      missingTables.push(`public.${tableName}`);
      continue;
    }

    if (error) throw error;
  }

  if (missingTables.length > 0) {
    throw new Error(
      [
        `Missing required table(s): ${missingTables.join(', ')}.`,
        'Your Supabase database migrations have not been applied to this project yet.',
        'Fix: update supabase/config.toml project_id to your current project, then run: npx supabase db push',
        'After migrations finish, run: npm run seed:admin',
      ].join('\n'),
    );
  }
}

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env'));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL in .env.');
  }

  if (!serviceRoleKey) {
    throw new Error(
      'Missing SUPABASE_SERVICE_ROLE_KEY in .env. Add your Supabase Project Settings > API > service_role key, then run this script again.',
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  await ensureRequiredSchema(supabase);

  let user = await findUserByEmail(supabase, ADMIN_EMAIL);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: ADMIN_FULL_NAME },
    });

    if (error) throw error;
    user = data.user;
    console.log(`Created auth user: ${ADMIN_EMAIL}`);
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        full_name: user.user_metadata?.full_name || ADMIN_FULL_NAME,
      },
    });

    if (error) throw error;
    user = data.user;
    console.log(`Updated existing auth user password: ${ADMIN_EMAIL}`);
  }

  if (!user?.id) {
    throw new Error('Supabase did not return a user id.');
  }

  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: ADMIN_EMAIL,
        full_name: ADMIN_FULL_NAME,
      },
      { onConflict: 'id' },
    );

  if (profileError) throw profileError;

  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert(
      {
        user_id: user.id,
        role: 'admin',
      },
      { onConflict: 'user_id,role' },
    );

  if (roleError) throw roleError;

  // Seed Resend API Key if present in environment variables
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    console.log('Seeding Resend API Key to public.system_settings...');
    const { error: resendError } = await supabase
      .from('system_settings')
      .upsert({ key: 'resend_api_key', value: resendApiKey }, { onConflict: 'key' });
    
    if (resendError) {
      console.warn('Failed to seed Resend API Key:', resendError.message);
    } else {
      console.log('Resend API Key seeded successfully.');
    }
  }

  console.log('Admin seed complete.');
  console.log(`Email: ${ADMIN_EMAIL}`);
  console.log(`Password: ${ADMIN_PASSWORD}`);
}

main().catch((error) => {
  console.error(`Admin seed failed: ${error.message}`);
  process.exit(1);
});
