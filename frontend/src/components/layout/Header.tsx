import { useContext } from "react";

import { AuthContext } from "@/context/AuthProvider";

function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <header className="flex justify-between items-center p-4 border-b border-gray-200">
      <div className="flex items-center gap-2">
        <img
          className="w-10 h-10 rounded-full"
          src={user?.avatar_url}
          alt="avatar"
        />
        <span className="text-sm font-bold">{user?.name}</span>
      </div>
      <button
        className="bg-red-500 text-white px-4 py-2 rounded-md"
        onClick={logout}
      >
        Logout
      </button>
    </header>
  );
}

export default Header;
