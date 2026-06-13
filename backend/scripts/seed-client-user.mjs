#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const CLIENT_EMAIL = 'client@gmail.com';
const CLIENT_PASSWORD = 'client@123';
const CLIENT_FULL_NAME = 'Client User';

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

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env'));

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL in .env.');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in .env.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // 1. Create or update the Auth user
  let user = await findUserByEmail(supabase, CLIENT_EMAIL);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: CLIENT_EMAIL,
      password: CLIENT_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: CLIENT_FULL_NAME },
    });

    if (error) throw error;
    user = data.user;
    console.log(`Created auth user: ${CLIENT_EMAIL}`);
  } else {
    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: CLIENT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        ...user.user_metadata,
        full_name: user.user_metadata?.full_name || CLIENT_FULL_NAME,
      },
    });

    if (error) throw error;
    user = data.user;
    console.log(`Updated existing auth user password: ${CLIENT_EMAIL}`);
  }

  if (!user?.id) {
    throw new Error('Supabase did not return a user id.');
  }

  // 2. Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: CLIENT_EMAIL,
        full_name: CLIENT_FULL_NAME,
      },
      { onConflict: 'id' },
    );

  if (profileError) throw profileError;
  console.log('Profile updated.');

  // 3. Upsert user_role
  const { error: roleError } = await supabase
    .from('user_roles')
    .upsert(
      {
        user_id: user.id,
        role: 'client_user',
      },
      { onConflict: 'user_id,role' },
    );

  if (roleError) throw roleError;
  console.log('Role set to client_user.');

  // 4. Find the first client in the database to assign
  const { data: clients, error: clientError } = await supabase
    .from('clients')
    .select('id, name')
    .limit(1);

  if (clientError) throw clientError;

  if (clients && clients.length > 0) {
    const targetClient = clients[0];
    const { error: assignError } = await supabase
      .from('client_assignments')
      .upsert(
        {
          user_id: user.id,
          client_id: targetClient.id,
        },
        { onConflict: 'user_id,client_id' },
      );

    if (assignError) throw assignError;
    console.log(`Assigned client user to client: ${targetClient.name} (${targetClient.id})`);
  } else {
    console.log('Warning: No client found in database to assign.');
  }

  console.log('Client User seed complete.');
  console.log(`Email: ${CLIENT_EMAIL}`);
  console.log(`Password: ${CLIENT_PASSWORD}`);
}

main().catch((error) => {
  console.error(`Client seed failed: ${error.message}`);
  process.exit(1);
});
