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
  
  const { data: questions, error } = await supabase
    .from('aml_program_question_templates')
    .select('id, question_number, question_code, question_text, section_code, section_name, sort_order')
    .eq('submodule', 'policies_procedures')
    .eq('control_area', 'core_controls')
    .eq('is_active', true)
    .order('sort_order');
    
  if (error) {
    console.error('Error fetching questions:', error);
    return;
  }
  
  console.log('--- Active Questions ---');
  questions.forEach(q => {
    console.log(`Num: ${q.question_number} | Code: ${q.question_code} | Sec: ${q.section_code} | Text: ${q.question_text.substring(0, 50)}...`);
  });
}

main().catch(console.error);
