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
  
  console.log('Updating LRF questions applicability to NULL...');
  
  const { data, error } = await supabase
    .from('aml_program_question_templates')
    .update({ applicability: null })
    .eq('submodule', 'policies_procedures')
    .eq('control_area', 'core_controls')
    .like('question_code', 'LRF-%')
    .select();
    
  if (error) {
    console.error('Error updating LRF applicability:', error);
    return;
  }
  
  console.log(`Successfully updated ${data?.length ?? 0} LRF questions to applicability = NULL.`);
}

main().catch(console.error);
