#!/usr/bin/env node
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

const USERS = [
  {
    email: 'manager.demo@cgveritas.test',
    password: 'DemoManager2026!',
    name: 'Demo Manager',
    role: 'manager'
  },
  {
    email: 'analyst.demo@cgveritas.test',
    password: 'DemoAnalyst2026!',
    name: 'Demo Analyst',
    role: 'analyst'
  }
];

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

  for (const u of USERS) {
    console.log(`Processing user: ${u.email}`);
    let user = await findUserByEmail(supabase, u.email);

    if (!user) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.name },
      });

      if (error) throw error;
      user = data.user;
      console.log(`Created auth user: ${u.email}`);
    } else {
      const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
        password: u.password,
        email_confirm: true,
        user_metadata: {
          ...user.user_metadata,
          full_name: user.user_metadata?.full_name || u.name,
        },
      });

      if (error) throw error;
      user = data.user;
      console.log(`Updated existing auth user password: ${u.email}`);
    }

    if (!user?.id) {
      throw new Error(`Supabase did not return a user id for ${u.email}`);
    }

    // Upsert profile
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email: u.email,
          full_name: u.name,
        },
        { onConflict: 'id' },
      );

    if (profileError) throw profileError;
    console.log(`Profile updated for ${u.email}`);

    // Upsert user_role
    const { error: roleError } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: user.id,
          role: u.role,
        },
        { onConflict: 'user_id,role' },
      );

    if (roleError) throw roleError;
    console.log(`Role set to ${u.role} for ${u.email}`);
  }

  console.log('Seed completed successfully.');
}

main().catch((error) => {
  console.error(`Seed failed: ${error.message}`);
  process.exit(1);
});
