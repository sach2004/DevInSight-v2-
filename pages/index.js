import { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout';
import RepositoryInput from '../components/RepositoryInput';
import ChatInterface from '../components/ChatInterface';
import FileStructure from '../components/FileStructure';
import Documentation from '../components/Documentation';
import LoadingState from '../components/LoadingState';
import DependencyMap from '../components/DependencyMap';
import CodeHealth from '../components/CodeHealth';
import ApiExplorer from '../components/ApiExplorer';

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [repository, setRepository] = useState(null);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [chatPrompt, setChatPrompt] = useState('');
  
 useEffect(() => {
  alert("Notice: This application uses free API services with usage limits. Large codebases may experience processing restrictions or timeouts. Please consider using smaller repositories for optimal performance.");
}, [])
  
  
  const [fileStructureLoaded, setFileStructureLoaded] = useState(false);
  const [fileStructureData, setFileStructureData] = useState(null);
  const [documentationLoaded, setDocumentationLoaded] = useState(false);
  const [documentationData, setDocumentationData] = useState(null);
  const [dependencyMapLoaded, setDependencyMapLoaded] = useState(false);
  const [dependencyMapData, setDependencyMapData] = useState(null);
  const [codeHealthLoaded, setCodeHealthLoaded] = useState(false);
  const [codeHealthData, setCodeHealthData] = useState(null);
  const [apiExplorerLoaded, setApiExplorerLoaded] = useState(false);
  const [apiExplorerData, setApiExplorerData] = useState(null);
  
  
  const chatRef = useRef(null);
  const fileStructureRef = useRef(null);
  const documentationRef = useRef(null);
  const dependencyMapRef = useRef(null);
  const codeHealthRef = useRef(null);
  const apiExplorerRef = useRef(null);
  
 
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };
  
  
  const handleFileStructureLoaded = (data) => {
    setFileStructureLoaded(true);
    setFileStructureData(data);
  };
  
 
  const handleDocumentationLoaded = (data) => {
    setDocumentationLoaded(true);
    setDocumentationData(data);
  };
  
 
  const handleDependencyMapLoaded = (data) => {
    setDependencyMapLoaded(true);
    setDependencyMapData(data);
  };
  
  
  const handleCodeHealthLoaded = (data) => {
    setCodeHealthLoaded(true);
    setCodeHealthData(data);
  };
  
  
  const handleApiExplorerLoaded = (data) => {
    setApiExplorerLoaded(true);
    setApiExplorerData(data);
  };
  

  const handleChatRequest = (prompt) => {
   
    setChatPrompt(prompt);
    
    
    setActiveTab('chat');
  };
  
  const handleProcessRepository = async (url) => {
    setError(null);
    setIsProcessing(true);
    
    try {
      const response = await fetch('/api/process-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to process repository');
      }
      
     
      setFileStructureLoaded(false);
      setDocumentationLoaded(false);
      setDependencyMapLoaded(false);
      setCodeHealthLoaded(false);
      setApiExplorerLoaded(false);
      setFileStructureData(null);
      setDocumentationData(null);
      setDependencyMapData(null);
      setCodeHealthData(null);
      setApiExplorerData(null);
      setChatPrompt('');
      
      setRepository(data.repository);
    } catch (error) {
      console.error('Error processing repository:', error);
      setError(error.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        
        {!repository ? (
          <RepositoryInput onSubmit={handleProcessRepository} isLoading={isProcessing} />
        ) : (
          <div>
            <div className="bg-[#FFF4DA] border-4 border-black shadow-[8px_8px_0px_0px_black] rounded-lg p-6 mb-6">
              <div className="flex items-center mb-4">
                {repository.owner.avatar && (
                  <img 
                    src={repository.owner.avatar} 
                    alt={repository.owner.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                )}
                <div>
                  <h2 className="text-xl font-bold">{repository.name}</h2>
                  <p className="text-gray-600">by {repository.owner.name}</p>
                </div>
                <div className="ml-auto flex items-center">
                  <span className="bg-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 mr-2">
                    {repository.language || 'Multiple Languages'}
                  </span>
                  <span className="text-gray-600 text-sm">
                    ⭐ {repository.stars}
                  </span>
                </div>
                <button
                  className="btn btn-secondary ml-5 bg-[#FFC480] border-4 h-full border-black shadow-[8px_8px_0px_0px_black] rounded-lg"
                  onClick={() => {
                    setRepository(null);
                    setError(null);
                    setFileStructureLoaded(false);
                    setDocumentationLoaded(false);
                    setDependencyMapLoaded(false);
                    setCodeHealthLoaded(false);
                    setApiExplorerLoaded(false);
                    setFileStructureData(null);
                    setDocumentationData(null);
                    setDependencyMapData(null);
                    setCodeHealthData(null);
                    setApiExplorerData(null);
                    setChatPrompt('');
                  }}
                >
                  Change Repository
                </button>
              </div>
              {repository.description && (
                <p className="text-gray-700 border-t pt-4">{repository.description}</p>
              )}
            </div>
            
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
              <button
                className={`py-2 px-4 whitespace-nowrap font-medium text-sm mr-4 ${
                  activeTab === 'chat' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => handleTabChange('chat')}
              >
                Chat
              </button>
              <button
                className={`py-2 px-4 whitespace-nowrap font-medium text-sm mr-4 ${
                  activeTab === 'structure' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => handleTabChange('structure')}
              >
                File Structure
              </button>
              <button
                className={`py-2 px-4 whitespace-nowrap font-medium text-sm mr-4 ${
                  activeTab === 'docs' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => handleTabChange('docs')}
              >
                Documentation
              </button>
              <button
                className={`py-2 px-4 whitespace-nowrap font-medium text-sm mr-4 ${
                  activeTab === 'dependency-map' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => handleTabChange('dependency-map')}
              >
                Dependency Map
              </button>
              <button
                className={`py-2 px-4 whitespace-nowrap font-medium text-sm mr-4 ${
                  activeTab === 'code-health' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => handleTabChange('code-health')}
              >
                Code Health
              </button>
              <button
                className={`py-2 px-4 whitespace-nowrap font-medium text-sm mr-4 ${
                  activeTab === 'api-explorer' 
                    ? 'text-primary-600 border-b-2 border-primary-600' 
                    : 'text-gray-600 hover:text-primary-500'
                }`}
                onClick={() => handleTabChange('api-explorer')}
              >
                API Explorer
              </button>
            </div>
            
            <div>
              {activeTab === 'chat' && (
                <div style={{ display: activeTab === 'chat' ? 'block' : 'none' }}>
                
                  <ChatInterface 
                    repositoryInfo={repository}
                    initialPrompt={chatPrompt}
                  />
                </div>
              )}
              
              {activeTab === 'structure' && (
                <div style={{ display: activeTab === 'structure' ? 'block' : 'none' }}>
                  <FileStructure 
                    repositoryInfo={repository} 
                    onDataLoaded={handleFileStructureLoaded}
                    cachedData={fileStructureData}
                    isDataLoaded={fileStructureLoaded}
                  />
                </div>
              )}
              
              {activeTab === 'docs' && (
                <div style={{ display: activeTab === 'docs' ? 'block' : 'none' }}>
                  <Documentation 
                    repositoryInfo={repository} 
                    onDataLoaded={handleDocumentationLoaded}
                    cachedData={documentationData}
                    isDataLoaded={documentationLoaded}
                  />
                </div>
              )}
              
              {activeTab === 'dependency-map' && (
                <div style={{ display: activeTab === 'dependency-map' ? 'block' : 'none' }}>
                  <DependencyMap 
                    repositoryInfo={repository} 
                    onDataLoaded={handleDependencyMapLoaded}
                    cachedData={dependencyMapData}
                    isDataLoaded={dependencyMapLoaded}
                  />
                </div>
              )}
              
              {activeTab === 'code-health' && (
                <div style={{ display: activeTab === 'code-health' ? 'block' : 'none' }}>
                  <CodeHealth 
                    repositoryInfo={repository} 
                    onDataLoaded={handleCodeHealthLoaded}
                    cachedData={codeHealthData}
                    isDataLoaded={codeHealthLoaded}
                    onChatRequest={handleChatRequest}
                  />
                </div>
              )}
              
              {activeTab === 'api-explorer' && (
                <div style={{ display: activeTab === 'api-explorer' ? 'block' : 'none' }}>
                  <ApiExplorer 
                    repositoryInfo={repository} 
                    onDataLoaded={handleApiExplorerLoaded}
                    cachedData={apiExplorerData}
                    isDataLoaded={apiExplorerLoaded}
                    onChatRequest={handleChatRequest}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div id="toast-container" className="fixed bottom-0 right-0 p-4 z-50"></div>
    </Layout>
  );
}