import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';

const Documentation = forwardRef(({ 
  repositoryInfo, 
  onDataLoaded, 
  cachedData, 
  isDataLoaded 
}, ref) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [docData, setDocData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  
  useImperativeHandle(ref, () => ({
    refreshData: generateDocs,
    getDocData: () => docData
  }));
  
  useEffect(() => {
    if (repositoryInfo) {
     
      if (isDataLoaded && cachedData) {
        setDocData(cachedData);
      } else {
        generateDocs();
      }
    }
  }, [repositoryInfo, isDataLoaded, cachedData]);

  const generateDocs = async () => {
   
    if (isDataLoaded && docData) {
      return;
    }
    
    if (!repositoryInfo) return;
    
    
    if (repositoryInfo.documentation) {
      console.log("Documentation already available in repositoryInfo", repositoryInfo.documentation);
      setDocData(repositoryInfo.documentation);
      
      
      if (onDataLoaded) {
        onDataLoaded(repositoryInfo.documentation);
      }
      return;
    }
    
    console.log("Documentation not found in repositoryInfo, fetching...");
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/generate-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          owner: repositoryInfo.owner.name, 
          repo: repositoryInfo.name 
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate documentation: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Documentation API response:", data);
      
      let documentation;
      if (data.repository && data.repository.documentation) {
        documentation = data.repository.documentation;
      } else if (data.documentation) {
        documentation = data.documentation;
      } else {
        documentation = {
          title: `${repositoryInfo.name} Documentation`,
          overview: repositoryInfo.description || 'No detailed overview available.',
          meta: {
            language: repositoryInfo.language || 'Unknown',
            dependencies: []
          },
          sections: {}
        };
      }
      
      setDocData(documentation);
      
     
      if (onDataLoaded) {
        onDataLoaded(documentation);
      }
    } catch (err) {
      console.error("Error generating documentation:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg">Generating documentation...</p>
          <p className="text-sm text-gray-500 mt-2">This may take a minute or two.</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-red-600">Error Generating Documentation</h2>
        <p>{error}</p>
        <p className="mt-4">Please try again later or contact support.</p>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Documentation Not Available</h2>
        <p>The repository documentation is currently being generated or has not been processed yet.</p>
        <p className="mt-4">Please wait or try refreshing the page.</p>
      </div>
    );
  }

  const renderMarkdown = (content) => {
    if (!content) return null;
    
    const parts = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    
    let lastIndex = 0;
    let match;
    
    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }
      
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2],
      });
      
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }
    
    return parts.map((part, index) => {
      if (part.type === 'text') {
        const formattedText = part.content
          .replace(/# (.*?)(\n|$)/g, '<h1 class="text-2xl font-bold mt-6 mb-4">$1</h1>')
          .replace(/## (.*?)(\n|$)/g, '<h2 class="text-xl font-bold mt-5 mb-3">$1</h2>')
          .replace(/### (.*?)(\n|$)/g, '<h3 class="text-lg font-bold mt-4 mb-2">$1</h3>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.*?)\*/g, '<em>$1</em>')
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-blue-600 hover:underline" target="_blank">$1</a>')
          .replace(/- (.*?)(\n|$)/g, '<li class="ml-4">$1</li>')
          .replace(/\n\n/g, '</p><p class="my-3">')
          .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-red-600">$1</code>');

        return (
          <div 
            key={index} 
            className="prose prose-blue max-w-none" 
            dangerouslySetInnerHTML={{ __html: `<p class="my-3">${formattedText}</p>` }} 
          />
        );
      } else if (part.type === 'code') {
        return (
          <div key={index} className="my-4">
            <SyntaxHighlighter
              language={part.language}
              style={vscDarkPlus}
              showLineNumbers={true}
            >
              {part.content}
            </SyntaxHighlighter>
          </div>
        );
      }
      return null;
    });
  };

  const sections = docData.sections || {};
  
  const tableOfContents = Object.keys(sections).map(key => ({
    id: key,
    title: sections[key]?.title || key.charAt(0).toUpperCase() + key.slice(1),
  }));

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      <div className="lg:w-1/4 p-4 bg-gray-50 rounded-lg h-fit sticky top-4">
        <h3 className="font-bold text-lg mb-4">Table of Contents</h3>
        <ul className="space-y-1">
          <li>
            <button
              className={`w-full text-left px-3 py-2 rounded ${
                activeSection === 'overview' 
                  ? 'bg-primary-100 text-primary-800 font-medium' 
                  : 'hover:bg-gray-100'
              }`}
              onClick={() => setActiveSection('overview')}
            >
              Overview
            </button>
          </li>
          {tableOfContents.map((section) => (
            <li key={section.id}>
              <button
                className={`w-full text-left px-3 py-2 rounded ${
                  activeSection === section.id 
                    ? 'bg-primary-100 text-primary-800 font-medium' 
                    : 'hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="lg:w-3/4 overflow-auto">
        <div className="bg-white p-6 rounded-lg shadow-sm">
          {activeSection === 'overview' ? (
            <>
              <h1 className="text-2xl font-bold mb-4">{docData.title || 'Documentation'}</h1>
              <div className="mb-6 text-gray-700">
                {renderMarkdown(docData.overview)}
              </div>
              
              {docData.meta && (
                <div className="grid grid-cols-2 gap-4 mb-6 mt-8 bg-gray-50 p-4 rounded-lg">
                  {docData.meta.language && (
                    <div>
                      <h3 className="font-medium text-gray-700">Primary Language</h3>
                      <p>{docData.meta.language}</p>
                    </div>
                  )}
                  {docData.meta.framework && (
                    <div>
                      <h3 className="font-medium text-gray-700">Framework</h3>
                      <p>{docData.meta.framework}</p>
                    </div>
                  )}
                  {docData.meta.dependencies && docData.meta.dependencies.length > 0 && (
                    <div className="col-span-2">
                      <h3 className="font-medium text-gray-700">Key Dependencies</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {docData.meta.dependencies.map(dep => (
                          <span key={dep} className="bg-gray-200 px-2 py-1 rounded text-xs">{dep}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-4">
                {sections[activeSection]?.title || activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}
              </h2>
              <div>
                {sections[activeSection] && renderMarkdown(sections[activeSection].content)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
});

Documentation.displayName = 'Documentation';

export default Documentation;