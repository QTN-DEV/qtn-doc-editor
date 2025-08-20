import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import Level0EditorPage from "@/pages/level0editor";
import Level1EditorPage from "@/pages/level1editor";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<Level0EditorPage />} path="/0/:username/:repoSlug" />
      <Route element={<Level1EditorPage />} path="/1/:username/:repoSlug" />
    </Routes>
  );
}

export default App;
