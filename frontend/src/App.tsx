import { Route, Routes } from "react-router-dom";

import Level0EditorPage from "@/pages/level0editor";

function App() {
  return (
    <Routes>
      <Route element={<Level0EditorPage />} path="/" />
    </Routes>
  );
}

export default App;
