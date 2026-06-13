import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

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

async function main() {
  loadEnvFile(resolve(process.cwd(), '.env'));
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
  if (usersError) throw usersError;
  
  const adminUser = users.users.find(u => u.email === 'admin@gmail.com');
  if (!adminUser) {
    console.log("No user found with email admin@gmail.com");
    return;
  }
  
  console.log("Auth User ID:", adminUser.id);
  
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', adminUser.id)
    .maybeSingle();
    
  console.log("Profile:", profile, "Error:", profileError);
  
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .eq('user_id', adminUser.id);
    
  console.log("Roles in user_roles:", roles, "Error:", rolesError);
  
  const { data: rpcRole, error: rpcError } = await supabase
    .rpc('get_user_role', { _user_id: adminUser.id });
    
  console.log("RPC get_user_role output:", rpcRole, "Error:", rpcError);
}

main().catch(console.error);
