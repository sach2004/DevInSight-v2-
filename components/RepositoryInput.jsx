import { useState } from "react";
import { isValidGitHubUrl } from "../lib/utils";
import { Sparkles } from "lucide-react";
import ProgressBar from "./ProgressBar";

export default function RepositoryInput({ onSubmit, isLoading }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setError("");

    if (!url.trim()) {
      setError("Please enter a GitHub repository URL");
      return;
    }

    if (!isValidGitHubUrl(url.trim())) {
      setError(
        "Please enter a valid GitHub repository URL (e.g., https://github.com/owner/repo)"
      );
      return;
    }

    onSubmit(url.trim());
  };

  return (
    <div>
      <div className="text-center mb-10 mt-8">
        <Sparkles className="w-12 h-12 text-pink-500 ml-28 " />
        <span className="block text-4xl font-extrabold">Understanding thousands of lines of <br />  code just got easier</span>
        <p className="mt-2 text-md text-gray-600"></p>
        <div className="flex justify-end"><Sparkles className="w-12 h-12 text-green-500 mr-28  " /></div>
      </div>

      <div className="bg-[#FFF4DA] border-4 border-black shadow-[8px_8px_0px_0px_black] mr- rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Enter GitHub Repository</h2>

        {isLoading && (
          <ProgressBar 
            isLoading={isLoading} 
            message="Processing repository..." 
            duration={25000}
          />
        )}

        {!isLoading && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4 ">
              <label htmlFor="repo-url" className="block text-gray-700  mb-2">
                Repository URL
              </label>
              <div className="h-16 flex gap-4 rounded-lg">
                <div className="border-4 border-black w-[80%] shadow-[8px_8px_0px_0px_black] rounded-lg">
                  <input
                    id="repo-url"
                    type="text"
                    className="input h-full"
                    placeholder="https://github.com/owner/repo"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className="btn bg-[#FFC480] border-4 h-full border-black shadow-[8px_8px_0px_0px_black] rounded-lg"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : "Process"}
                </button>
              </div>

              {error && (
                <p className="mt-4 ml-3 text-red-600 items-center text-sm">
                  {error}
                </p>
              )}
            </div>
          </form>
        )}

        <div className="mt-4 text-sm text-gray-600">
          <p>
            Note: Only public repositories are supported. Large repositories may
            take longer to process.
          </p>
        </div>
      </div>
    </div>
  );
}