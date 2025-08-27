import { Outlet } from "react-router-dom";

import Header from "./Header";

import { AuthProvider } from "@/context/AuthProvider";

function LayoutPage() {
  return (
    <AuthProvider>
      <Header />
      <Outlet />
    </AuthProvider>
  );
}

export default LayoutPage;
