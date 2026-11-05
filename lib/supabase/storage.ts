import { createClient } from './client';
import { createClient as createServerSupabase } from './server';

export interface StorageUploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Uploads a user study document to the private Supabase Storage bucket.
 * Destination format: user_id/document_id/original_filename
 */
export async function uploadDocumentToStorage(
  userId: string,
  documentId: string,
  file: File | Blob,
  fileName: string
): Promise<StorageUploadResult> {
  const supabase = createClient();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${documentId}/${sanitizedName}`;

  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, path: data.path };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to upload document.' };
  }
}

/**
 * Generates a temporary secure signed URL to download or preview a private document.
 */
export async function getDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<{ url?: string; error?: string }> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(storagePath, expiresInSeconds);

    if (error) {
      return { error: error.message };
    }

    return { url: data.signedUrl };
  } catch (err: any) {
    return { error: err?.message || 'Failed to generate signed URL.' };
  }
}

/**
 * Deletes a document from the private Supabase Storage bucket.
 */
export async function deleteDocumentFromStorage(storagePath: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    const { error } = await supabase.storage.from('documents').remove([storagePath]);
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete file.' };
  }
}
