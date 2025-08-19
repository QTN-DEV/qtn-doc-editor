import { Route, Routes } from "react-router-dom";

import IndexPage from "@/pages/index";
import RepositoryPage from "@/pages/repository";

function App() {
  return (
    <Routes>
      <Route element={<IndexPage />} path="/" />
      <Route element={<RepositoryPage />} path="/0/:username/:repoSlug" />
    </Routes>
  );
}

export default App;
