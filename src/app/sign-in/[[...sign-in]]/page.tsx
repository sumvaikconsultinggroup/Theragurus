import type { Metadata } from "next";
import { CustomerAuthPage } from "@/components/booking/CustomerSignIn";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <CustomerAuthPage mode="sign-in" />;
}
