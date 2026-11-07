import type { ReactNode } from "react";
import { AdminApp } from "@/components/admin/AdminApp";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html:
            'try{if(localStorage.getItem("tg-admin-theme")==="dark")document.documentElement.setAttribute("data-admin-theme","dark")}catch(e){}',
        }}
      />
      <AdminApp />
      {children}
    </>
  );
}
