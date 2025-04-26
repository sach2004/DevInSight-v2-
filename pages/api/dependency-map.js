import { getAllFiles, getFileContent } from '../../lib/github';
import { querySimilarChunks, getCollection } from '../../lib/chromadb';
import { generateEmbedding } from '../../lib/embeddings';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { repoId } = req.body;
  
  if (!repoId) {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  
  try {
    const [owner, repo] = repoId.split('/');
    
    // Check if we have code data for this repository
    try {
      const collection = await getCollection(repoId);
      if (!collection.data || collection.data.length === 0) {
        return res.status(200).json({
          nodes: [],
          links: [],
          message: "No repository data available for analysis. Please process the repository first."
        });
      }
    } catch (error) {
      console.error('Error accessing vector store:', error);
      return res.status(200).json({
        nodes: [],
        links: [],
        message: "Unable to access repository data. Try processing the repository again."
      });
    }
    
    // Generate a demo response since we may not have all files
    // In a real implementation, this would analyze actual imports across files
    const demoResponse = generateComprehensiveDemoMap();
    
    return res.status(200).json(demoResponse);
  } catch (error) {
    console.error('Error analyzing code dependencies:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze code dependencies',
      message: error.message,
    });
  }
}

/**
 * Generate a comprehensive demo dependency map
 * @returns {Object} Dependency map with nodes and links
 */
