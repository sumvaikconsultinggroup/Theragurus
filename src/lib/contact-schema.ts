import { z } from "zod";
import { contactInterests, contactSettings } from "@/lib/contact-options";

const contactFields = ["name", "email", "phone", "interest", "setting", "message"] as const;

export type ContactField = (typeof contactFields)[number];

const namePattern = /^[\p{L}\p{M}][\p{L}\p{M}\s.'’,-]{0,99}$/u;
const phonePattern = /^[0-9+().\-\s]{7,30}$/;
const hiddenControls = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/;

export const contactSchema = z.object({
  name: z
    .string("Please tell us your name.")
    .trim()
    .min(1, "Please tell us your name.")
    .max(100, "Please keep your name under 100 characters.")
    .transform((value) => value.replace(/\s+/g, " "))
    .pipe(z.string().regex(namePattern, "Please use letters in your name.")),
  email: z
    .string("Please enter your email address.")
    .trim()
    .min(1, "Please enter your email address.")
    .max(180, "Please enter a valid email address.")
    .pipe(z.email("Please enter a valid email address."))
    .transform((value) => value.toLowerCase()),
  phone: z
    .string("Please enter a valid phone number.")
    .trim()
    .max(30, "Please enter a valid phone number.")
    .refine(
      (value) => value === "" || phonePattern.test(value),
      "Please enter a valid phone number.",
    )
    .transform((value) => value || undefined),
  interest: z.enum(contactInterests, "Choose what you’re interested in."),
  setting: z.enum(contactSettings, "Choose a preferred setting."),
  message: z
    .string("Please tell us how we can help.")
    .trim()
    .min(1, "Please tell us how we can help.")
    .max(2000, "Please keep your note under 2,000 characters.")
    .refine(
      (value) => !hiddenControls.test(value),
      "Please tell us how we can help.",
    )
    .transform((value) => value.replace(/\r\n/g, "\n")),
});

export type ContactNote = z.output<typeof contactSchema>;

export function isContactField(value: string): value is ContactField {
  return (contactFields as readonly string[]).includes(value);
}

export function parseContact(input: unknown) {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return { ok: true as const, data: parsed.data };

  const fields: Partial<Record<ContactField, string>> = {};
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && isContactField(key) && !fields[key]) {
      fields[key] = issue.message;
    }
  }
  const field = contactFields.find((key) => fields[key]) ?? "";
  return {
    ok: false as const,
    field,
    message: (field && fields[field]) || "Please check the form.",
    fields,
  };
}
