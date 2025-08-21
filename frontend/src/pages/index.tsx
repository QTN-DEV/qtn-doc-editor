import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

import { fileService } from "@/services/fileService";

export default function IndexPage() {
  const [pat, setPat] = useState("");
  const [githubRepo, setGithubRepo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!pat.trim() || !githubRepo.trim()) {
      Swal.fire({
        icon: "error",
        title: "Validation Error",
        text: "Both PAT and GitHub repository are required!",
      });

      return;
    }

    // Validate GitHub repository format
    if (!githubRepo.includes("/")) {
      Swal.fire({
        icon: "error",
        title: "Invalid Format",
        text: "GitHub repository must be in format: username/repo-slug",
      });

      return;
    }

    setIsLoading(true);

    // Show loading progress
    Swal.fire({
      title: "Initializing Repository",
      html: `
          <div class="mb-4">Cloning repository...</div>
          <div class="w-full bg-gray-200 rounded-full h-2.5">
            <div class="bg-blue-600 h-2.5 rounded-full animate-pulse" style="width: 100%"></div>
          </div>
        `,
      allowOutsideClick: false,
      showConfirmButton: false,
    });

    try {
      const response = await fileService.initRepo(pat, githubRepo);

      if (response.status === "success") {
        if (response.redirect_url) {
          navigate(response.redirect_url);
        } else {
          // Fallback if no redirect URL provided
          const [username, repoSlug] = githubRepo.split("/");
          navigate(`/level1editor?username=${username}&repoSlug=${repoSlug}`);
        }
      } else {
        Swal.fire({
          icon: "error",
          title: "Initialization Failed",
          text: response.error || "An unexpected error occurred.",
        });
      }
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          err instanceof Error ? err.message : "An unexpected error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Repository Initializer
          </h1>
          <p className="text-gray-600">
            Enter your GitHub PAT and repository details
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="pat"
            >
              Personal Access Token (PAT)
            </label>
            <input
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              id="pat"
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              type="password"
              value={pat}
              onChange={(e) => setPat(e.target.value)}
            />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-gray-700 mb-2"
              htmlFor="githubRepo"
            >
              GitHub Repository
            </label>
            <input
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              id="githubRepo"
              placeholder="username/repo-slug"
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
            />
            <p className="mt-1 text-sm text-gray-500">
              Format: username/repo-slug (e.g., octocat/Hello-World)
            </p>
          </div>

          <button
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading}
            type="submit"
          >
            {isLoading ? "Initializing..." : "Initialize Repository"}
          </button>
        </form>
      </div>
    </div>
  );
}
