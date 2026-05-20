import { useCallback, useState } from "react";
import { validationError } from "./validation";

export function useFormMessage(fallback = "Please check the form and try again.") {
  const [message, setMessage] = useState<string | null>(null);

  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const runWithMessage = useCallback(
    async (action: () => Promise<void>) => {
      setMessage(null);
      try {
        await action();
      } catch (error) {
        setMessage(validationError(error, fallback));
      }
    },
    [fallback]
  );

  return {
    clearMessage,
    message,
    runWithMessage,
    setMessage
  };
}
