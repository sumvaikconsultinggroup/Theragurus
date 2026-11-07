export const clerkUiReady = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//"))
    return "/account";
  return value;
}
