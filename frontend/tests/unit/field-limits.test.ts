import { describe, expect, it } from "vitest";
import { addressFormSchema, AUTH_FORM_CONFIG, profileFormSchema } from "@/lib/auth/schemas";
import { FIELD_LIMITS, VALIDATION } from "@/lib/constants";
import { AuthFormId } from "@/lib/types";

const ADDRESS = {
  recipientName: "Ada",
  line1: "1 Main St",
  line2: "",
  city: "Lahore",
  region: "Punjab",
  postalCode: "54000",
  country: "PK",
};

const messages = (result: { error?: { issues: { message: string }[] } }) =>
  result.error?.issues.map(({ message }) => message);

describe("field limits match the API", () => {
  it("accepts a valid address", () => {
    expect(addressFormSchema.safeParse(ADDRESS).success).toBe(true);
  });

  it.each([
    ["recipientName", FIELD_LIMITS.recipientName],
    ["line1", FIELD_LIMITS.addressLine],
    ["line2", FIELD_LIMITS.addressLine],
    ["city", FIELD_LIMITS.city],
    ["region", FIELD_LIMITS.region],
    ["postalCode", FIELD_LIMITS.postalCode],
  ])("limits %s to %i characters", (field, limit) => {
    expect(addressFormSchema.safeParse({ ...ADDRESS, [field]: "x".repeat(limit) }).success).toBe(
      true,
    );
    const tooLong = addressFormSchema.safeParse({ ...ADDRESS, [field]: "x".repeat(limit + 1) });
    expect(messages(tooLong)).toEqual([VALIDATION.tooLong]);
  });

  it("limits the profile fields", () => {
    const name = "x".repeat(FIELD_LIMITS.displayName + 1);
    expect(messages(profileFormSchema.safeParse({ displayName: name, phone: "" }))).toEqual([
      VALIDATION.tooLong,
    ]);
    const phone = "1".repeat(FIELD_LIMITS.phone + 1);
    expect(messages(profileFormSchema.safeParse({ displayName: "Ada", phone }))).toEqual([
      VALIDATION.tooLong,
    ]);
  });

  it("limits the name when registering", () => {
    const result = AUTH_FORM_CONFIG[AuthFormId.Register].schema.safeParse({
      displayName: "x".repeat(FIELD_LIMITS.displayName + 1),
      email: "ada@example.com",
      password: "a-good-password",
    });
    expect(messages(result)).toEqual([VALIDATION.tooLong]);
  });
});
