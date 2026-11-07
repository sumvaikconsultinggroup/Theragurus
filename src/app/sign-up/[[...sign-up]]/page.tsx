import type { Metadata } from "next";
import { CustomerAuthPage } from "@/components/booking/CustomerSignIn";

export const metadata: Metadata = {
  title: "Create an account",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <CustomerAuthPage mode="sign-up" />;
}
