import { supabase } from '@/integrations/supabase/client';

/**
 * Compute SHA-256 of a File using the Web Crypto API.
 * Returns a lower-case hex string.
 */
export async function sha256OfFile(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface UploadParams {
  file: File;
  engagementId: string;
  clientId: string;
  templateId?: string | null;
  sampleType?: string | null;
  sampleId?: string | null;
  sampleLabel?: string | null;
  notes?: string | null;
}

export interface UploadResult {
  ok: boolean;
  duplicate?: boolean;
  error?: string;
  uploadId?: string;
}

/**
 * Upload a file to the `client-files` bucket, then insert a row in
 * `client_files_uploads`. Detects exact-content duplicates (same SHA-256
 * within the engagement) and returns `{ ok:false, duplicate:true }` instead
 * of inserting again.
 */
export async function uploadClientFile(params: UploadParams): Promise<UploadResult> {
  const { file, engagementId, clientId, templateId, sampleType, sampleId, sampleLabel, notes } = params;

  // 1) Hash for duplicate-detection
  const sha = await sha256OfFile(file);

  // 2) Check if an upload with this hash already exists for this engagement
  const { data: existing, error: dupErr } = await supabase
    .from('client_files_uploads')
    .select('id, filename')
    .eq('engagement_id', engagementId)
    .eq('sha256', sha)
    .maybeSingle();

  if (dupErr && dupErr.code !== 'PGRST116') {
    return { ok: false, error: dupErr.message };
  }
  if (existing) {
    return { ok: false, duplicate: true, error: `Duplicate of "${existing.filename}"` };
  }

  // 3) Resolve current user
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return { ok: false, error: 'Not authenticated' };

  // 4) Storage path = engagementId/<sha>-<filename>
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${engagementId}/${sha.slice(0, 12)}-${Date.now()}-${safeName}`;

  const { error: upErr } = await supabase.storage
    .from('client-files')
    .upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  // 5) Insert metadata row
  const { data: row, error: insErr } = await supabase
    .from('client_files_uploads')
    .insert({
      engagement_id: engagementId,
      client_id: clientId,
      template_id: templateId ?? null,
      sample_type: sampleType ?? null,
      sample_id: sampleId ?? null,
      sample_label: sampleLabel ?? null,
      filename: file.name,
      storage_path: path,
      file_size: file.size,
      file_type: file.type || null,
      sha256: sha,
      notes: notes ?? null,
      uploaded_by: userId,
    })
    .select('id')
    .single();

  if (insErr) {
    // best-effort cleanup of orphan storage object
    await supabase.storage.from('client-files').remove([path]);
    return { ok: false, error: insErr.message };
  }
  return { ok: true, uploadId: row.id };
}

export async function deleteClientFile(uploadId: string, storagePath: string): Promise<{ ok: boolean; error?: string }> {
  const { error: delMeta } = await supabase
    .from('client_files_uploads').delete().eq('id', uploadId);
  if (delMeta) return { ok: false, error: delMeta.message };
  await supabase.storage.from('client-files').remove([storagePath]);
  return { ok: true };
}

export async function getSignedUrl(storagePath: string, expiresInSeconds = 60 * 10): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('client-files').createSignedUrl(storagePath, expiresInSeconds);
  if (error) return null;
  return data.signedUrl;
}
