import { useMutation } from "@tanstack/react-query";

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: async () => {
      console.warn('Feedback service not implemented');
    },
  });
}
