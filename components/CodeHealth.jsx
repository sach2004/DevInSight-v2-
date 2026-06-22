import { useState, useEffect } from 'react';
import { AlertTriangle, Check, File, HelpCircle, RefreshCw, Wrench, MessageSquare, Copy } from 'lucide-react';

export default function CodeHealth({
  repositoryInfo,
  onDataLoaded,
  cachedData,
  isDataLoaded,
  onChatRequest
}) {
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [fixCode, setFixCode] = useState(null);
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);

  useEffect(() => {
    if (repositoryInfo) {
      if (isDataLoaded && cachedData) {
        setHealthData(cachedData);
      } else {
        fetchHealthData();
      }
    }
  }, [repositoryInfo, isDataLoaded, cachedData]);

  const fetchHealthData = async () => {
    if (isDataLoaded && healthData) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/code-health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}` }),
      });
      if (!response.ok) throw new Error('Failed to analyze code health');
      const data = await response.json();
      setHealthData(data);
      if (onDataLoaded) onDataLoaded(data);
    } catch (error) {
      console.error('Error analyzing code health:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const sendToChatbot = (issue) => {
    const prompt = `I need help fixing an issue in file "${issue.location}": ${issue.title}.\nProblem: ${issue.description}\nSuggested fix: ${issue.suggestion}\nPlease provide a complete and improved version of this code.`;
    if (onChatRequest) onChatRequest(prompt);
  };

  const handleGenerateFix = async (issue) => {
    setIsGeneratingFix(true);
    setFixCode(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setFixCode(issue.fixCode || '// No fix available for this issue');
    } catch (error) {
      console.error('Error generating fix:', error);
    } finally {
      setIsGeneratingFix(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-100';
      case 'medium': return 'text-amber-600 bg-amber-100';
      case 'low': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBackgroundColor = (score) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-blue-100';
    if (score >= 70) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const renderSeverityBadge = (severity) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
      {severity === 'high' && <AlertTriangle size={12} className="mr-1" />}
      {severity === 'medium' && <AlertTriangle size={12} className="mr-1" />}
      {severity === 'low' && <Check size={12} className="mr-1" />}
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Analyzing code health...</p>
      </div>
    );
  }

  if (error && !healthData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-red-600">Error Analyzing Code Health</h2>
        <p>{error}</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={fetchHealthData}>Try Again</button>
      </div>
    );
  }

  if (!healthData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Code Health Analysis</h2>
        <p className="text-gray-600">No code health data is available.</p>
        <button className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={fetchHealthData}>Analyze Code Health</button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFDF8] border-4 border-black rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Code Health Analysis</h2>
        <button onClick={fetchHealthData} className="flex items-center text-sm text-blue-600 hover:text-blue-800">
          <RefreshCw size={14} className="mr-1" /> Refresh Analysis
        </button>
      </div>
      
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-4">
          <button className={`pb-2 px-1 text-sm font-medium ${activeTab === 'overview' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={`pb-2 px-1 text-sm font-medium ${activeTab === 'issues' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('issues')}>Issues ({healthData.issues.length})</button>
          <button className={`pb-2 px-1 text-sm font-medium ${activeTab === 'files' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500'}`} onClick={() => setActiveTab('files')}>Files</button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Overall Health Score</h3>
              <span className={`text-3xl font-bold ${getScoreColor(healthData.summary.score)}`}>{healthData.summary.score}</span>
              <span className="text-sm text-gray-500 ml-1">/100</span>
              <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div className={`h-full ${getScoreBackgroundColor(healthData.summary.score)}`} style={{ width: `${healthData.summary.score}%` }}></div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Issues Found</h3>
              <div className="mt-2 text-2xl font-bold">{healthData.issues.length}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Files Analyzed</h3>
              <div className="mt-2 text-2xl font-bold">{healthData.summary.fileCount}</div>
            </div>
          </div>
          
          <h3 className="text-lg font-medium mb-3">Health Categories</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {healthData.categories.map((category, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{category.name}</h4>
                    <span className={`font-bold ${getScoreColor(category.score)}`}>{category.score}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div className={getScoreBackgroundColor(category.score)} style={{ width: `${category.score}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'issues' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {selectedIssue ? (
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">{selectedIssue.title}</h3>
                <button onClick={() => { setSelectedIssue(null); setFixCode(null); }} className="text-gray-400 hover:text-gray-600">&times;</button>
              </div>
              <div className="flex space-x-3 mt-2">
                {renderSeverityBadge(selectedIssue.severity)}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{selectedIssue.category}</span>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Location</div>
                <div className="font-mono text-sm bg-gray-50 p-2 rounded">{selectedIssue.location}</div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <p className="text-gray-800">{selectedIssue.description}</p>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Suggestion</div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-blue-800">{selectedIssue.suggestion}</div>
              </div>
              {selectedIssue.codeSnippet && (
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm text-gray-500">Code Snippet</div>
                    {selectedIssue.fixable && !fixCode && (
                      <button onClick={() => handleGenerateFix(selectedIssue)} className="flex items-center text-sm px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200" disabled={isGeneratingFix}>
                        {isGeneratingFix ? <><div className="animate-spin h-4 w-4 mr-2 border-b-2 border-green-800"></div>Generating...</> : <><Wrench size={14} className="mr-2" />Fix It</>}
                      </button>
                    )}
                  </div>
                  <pre className="text-xs text-gray-200 bg-gray-800 p-4 rounded overflow-x-auto"><code>{selectedIssue.codeSnippet}</code></pre>
                </div>
              )}
              {fixCode && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-sm font-medium text-green-600">Fixed Code</div>
                    <button onClick={() => navigator.clipboard.writeText(fixCode)} className="flex items-center text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200">
                      <Copy size={12} className="mr-1" /> Copy
                    </button>
                  </div>
                  <pre className="text-xs p-4 bg-green-50 border border-green-200 rounded overflow-x-auto"><code>{fixCode}</code></pre>
                </div>
              )}
              <button className="mt-6 px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm" onClick={() => { setSelectedIssue(null); setFixCode(null); }}>Back to issues</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {healthData.issues.map((issue, index) => (
                <div key={index} className="px-6 py-4 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedIssue(issue)}>
                  <div className="flex items-start">
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">{issue.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{issue.location}</div>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">{issue.category}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'files' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {healthData.fileScores.sort((a, b) => a.score - b.score).map((file, index) => (
              <div key={index} className="px-6 py-4">
                <div className="flex items-start">
                  <File size={18} className="text-gray-400 mt-0.5" />
                  <div className="ml-3 flex-1">
                    <div className="font-medium text-gray-900">{file.file}</div>
                    <div className="text-sm text-gray-500 mt-1">{file.issueCount} issues found</div>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(file.score)}`}>{file.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}