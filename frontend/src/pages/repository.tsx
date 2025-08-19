import { useParams } from "react-router-dom";

export default function RepositoryPage() {
  const { username, repoSlug } = useParams();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Repository: {username}/{repoSlug}
          </h1>
          <p className="text-gray-600 mb-6">
            Repository has been successfully initialized and cloned to the backend.
          </p>
          
          <div className="bg-green-50 border border-green-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Repository Status: Ready
                </p>
                <p className="text-sm text-green-700 mt-1">
                  The repository has been cloned to backend/repo/{username}/{repoSlug}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
