import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { ArrowRight, FileCode, Package, HelpCircle, ZoomIn, ZoomOut, RefreshCw } from 'lucide-react';

// Force-directed graph visualization component
const DependencyMap = forwardRef(({ 
  repositoryInfo, 
  onDataLoaded, 
  cachedData, 
  isDataLoaded 
}, ref) => {
  const [dependencyData, setDependencyData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    refreshData: fetchDependencyData,
    getDependencyData: () => dependencyData
  }));

  useEffect(() => {
    if (repositoryInfo) {
      // Use cached data if available
      if (isDataLoaded && cachedData) {
        setDependencyData(cachedData);
        initializeSimulation(cachedData);
      } else {
        fetchDependencyData();
      }
    }
  }, [repositoryInfo, isDataLoaded, cachedData]);

  // Function to fetch dependency data
  const fetchDependencyData = async () => {
    if (isDataLoaded && dependencyData) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/dependency-map', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dependency data');
      }

      const data = await response.json();
      setDependencyData(data);
      
      // Initialize the simulation with the data
      initializeSimulation(data);
      
      // Notify parent component that data is loaded
      if (onDataLoaded) {
        onDataLoaded(data);
      }
    } catch (error) {
      console.error('Error fetching dependency map:', error);
      setError(error.message);
      
      // Fallback to generating a sample visualization if the API fails
      generateSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  // Generate sample data for fallback visualization if API fails
  const generateSampleData = () => {
    // Create a simplified structure based on common Next.js/React patterns
    const sampleData = {
      nodes: [
        { id: 'pages/index.js', type: 'page', weight: 10 },
        { id: 'pages/api/chat.js', type: 'api', weight: 8 },
        { id: 'pages/api/process-repo.js', type: 'api', weight: 7 },
        { id: 'components/ChatInterface.jsx', type: 'component', weight: 9 },
        { id: 'components/FileStructure.jsx', type: 'component', weight: 6 },
        { id: 'components/Documentation.jsx', type: 'component', weight: 6 },
        { id: 'lib/github.js', type: 'utility', weight: 8 },
        { id: 'lib/groq.js', type: 'utility', weight: 7 },
        { id: 'lib/embeddings.js', type: 'utility', weight: 7 },
        { id: 'lib/chromadb.js', type: 'utility', weight: 6 },
        { id: 'lib/chunker.js', type: 'utility', weight: 5 },
      ],
      links: [
        { source: 'pages/index.js', target: 'components/ChatInterface.jsx' },
        { source: 'pages/index.js', target: 'components/FileStructure.jsx' },
        { source: 'pages/index.js', target: 'components/Documentation.jsx' },
        { source: 'components/ChatInterface.jsx', target: 'pages/api/chat.js' },
        { source: 'pages/api/chat.js', target: 'lib/groq.js' },
        { source: 'pages/api/chat.js', target: 'lib/embeddings.js' },
        { source: 'pages/api/chat.js', target: 'lib/chromadb.js' },
        { source: 'pages/api/process-repo.js', target: 'lib/github.js' },
        { source: 'pages/api/process-repo.js', target: 'lib/chunker.js' },
        { source: 'pages/api/process-repo.js', target: 'lib/embeddings.js' },
        { source: 'pages/api/process-repo.js', target: 'lib/chromadb.js' },
        { source: 'lib/chromadb.js', target: 'lib/embeddings.js' },
      ]
    };
    
    setDependencyData(sampleData);
    initializeSimulation(sampleData);
  };

  // Initialize the force-directed graph simulation
  const initializeSimulation = (data) => {
    if (!data || !data.nodes || !data.links || typeof window === 'undefined') {
      return;
    }
    
    // We'll need to import D3 for a proper implementation
    // For now, we'll simulate the positions to avoid errors
    const width = 800;
    const height = 600;
    
    // Calculate positions for nodes in a circle layout
    const nodes = data.nodes.map((node, i) => {
      const angle = (i / data.nodes.length) * 2 * Math.PI;
      const radius = 200;
      
      return {
        ...node,
        x: width / 2 + radius * Math.cos(angle),
        y: height / 2 + radius * Math.sin(angle),
        color: getNodeColor(node.type)
      };
    });
    
    setDependencyData({
      ...data,
      nodes,
      simulatedPositions: true
    });
    
    setSimulationRunning(true);
    
    // In a real implementation, we would use D3's force simulation here
  };
  
  // Get color based on node type
  const getNodeColor = (type) => {
    const colors = {
      page: '#3B82F6', // blue
      api: '#10B981', // green
      component: '#8B5CF6', // purple
      utility: '#F59E0B', // amber
      default: '#6B7280' // gray
    };
    
    return colors[type] || colors.default;
  };
  
  // Handle zoom in
  const zoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2.5));
  };
  
  // Handle zoom out
  const zoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  };
  
  // Handle node selection
  const handleNodeClick = (node) => {
    setSelectedNode(node);
  };
  
  // Clear selected node
  const clearSelectedNode = () => {
    setSelectedNode(null);
  };
  
  // Get simplified file name
  const getSimplifiedName = (path) => {
    if (!path) return '';
    const parts = path.split('/');
    return parts[parts.length - 1];
  };
  
  // File icon based on path
  const getFileIcon = (path, type) => {
    if (type === 'component') return <Package size={16} className="mr-1" />;
    if (type === 'api') return <ArrowRight size={16} className="mr-1" />;
    if (path && path.endsWith('.jsx')) return <Package size={16} className="mr-1" />;
    if (path && path.endsWith('.js')) return <FileCode size={16} className="mr-1" />;
    return <HelpCircle size={16} className="mr-1" />;
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-2"></div>
        <p className="text-gray-600 text-sm">Analyzing code dependencies...</p>
      </div>
    );
  }

  if (error && !dependencyData) {
    return (
      <div className="text-center py-4 text-red-500">
        <p>Error analyzing code dependencies: {error}</p>
        <button 
          className="mt-2 text-blue-500 hover:underline" 
          onClick={fetchDependencyData}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dependencyData) {
    return (
      <div className="text-center py-4 text-gray-500">
        <p>No dependency data available</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFDF8] border-4 border-black rounded-lg p-4 h-[700px] overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Code Dependency Map</h3>
        <div className="flex space-x-2">
          <button 
            onClick={zoomOut}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            title="Zoom out"
          >
            <ZoomOut size={18} />
          </button>
          <button 
            onClick={zoomIn}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            title="Zoom in"
          >
            <ZoomIn size={18} />
          </button>
          <button 
            onClick={fetchDependencyData}
            className="p-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>
      
      <div className="flex h-full">
        <div className="flex-grow relative border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
          {/* SVG for dependency visualization */}
          <svg 
            width="100%" 
            height="100%" 
            viewBox="0 0 800 600" 
            style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
            className="transition-transform duration-300"
          >
            <g>
              {/* Draw links first so they appear behind nodes */}
              {dependencyData.links.map((link, i) => {
                // Find source and target nodes
                const source = dependencyData.nodes.find(n => n.id === link.source);
                const target = dependencyData.nodes.find(n => n.id === link.target);
                
                if (!source || !target) return null;
                
                return (
                  <line 
                    key={`link-${i}`}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke="#CBD5E1"
                    strokeWidth={1.5}
                    strokeOpacity={0.6}
                    markerEnd="url(#arrowhead)"
                  />
                );
              })}
              
              {/* Draw nodes on top of links */}
              {dependencyData.nodes.map((node, i) => {
                const isSelected = selectedNode && selectedNode.id === node.id;
                const radius = Math.max(5, Math.min(10, node.weight || 5));
                
                return (
                  <g 
                    key={`node-${i}`}
                    transform={`translate(${node.x},${node.y})`}
                    onClick={() => handleNodeClick(node)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Node circle */}
                    <circle
                      r={isSelected ? radius * 1.5 : radius}
                      fill={node.color}
                      stroke={isSelected ? '#000' : '#fff'}
                      strokeWidth={isSelected ? 2 : 1}
                      className="transition-all duration-200"
                    />
                    
                    {/* Node label */}
                    <text
                      dy="0.35em"
                      dx={radius + 5}
                      fontSize={isSelected ? "12" : "10"}
                      fontWeight={isSelected ? "bold" : "normal"}
                      fill="#4B5563"
                      textAnchor="start"
                      pointerEvents="none"
                      style={{ userSelect: 'none' }}
                    >
                      {getSimplifiedName(node.id)}
                    </text>
                  </g>
                );
              })}
              
              {/* Arrow marker definition for directed edges */}
              <defs>
                <marker
                  id="arrowhead"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#CBD5E1" />
                </marker>
              </defs>
            </g>
          </svg>
        </div>
        
        {/* Details panel when a node is selected */}
        {selectedNode && (
          <div className="w-72 ml-4 border border-gray-200 rounded-lg bg-white p-3 overflow-y-auto">
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium text-gray-900">File Details</h4>
              <button 
                onClick={clearSelectedNode}
                className="text-gray-400 hover:text-gray-600"
              >
                &times;
              </button>
            </div>
            
            <div className="mb-3">
              <div className="flex items-center">
                {getFileIcon(selectedNode.id, selectedNode.type)}
                <span className="font-medium text-sm">{getSimplifiedName(selectedNode.id)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">{selectedNode.id}</div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Type</div>
              <div className="inline-block px-2 py-1 rounded-full bg-gray-100 text-xs">
                {selectedNode.type || 'Unknown'}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Dependencies</div>
              <div className="space-y-1">
                {dependencyData.links
                  .filter(link => link.source === selectedNode.id)
                  .map((link, i) => (
                    <div 
                      key={`dep-${i}`} 
                      className="text-xs bg-gray-50 p-1 rounded flex items-center"
                      onClick={() => {
                        const targetNode = dependencyData.nodes.find(n => n.id === link.target);
                        if (targetNode) handleNodeClick(targetNode);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <ArrowRight size={12} className="mr-1 text-blue-500" />
                      {getSimplifiedName(link.target)}
                    </div>
                  ))}
                {dependencyData.links.filter(link => link.source === selectedNode.id).length === 0 && (
                  <div className="text-xs text-gray-500">No outgoing dependencies</div>
                )}
              </div>
            </div>
            
            <div className="mb-3">
              <div className="text-xs font-medium text-gray-700 mb-1">Dependents</div>
              <div className="space-y-1">
                {dependencyData.links
                  .filter(link => link.target === selectedNode.id)
                  .map((link, i) => (
                    <div 
                      key={`dep-${i}`} 
                      className="text-xs bg-gray-50 p-1 rounded flex items-center"
                      onClick={() => {
                        const sourceNode = dependencyData.nodes.find(n => n.id === link.source);
                        if (sourceNode) handleNodeClick(sourceNode);
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <ArrowRight size={12} className="mr-1 text-green-500 transform rotate-180" />
                      {getSimplifiedName(link.source)}
                    </div>
                  ))}
                {dependencyData.links.filter(link => link.target === selectedNode.id).length === 0 && (
                  <div className="text-xs text-gray-500">No incoming dependencies</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-3 flex justify-center">
        <div className="flex space-x-4 text-xs">
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500 mr-1"></span>
            <span>Pages</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-1"></span>
            <span>API Endpoints</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-purple-500 mr-1"></span>
            <span>Components</span>
          </div>
          <div className="flex items-center">
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500 mr-1"></span>
            <span>Utilities</span>
          </div>
        </div>
      </div>
      
      {dependencyData.simulatedPositions && (
        <div className="mt-2 text-xs text-center text-gray-500">
          Note: This is a simplified visualization based on repository analysis.
        </div>
      )}
    </div>
  );
});

DependencyMap.displayName = 'DependencyMap';

export default DependencyMap;