import { useMutation } from "@tanstack/react-query";

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async (data: { type: string; message: string; page_path: string; screenshot_url?: string }) => {
      console.warn('Feedback service not implemented', data);
    },
  });
}
