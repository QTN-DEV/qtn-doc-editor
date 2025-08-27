import { API_URL } from "@/config";

function LoginPage() {
  const handleLogin = () => {
    window.location.href = `${API_URL}/api/v1/github/login`;
  };

  return (
    <main className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Login</h1>
      <button
        className="bg-blue-500 text-white p-2 rounded-md"
        onClick={handleLogin}
      >
        Login with Github
      </button>
    </main>
  );
}

export default LoginPage;
