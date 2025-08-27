import { Route, Routes } from "react-router-dom";

import LoginPage from "./pages/auth/LoginPage/page";
import LayoutPage from "./components/layout/LayoutPage";

import Level0EditorPage from "@/pages/level0editor";

function App() {
  return (
    <Routes>
      <Route element={<LayoutPage />}>
        <Route element={<Level0EditorPage />} path="/" />
      </Route>
      <Route element={<LoginPage />} path="/login" />
    </Routes>
  );
}

export default App;
