import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Code, Server, SendHorizontal, Play, ArrowRight, RefreshCw } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const ApiExplorer = forwardRef(({ 
  repositoryInfo, 
  onDataLoaded, 
  cachedData, 
  isDataLoaded 
}, ref) => {
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeEndpoint, setActiveEndpoint] = useState(null);
  const [visualizeFlow, setVisualizeFlow] = useState(false);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    refreshData: fetchApiData,
    getApiData: () => apiData
  }));

  useEffect(() => {
    if (repositoryInfo) {
      // Use cached data if available
      if (isDataLoaded && cachedData) {
        setApiData(cachedData);
      } else {
        fetchApiData();
      }
    }
  }, [repositoryInfo, isDataLoaded, cachedData]);

  const fetchApiData = async () => {
    if (isDataLoaded && apiData) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/api-explorer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch API data');
      }

      const data = await response.json();
      setApiData(data);
      
      // Set active endpoint to the first one if available
      if (data.endpoints && data.endpoints.length > 0) {
        setActiveEndpoint(data.endpoints[0]);
      }
      
      // Notify parent component that data is loaded
      if (onDataLoaded) {
        onDataLoaded(data);
      }
    } catch (error) {
      console.error('Error fetching API data:', error);
      setError(error.message);
      
      // Generate sample data for demonstration
      generateSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  // Generate sample data for demonstration
  const generateSampleData = () => {
    const sampleData = {
      apiRoot: "/api",
      endpoints: [
        {
          id: "chat",
          path: "/api/chat",
          method: "POST",
          description: "Process chat messages with the AI assistant",
          requestParams: [
            { name: "question", type: "string", required: true, description: "The user's query about the codebase" },
            { name: "repoId", type: "string", required: true, description: "Repository identifier in format owner/repo" },
            { name: "enhancedContext", type: "boolean", required: false, description: "Whether to use enhanced context retrieval" }
          ],
          responseFields: [
            { name: "answer", type: "string", description: "The AI-generated response to the query" },
            { name: "chunkCount", type: "number", description: "Number of code chunks used for context" }
          ],
          exampleRequest: {
            question: "Explain how the Chat interface works",
            repoId: "username/repository",
            enhancedContext: true
          },
          exampleResponse: {
            answer: "The Chat interface component manages conversation state with the repository...",
            chunkCount: 5
          },
          sourcePath: "pages/api/chat.js",
          relatedFiles: ["lib/groq.js", "lib/embeddings.js", "lib/chromadb.js"]
        },
        {
          id: "process-repo",
          path: "/api/process-repo",
          method: "POST",
          description: "Process a GitHub repository to analyze its code",
          requestParams: [
            { name: "url", type: "string", required: true, description: "GitHub repository URL" }
          ],
          responseFields: [
            { name: "success", type: "boolean", description: "Whether the processing was successful" },
            { name: "repository", type: "object", description: "Repository information" },
            { name: "processedFiles", type: "number", description: "Number of files processed" },
            { name: "processedChunks", type: "number", description: "Number of code chunks generated" }
          ],
          exampleRequest: {
            url: "https://github.com/username/repository"
          },
          exampleResponse: {
            success: true,
            repository: {
              name: "repository",
              description: "A sample repository",
              stars: 42,
              language: "JavaScript"
            },
            processedFiles: 25,
            processedChunks: 120
          },
          sourcePath: "pages/api/process-repo.js",
          relatedFiles: ["lib/github.js", "lib/chunker.js", "lib/embeddings.js"]
        },
        {
          id: "file-structure",
          path: "/api/file-structure",
          method: "POST",
          description: "Get the file structure of a repository",
          requestParams: [
            { name: "repoId", type: "string", required: true, description: "Repository identifier in format owner/repo" }
          ],
          responseFields: [
            { name: "success", type: "boolean", description: "Whether the request was successful" },
            { name: "fileTree", type: "object", description: "Hierarchical file structure" }
          ],
          exampleRequest: {
            repoId: "username/repository"
          },
          exampleResponse: {
            success: true,
            fileTree: {
              name: "repository",
              type: "directory",
              children: [
                { name: "components", type: "directory" },
                { name: "pages", type: "directory" },
                { name: "lib", type: "directory" }
              ]
            }
          },
          sourcePath: "pages/api/file-structure.js",
          relatedFiles: ["lib/github.js"]
        }
      ]
    };
    
    setApiData(sampleData);
    
    // Set active endpoint to the first one
    if (sampleData.endpoints && sampleData.endpoints.length > 0) {
      setActiveEndpoint(sampleData.endpoints[0]);
    }
    
    // Notify parent component
    if (onDataLoaded) {
      onDataLoaded(sampleData);
    }
  };

  const getMethodColor = (method) => {
    switch (method.toUpperCase()) {
      case 'GET':
        return 'bg-blue-500';
      case 'POST':
        return 'bg-green-500';
      case 'PUT':
        return 'bg-amber-500';
      case 'DELETE':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Toggle flow visualization
  const toggleFlowVisualization = () => {
    setVisualizeFlow(!visualizeFlow);
  };

  // Generate curl command for endpoint
  const generateCurlCommand = (endpoint) => {
    if (!endpoint) return '';
    
    let curl = `curl -X ${endpoint.method} ${endpoint.path} \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(endpoint.exampleRequest, null, 2)}'`;
    
    return curl;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Analyzing API endpoints...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a minute or two.</p>
      </div>
    );
  }

  // Render error state
  if (error && !apiData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-red-600">Error Analyzing API Endpoints</h2>
        <p>{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={fetchApiData}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render no data state
  if (!apiData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">API Documentation</h2>
        <p className="text-gray-600">No API data is available.</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={fetchApiData}
        >
          Analyze API Endpoints
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFDF8] border-4 border-black rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">API Documentation</h2>
        <div className="flex space-x-3">
          <button
            onClick={toggleFlowVisualization}
            className={`flex items-center text-sm px-3 py-1 rounded ${
              visualizeFlow 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
            }`}
          >
            <SendHorizontal size={14} className="mr-1" />
            {visualizeFlow ? 'Hide Flow' : 'Show Flow'}
          </button>
          <button
            onClick={fetchApiData}
            className="flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <RefreshCw size={14} className="mr-1" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex">
        {/* API Endpoint List */}
        <div className="w-1/3 border-r border-gray-200 pr-4 overflow-y-auto" style={{ maxHeight: '700px' }}>
          <h3 className="text-sm font-medium text-gray-500 mb-3">API Endpoints</h3>
          <ul className="space-y-2">
            {apiData.endpoints.map((endpoint) => (
              <li key={endpoint.id}>
                <button
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center ${
                    activeEndpoint && activeEndpoint.id === endpoint.id
                      ? 'bg-blue-100 text-blue-800'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setActiveEndpoint(endpoint)}
                >
                  <div className={`w-16 text-white text-xs font-medium rounded px-2 py-1 ${getMethodColor(endpoint.method)}`}>
                    {endpoint.method}
                  </div>
                  <span className="ml-2 font-mono text-sm truncate">
                    {endpoint.path}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {/* API Endpoint Details */}
        <div className="w-2/3 pl-6 overflow-y-auto" style={{ maxHeight: '700px' }}>
          {activeEndpoint ? (
            <div>
              <div className="flex items-center mb-4">
                <div className={`text-white text-sm font-medium rounded px-2 py-1 ${getMethodColor(activeEndpoint.method)}`}>
                  {activeEndpoint.method}
                </div>
                <h3 className="ml-2 font-mono text-lg">{activeEndpoint.path}</h3>
              </div>
              
              <p className="text-gray-700 mb-6">{activeEndpoint.description}</p>
              
              {/* Source info */}
              <div className="mb-6 bg-gray-50 rounded-lg p-3 text-sm">
                <div className="flex items-center text-gray-500 mb-2">
                  <Code size={14} className="mr-1" />
                  <span>Source: <span className="font-mono">{activeEndpoint.sourcePath}</span></span>
                </div>
                {activeEndpoint.relatedFiles && activeEndpoint.relatedFiles.length > 0 && (
                  <div>
                    <span className="text-gray-500">Related files:</span>
                    <div className="ml-4 mt-1 space-y-1">
                      {activeEndpoint.relatedFiles.map((file, i) => (
                        <div key={i} className="font-mono text-xs">{file}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Request and Response section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Request parameters */}
                <div>
                  <h4 className="font-medium mb-2">Request Parameters</h4>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {activeEndpoint.requestParams.map((param, i) => (
                        <div key={i} className="p-3">
                          <div className="flex items-center">
                            <span className="font-mono text-sm">{param.name}</span>
                            <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100">
                              {param.type}
                            </span>
                            {param.required && (
                              <span className="ml-2 text-xs text-red-600">required</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{param.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Response fields */}
                <div>
                  <h4 className="font-medium mb-2">Response Fields</h4>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    <div className="divide-y divide-gray-100">
                      {activeEndpoint.responseFields.map((field, i) => (
                        <div key={i} className="p-3">
                          <div className="flex items-center">
                            <span className="font-mono text-sm">{field.name}</span>
                            <span className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100">
                              {field.type}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-1">{field.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Example section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Example request */}
                <div>
                  <h4 className="font-medium mb-2">Example Request</h4>
                  <SyntaxHighlighter
                    language="json"
                    style={vscDarkPlus}
                    customStyle={{ borderRadius: '0.5rem', marginTop: 0 }}
                  >
                    {JSON.stringify(activeEndpoint.exampleRequest, null, 2)}
                  </SyntaxHighlighter>
                </div>
                
                {/* Example response */}
                <div>
                  <h4 className="font-medium mb-2">Example Response</h4>
                  <SyntaxHighlighter
                    language="json"
                    style={vscDarkPlus}
                    customStyle={{ borderRadius: '0.5rem', marginTop: 0 }}
                  >
                    {JSON.stringify(activeEndpoint.exampleResponse, null, 2)}
                  </SyntaxHighlighter>
                </div>
              </div>
              
              {/* cURL example */}
              <div className="mb-6">
                <h4 className="font-medium mb-2">cURL Command</h4>
                <SyntaxHighlighter
                  language="bash"
                  style={vscDarkPlus}
                  customStyle={{ borderRadius: '0.5rem', marginTop: 0 }}
                >
                  {generateCurlCommand(activeEndpoint)}
                </SyntaxHighlighter>
              </div>
              
              {/* Flow visualization */}
              {visualizeFlow && (
                <div className="mb-6">
                  <h4 className="font-medium mb-2">Request Flow</h4>
                  <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="w-32 py-3 px-4 border-2 border-gray-300 rounded-lg text-center">
                        <div className="text-xs text-gray-500 mb-1">Client</div>
                        <div className="font-medium">Frontend</div>
                      </div>
                      
                      <div className="flex-grow mx-4 flex flex-col items-center">
                        <div className="text-xs text-gray-500 mb-1">Request</div>
                        <div className="w-full h-0.5 bg-blue-400 relative">
                          <ArrowRight className="text-blue-500 absolute right-0 -top-2" size={20} />
                        </div>
                        <div className="mt-6 text-xs text-gray-500">Response</div>
                        <div className="w-full h-0.5 bg-green-400 relative">
                          <ArrowRight className="text-green-500 absolute left-0 -top-2 transform rotate-180" size={20} />
                        </div>
                      </div>
                      
                      <div className="w-32 py-3 px-4 border-2 border-gray-300 rounded-lg text-center">
                        <div className="text-xs text-gray-500 mb-1">Server</div>
                        <div className="font-medium">{activeEndpoint.path}</div>
                      </div>
                    </div>
                    
                    {/* Processing steps */}
                    <div className="mt-8 pl-[calc(50%+16px)]">
                      <div className="text-xs font-medium text-gray-700 mb-2">Processing Steps:</div>
                      <ol className="space-y-2 text-sm border-l-2 border-gray-300 pl-4">
                        <li className="relative">
                          <span className="absolute -left-[17px] top-0 w-3 h-3 rounded-full bg-blue-500"></span>
                          <p>Validate request parameters</p>
                        </li>
                        <li className="relative">
                          <span className="absolute -left-[17px] top-0 w-3 h-3 rounded-full bg-blue-500"></span>
                          <p>Retrieve repository data from vector store</p>
                        </li>
                        <li className="relative">
                          <span className="absolute -left-[17px] top-0 w-3 h-3 rounded-full bg-blue-500"></span>
                          <p>Process request with appropriate handlers</p>
                        </li>
                        <li className="relative">
                          <span className="absolute -left-[17px] top-0 w-3 h-3 rounded-full bg-blue-500"></span>
                          <p>Format and return response</p>
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <Server size={24} className="mr-2" />
              <span>Select an API endpoint to view details</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ApiExplorer.displayName = 'ApiExplorer';

export default ApiExplorer;