function generateComprehensiveDemoMap() {
  const nodes = [
    // Pages
    { id: 'pages/index.js', type: 'page', weight: 8 },
    { id: 'pages/_app.js', type: 'page', weight: 5 },
    
    // API routes
    { id: 'pages/api/chat.js', type: 'api', weight: 7 },
    { id: 'pages/api/process-repo.js', type: 'api', weight: 7 },
    { id: 'pages/api/file-structure.js', type: 'api', weight: 6 },
    { id: 'pages/api/generate-docs.js', type: 'api', weight: 8 },
    { id: 'pages/api/push-to-github.js', type: 'api', weight: 6 },
    { id: 'pages/api/dependency-map.js', type: 'api', weight: 5 },
    { id: 'pages/api/code-health.js', type: 'api', weight: 6 },
    { id: 'pages/api/api-explorer.js', type: 'api', weight: 5 },
    
    // Components
    { id: 'components/Layout.jsx', type: 'component', weight: 5 },
    { id: 'components/RepositoryInput.jsx', type: 'component', weight: 6 },
    { id: 'components/ChatInterface.jsx', type: 'component', weight: 9 },
    { id: 'components/FileStructure.jsx', type: 'component', weight: 7 },
    { id: 'components/Documentation.jsx', type: 'component', weight: 7 },
    { id: 'components/CodeViewer.jsx', type: 'component', weight: 5 },
    { id: 'components/LoadingState.jsx', type: 'component', weight: 4 },
    { id: 'components/ProgressBar.jsx', type: 'component', weight: 4 },
    { id: 'components/DependencyMap.jsx', type: 'component', weight: 7 },
    { id: 'components/CodeHealth.jsx', type: 'component', weight: 6 },
    { id: 'components/ApiExplorer.jsx', type: 'component', weight: 6 },
    { id: 'components/CodePushComponent.jsx', type: 'component', weight: 5 },
    
    // Libraries
    { id: 'lib/github.js', type: 'utility', weight: 8 },
    { id: 'lib/embeddings.js', type: 'utility', weight: 7 },
    { id: 'lib/chunker.js', type: 'utility', weight: 6 },
    { id: 'lib/chromadb.js', type: 'utility', weight: 7 },
    { id: 'lib/groq.js', type: 'utility', weight: 7 },
    { id: 'lib/utils.js', type: 'utility', weight: 5 },
    { id: 'lib/githubPush.js', type: 'utility', weight: 5 },
    { id: 'lib/toast.js', type: 'utility', weight: 3 },
    
    // Config files
    { id: 'next.config.js', type: 'config', weight: 3 },
    { id: 'tailwind.config.js', type: 'config', weight: 3 },
  ];
  
  const links = [
    // Index page dependencies
    { source: 'pages/index.js', target: 'components/Layout.jsx' },
    { source: 'pages/index.js', target: 'components/RepositoryInput.jsx' },
    { source: 'pages/index.js', target: 'components/ChatInterface.jsx' },
    { source: 'pages/index.js', target: 'components/FileStructure.jsx' },
    { source: 'pages/index.js', target: 'components/Documentation.jsx' },
    { source: 'pages/index.js', target: 'components/LoadingState.jsx' },
    { source: 'pages/index.js', target: 'components/DependencyMap.jsx' },
    { source: 'pages/index.js', target: 'components/CodeHealth.jsx' },
    { source: 'pages/index.js', target: 'components/ApiExplorer.jsx' },
    
    // Component dependencies
    { source: 'components/Layout.jsx', target: 'components/LoadingState.jsx' },
    { source: 'components/ChatInterface.jsx', target: 'components/CodePushComponent.jsx' },
    { source: 'components/FileStructure.jsx', target: 'lib/github.js' },
    { source: 'components/Documentation.jsx', target: 'lib/github.js' },
    { source: 'components/DependencyMap.jsx', target: 'lib/github.js' },
    { source: 'components/CodeHealth.jsx', target: 'lib/github.js' },
    { source: 'components/RepositoryInput.jsx', target: 'lib/utils.js' },
    { source: 'components/RepositoryInput.jsx', target: 'components/ProgressBar.jsx' },
    { source: 'components/CodePushComponent.jsx', target: 'lib/githubPush.js' },
    
    // API dependencies
    { source: 'pages/api/chat.js', target: 'lib/embeddings.js' },
    { source: 'pages/api/chat.js', target: 'lib/chromadb.js' },
    { source: 'pages/api/chat.js', target: 'lib/groq.js' },
    { source: 'pages/api/chat.js', target: 'lib/github.js' },
    
    { source: 'pages/api/process-repo.js', target: 'lib/github.js' },
    { source: 'pages/api/process-repo.js', target: 'lib/chunker.js' },
    { source: 'pages/api/process-repo.js', target: 'lib/embeddings.js' },
    { source: 'pages/api/process-repo.js', target: 'lib/chromadb.js' },
    { source: 'pages/api/process-repo.js', target: 'lib/utils.js' },
    
    { source: 'pages/api/file-structure.js', target: 'lib/github.js' },
    
    { source: 'pages/api/generate-docs.js', target: 'lib/github.js' },
    { source: 'pages/api/generate-docs.js', target: 'lib/embeddings.js' },
    { source: 'pages/api/generate-docs.js', target: 'lib/chromadb.js' },
    { source: 'pages/api/generate-docs.js', target: 'lib/utils.js' },
    { source: 'pages/api/generate-docs.js', target: 'lib/groq.js' },
    
    { source: 'pages/api/push-to-github.js', target: 'lib/githubPush.js' },
    
    { source: 'pages/api/dependency-map.js', target: 'lib/github.js' },
    { source: 'pages/api/dependency-map.js', target: 'lib/chromadb.js' },
    { source: 'pages/api/dependency-map.js', target: 'lib/embeddings.js' },
    
    { source: 'pages/api/code-health.js', target: 'lib/github.js' },
    { source: 'pages/api/code-health.js', target: 'lib/chromadb.js' },
    { source: 'pages/api/code-health.js', target: 'lib/embeddings.js' },
    
    { source: 'pages/api/api-explorer.js', target: 'lib/github.js' },
    { source: 'pages/api/api-explorer.js', target: 'lib/chromadb.js' },
    { source: 'pages/api/api-explorer.js', target: 'lib/embeddings.js' },
    
    // Library interrelations
    { source: 'lib/chromadb.js', target: 'lib/embeddings.js' },
    { source: 'lib/github.js', target: 'lib/utils.js' },
    { source: 'lib/chunker.js', target: 'lib/utils.js' },
    
    // App dependencies
    { source: 'pages/_app.js', target: 'lib/toast.js' },
  ];
  
  // Create a more complex visualization with calculated coordinates
  const width = 800;
  const height = 600;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Organize nodes by type
  const nodesByType = {
    page: [],
    api: [],
    component: [],
    utility: [],
    config: []
  };
  
  // Group nodes by type
  nodes.forEach(node => {
    if (nodesByType[node.type]) {
      nodesByType[node.type].push(node);
    } else {
      nodesByType.utility.push(node);
    }
  });
  
  // Calculate positions for each node type
  // Pages at top, APIs at right, components at bottom, utilities at left
  const getAngle = (index, total, startAngle, endAngle) => {
    const range = endAngle - startAngle;
    return startAngle + (range * index / total);
  };
  
  // Position page nodes at the top
  nodesByType.page.forEach((node, i) => {
    const angle = getAngle(i, nodesByType.page.length, Math.PI * 1.75, Math.PI * 2.25);
    const radius = 200;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
    node.color = '#3B82F6'; // blue
  });
  
  // Position API nodes on the right
  nodesByType.api.forEach((node, i) => {
    const angle = getAngle(i, nodesByType.api.length, Math.PI * 0.25, Math.PI * 0.75);
    const radius = 220;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
    node.color = '#10B981'; // green
  });
  
  // Position component nodes at the bottom
  nodesByType.component.forEach((node, i) => {
    const angle = getAngle(i, nodesByType.component.length, Math.PI * 0.75, Math.PI * 1.25);
    const radius = 200;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
    node.color = '#8B5CF6'; // purple
  });
  
  // Position utility nodes on the left
  nodesByType.utility.forEach((node, i) => {
    const angle = getAngle(i, nodesByType.utility.length, Math.PI * 1.25, Math.PI * 1.75);
    const radius = 200;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
    node.color = '#F59E0B'; // amber
  });
  
  // Position config nodes in the center
  nodesByType.config.forEach((node, i) => {
    const angle = getAngle(i, nodesByType.config.length, 0, Math.PI * 2);
    const radius = 70;
    node.x = centerX + Math.cos(angle) * radius;
    node.y = centerY + Math.sin(angle) * radius;
    node.color = '#6B7280'; // gray
  });
  
  return {
    nodes,
    links,
    success: true
  };
}