import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadFile = async (file: File, taskId: string): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      const filePath = `${taskId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('task-attachments')
        .upload(filePath, file);

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('task-attachments')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('File upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const deleteFile = async (filePath: string): Promise<void> => {
    try {
      const { error } = await supabase.storage
        .from('task-attachments')
        .remove([filePath]);

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }
    } catch (error) {
      console.error('File deletion failed:', error);
      throw error;
    }
  };

  const getDownloadUrl = async (filePath: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from('task-attachments')
        .createSignedUrl(filePath, 3600); // 1 hour expiry

      if (error) {
        console.error('Error creating signed URL:', error);
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Failed to get download URL:', error);
      throw error;
    }
  };

  return {
    uploadFile,
    deleteFile,
    getDownloadUrl,
    isUploading,
  };
}