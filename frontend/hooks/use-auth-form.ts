import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { useForm } from "react-hook-form";
import { apiFetch } from "@/lib/api/client";
import { AUTH_FORM_CONFIG, problemSchema } from "@/lib/auth/schemas";
import { EMAIL_ALREADY_VERIFIED_MESSAGE } from "@/lib/constants";
import { AuthFormId, type AuthFormValues, ProblemCode, type UseAuthFormOptions } from "@/lib/types";

const subscribeToNothing = () => () => {};

const useAuthForm = ({
  formId,
  errorMessages,
  token,
  successHref,
  suspendedHref,
}: UseAuthFormOptions) => {
  const router = useRouter();
  const isReady = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  const [isComplete, setIsComplete] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string>();
  const { schema, path } = AUTH_FORM_CONFIG[formId];
  const form = useForm<AuthFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const body = JSON.stringify(token ? { ...values, token } : values);
      const result = await apiFetch(path, { method: "POST", body });
      if (result.ok) {
        if (formId === AuthFormId.ResendVerification && result.status === 200) {
          setCompletionMessage(EMAIL_ALREADY_VERIFIED_MESSAGE);
        }
        if (successHref) {
          router.push(successHref);
          router.refresh();
        } else setIsComplete(true);
        return;
      }
      const code = problemSchema.safeParse(result.body).data?.code;
      if (code === ProblemCode.AccountSuspended && suspendedHref) {
        router.push(suspendedHref);
        return;
      }
      form.setError("root", {
        message: (code && errorMessages[code]) || errorMessages.default,
      });
    } catch {
      form.setError("root", { message: errorMessages.default });
    }
  });

  return { form, onSubmit, isComplete, isReady, completionMessage };
};

export default useAuthForm;
