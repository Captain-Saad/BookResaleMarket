import { z } from "zod";
import { API_PATHS, PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH, VALIDATION } from "@/lib/constants";
import { AuthFormId, type AuthFormValues } from "@/lib/types";

const email = z.email(VALIDATION.email);

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, VALIDATION.passwordTooShort)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    error: VALIDATION.passwordTooLong,
  });

const required = z.string().trim().min(1, VALIDATION.required);

export const AUTH_FORM_CONFIG: Record<
  AuthFormId,
  { schema: z.ZodType<AuthFormValues, AuthFormValues>; path: string }
> = {
  [AuthFormId.Login]: {
    schema: z.object({ email, password: z.string().min(1, VALIDATION.required) }),
    path: API_PATHS.login,
  },
  [AuthFormId.Register]: {
    schema: z.object({ displayName: required, email, password }),
    path: API_PATHS.register,
  },
  [AuthFormId.ForgotPassword]: { schema: z.object({ email }), path: API_PATHS.forgotPassword },
  [AuthFormId.ResetPassword]: { schema: z.object({ password }), path: API_PATHS.resetPassword },
  [AuthFormId.ChangePassword]: {
    schema: z.object({
      currentPassword: z.string().min(1, VALIDATION.required),
      newPassword: password,
    }),
    path: API_PATHS.changePassword,
  },
  [AuthFormId.ResendVerification]: {
    schema: z.object({ email }),
    path: API_PATHS.resendVerification,
  },
};

export const problemSchema = z.object({ code: z.string().optional() });

export const profileFormSchema: z.ZodType<AuthFormValues, AuthFormValues> = z.object({
  displayName: required,
  phone: z.string().trim(),
});

export const addressFormSchema: z.ZodType<AuthFormValues, AuthFormValues> = z.object({
  recipientName: required,
  line1: required,
  line2: z.string().trim(),
  city: required,
  region: required,
  postalCode: required,
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, VALIDATION.country),
});
