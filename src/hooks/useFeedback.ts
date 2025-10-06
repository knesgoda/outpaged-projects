import { useMutation } from "@tanstack/react-query";
import { submitFeedback } from "@/services/feedback";

export function useSubmitFeedback() {
  return useMutation({
    mutationFn: submitFeedback,
  });
}
