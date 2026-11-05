import { z } from "zod";
import {
  API_PATHS,
  FIELD_LIMITS,
  PASSWORD_MAX_BYTES,
  PASSWORD_MIN_LENGTH,
  VALIDATION,
} from "@/lib/constants";
import { AuthFormId, type AuthFormValues } from "@/lib/types";

const email = z.email(VALIDATION.email).max(FIELD_LIMITS.email, VALIDATION.tooLong);

const password = z
  .string()
  .min(PASSWORD_MIN_LENGTH, VALIDATION.passwordTooShort)
  .refine((value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES, {
    error: VALIDATION.passwordTooLong,
  });

const required = (max: number) =>
  z.string().trim().min(1, VALIDATION.required).max(max, VALIDATION.tooLong);

const optional = (max: number) => z.string().trim().max(max, VALIDATION.tooLong);

export const AUTH_FORM_CONFIG: Record<
  AuthFormId,
  { schema: z.ZodType<AuthFormValues, AuthFormValues>; path: string }
> = {
  [AuthFormId.Login]: {
    schema: z.object({ email, password: z.string().min(1, VALIDATION.required) }),
    path: API_PATHS.login,
  },
  [AuthFormId.Register]: {
    schema: z.object({ displayName: required(FIELD_LIMITS.displayName), email, password }),
    path: API_PATHS.register,
  },
  [AuthFormId.ForgotPassword]: { schema: z.object({ email }), path: API_PATHS.forgotPassword },
  [AuthFormId.ResetPassword]: { schema: z.object({ password }), path: API_PATHS.resetPassword },
  [AuthFormId.ResendVerification]: {
    schema: z.object({ email }),
    path: API_PATHS.resendVerification,
  },
};

export const problemSchema = z.object({ code: z.string().optional() });

export const profileFormSchema: z.ZodType<AuthFormValues, AuthFormValues> = z.object({
  displayName: required(FIELD_LIMITS.displayName),
  phone: optional(FIELD_LIMITS.phone),
});

export const addressFormSchema: z.ZodType<AuthFormValues, AuthFormValues> = z.object({
  recipientName: required(FIELD_LIMITS.recipientName),
  line1: required(FIELD_LIMITS.addressLine),
  line2: optional(FIELD_LIMITS.addressLine),
  city: required(FIELD_LIMITS.city),
  region: required(FIELD_LIMITS.region),
  postalCode: required(FIELD_LIMITS.postalCode),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, VALIDATION.country),
});
