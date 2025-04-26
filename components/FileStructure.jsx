import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ChevronDown, ChevronRight, Folder, File } from 'lucide-react';

const FileStructure = forwardRef(({ 
  repositoryInfo, 
  onDataLoaded, 
  cachedData, 
  isDataLoaded 
}, ref) => {
  const [fileTree, setFileTree] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState({});
  
 
  useImperativeHandle(ref, () => ({
    refreshData: fetchFileStructure,
    getFileTree: () => fileTree
  }));

  useEffect(() => {
    if (repositoryInfo) {
     
      if (isDataLoaded && cachedData) {
        setFileTree(cachedData);
      } else {
        fetchFileStructure();
      }
    }
  }, [repositoryInfo, isDataLoaded, cachedData]);

  const fetchFileStructure = async () => {
    
    if (isDataLoaded && fileTree) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/file-structure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch file structure');
      }

      const data = await response.json();
      setFileTree(data.fileTree);
      
      
      if (onDataLoaded) {
        onDataLoaded(data.fileTree);
      }
    } catch (error) {
      console.error('Error fetching file structure:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFolder = (path) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path],
    }));
  };

  const renderTree = (node, path = '', depth = 0) => {
    if (!node) return null;

    const currentPath = path ? `${path}/${node.name}` : node.name;
    const isExpanded = expandedFolders[currentPath] || depth === 0; 

    if (node.type === 'directory') {
      return (
        <div key={currentPath} className="file-tree-item">
          <div 
            className="flex items-center hover:bg-gray-100 rounded px-2 py-1 cursor-pointer"
            onClick={() => toggleFolder(currentPath)}
            style={{ paddingLeft: `${depth * 12}px` }}
          >
            <span className="mr-1">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
            <Folder size={16} className="mr-2 text-blue-500" />
            <span className="text-sm">{node.name}</span>
          </div>

          {isExpanded && node.children && (
            <div className="pl-4">
              {node.children.map((child) => renderTree(child, currentPath, depth + 1))}
            </div>
          )}
        </div>
      );
    } else {
      return (
        <div 
          key={currentPath} 
          className="flex items-center hover:bg-gray-100 rounded px-2 py-1"
          style={{ paddingLeft: `${depth * 12 + 20}px` }}
        >
          <File size={16} className="mr-2 text-gray-500" />
          <span className="text-sm">{node.name}</span>
        </div>
      );
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">Loading file structure...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        <p>Error loading file structure: {error}</p>
        <button 
          className="mt-2 text-blue-500 hover:underline" 
          onClick={fetchFileStructure}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!fileTree) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No file structure available</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFDF8] border-4 border-black rounded-lg p-4 h-96 overflow-y-auto">
      <h3 className="text-lg font-semibold mb-3">Repository Structure</h3>
      <div className="file-tree">
        {renderTree(fileTree)}
      </div>
    </div>
  );
});

FileStructure.displayName = 'FileStructure';

export default FileStructure;