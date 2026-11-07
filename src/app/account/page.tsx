import type { Metadata } from "next";
import { CustomerAccount } from "@/components/booking/CustomerAccount";
export const metadata: Metadata = {
  title: "Your account & appointments",
  robots: { index: false, follow: false },
};
export default function AccountPage() {
  return <CustomerAccount />;
}
