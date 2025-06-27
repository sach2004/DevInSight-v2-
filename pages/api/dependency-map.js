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
    let collection;
    try {
      collection = await getCollection(repoId);
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
    
    console.log(`Analyzing dependencies for ${repoId}...`);
    
    // Get all files from the repository
    const files = await getAllFiles(owner, repo);
    console.log(`Found ${files.length} files to analyze`);
    
    if (files.length === 0) {
      return res.status(200).json({
        nodes: [],
        links: [],
        message: "No files found in the repository."
      });
    }
    
    // Analyze dependencies by reading file contents
    const dependencyMap = await analyzeDependencies(files, owner, repo);
    
    return res.status(200).json(dependencyMap);
  } catch (error) {
    console.error('Error analyzing code dependencies:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze code dependencies',
      message: error.message,
    });
  }
}

/**
 * Analyze dependencies between files in the repository
 * @param {Array} files - List of files from GitHub API
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @returns {Object} Dependency map with nodes and links
 */
async function analyzeDependencies(files, owner, repo) {
  const nodes = [];
  const links = [];
  const fileContents = new Map();
  
  // Limit analysis to reasonable number of files to avoid API limits
  const filesToAnalyze = files.slice(0, 50);
  
  console.log(`Analyzing ${filesToAnalyze.length} files for dependencies...`);
  
  // Read file contents and create nodes
  for (const file of filesToAnalyze) {
    try {
      const content = await getFileContent(file.downloadUrl);
      if (content) {
        fileContents.set(file.path, content);
        
        // Create node for this file
        const node = {
          id: file.path,
          type: getFileType(file.path),
          weight: calculateFileWeight(content, file.path),
          size: content.length,
          language: getLanguageFromPath(file.path)
        };
        
        nodes.push(node);
      }
    } catch (error) {
      console.error(`Error reading file ${file.path}:`, error);
      // Still create a node even if we can't read the file
      nodes.push({
        id: file.path,
        type: getFileType(file.path),
        weight: 1,
        size: 0,
        language: getLanguageFromPath(file.path)
      });
    }
  }
  
  console.log(`Created ${nodes.length} nodes`);
  
  // Analyze dependencies between files
  for (const [filePath, content] of fileContents.entries()) {
    try {
      const dependencies = extractDependencies(content, filePath, fileContents);
      
      dependencies.forEach(dep => {
        // Find if the dependency exists in our nodes
        const targetNode = nodes.find(node => 
          node.id === dep || 
          node.id.endsWith(dep) ||
          dep.endsWith(node.id.split('/').pop()) ||
          isRelatedPath(node.id, dep, filePath)
        );
        
        if (targetNode && targetNode.id !== filePath) {
          // Check if link already exists
          const existingLink = links.find(link => 
            link.source === filePath && link.target === targetNode.id
          );
          
          if (!existingLink) {
            links.push({
              source: filePath,
              target: targetNode.id,
              type: getDependencyType(content, dep)
            });
          }
        }
      });
    } catch (error) {
      console.error(`Error analyzing dependencies for ${filePath}:`, error);
    }
  }
  
  console.log(`Created ${links.length} dependency links`);
  
  // Filter out isolated nodes (nodes with no connections) if there are too many
  let filteredNodes = nodes;
  if (nodes.length > 30) {
    const connectedNodeIds = new Set();
    links.forEach(link => {
      connectedNodeIds.add(link.source);
      connectedNodeIds.add(link.target);
    });
    
    filteredNodes = nodes.filter(node => connectedNodeIds.has(node.id));
    
    // Keep some important isolated nodes
    const isolatedImportantNodes = nodes
      .filter(node => !connectedNodeIds.has(node.id))
      .filter(node => 
        node.type === 'page' || 
        node.type === 'api' || 
        node.weight > 5 ||
        node.id.includes('index') ||
        node.id.includes('main') ||
        node.id.includes('app')
      )
      .slice(0, 10);
    
    filteredNodes = [...filteredNodes, ...isolatedImportantNodes];
  }
  
  return {
    nodes: filteredNodes,
    links: links,
    metadata: {
      totalFiles: files.length,
      analyzedFiles: filesToAnalyze.length,
      connectedFiles: filteredNodes.length,
      dependencies: links.length
    }
  };
}

/**
 * Extract dependencies from file content
 * @param {string} content - File content
 * @param {string} filePath - Path of the current file
 * @param {Map} allFiles - Map of all file contents
 * @returns {Array} List of dependencies
 */
function extractDependencies(content, filePath, allFiles) {
  const dependencies = new Set();
  
  // Extract import statements
  const importPatterns = [
    // ES6 imports
    /import\s+(?:{[^}]*}|\*\s+as\s+\w+|\w+)?\s*from\s+['"`]([^'"`]+)['"`]/g,
    // CommonJS requires
    /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    // Dynamic imports
    /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  ];
  
  importPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const importPath = match[1];
      
      // Skip external packages (no relative paths)
      if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
        continue;
      }
      
      const resolvedPath = resolveImportPath(importPath, filePath, allFiles);
      if (resolvedPath) {
        dependencies.add(resolvedPath);
      }
    }
  });
  
  // Extract other file references (like Next.js pages)
  if (content.includes('router.push') || content.includes('href=')) {
    const routeMatches = content.match(/['"`]\/[^'"`]*['"`]/g);
    if (routeMatches) {
      routeMatches.forEach(route => {
        const cleanRoute = route.replace(/['"`]/g, '');
        if (cleanRoute.startsWith('/api/')) {
          const apiPath = `pages${cleanRoute}.js`;
          dependencies.add(apiPath);
        } else if (cleanRoute !== '/' && !cleanRoute.includes('http')) {
          const pagePath = `pages${cleanRoute === '/' ? '/index' : cleanRoute}.js`;
          dependencies.add(pagePath);
        }
      });
    }
  }
  
  // Extract component usage in JSX
  if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx') || content.includes('React')) {
    const componentMatches = content.match(/<([A-Z][a-zA-Z0-9]*)/g);
    if (componentMatches) {
      componentMatches.forEach(match => {
        const componentName = match.substring(1);
        // Look for files that might contain this component
        for (const [path, _] of allFiles.entries()) {
          if (path.includes(componentName) || path.endsWith(`${componentName}.jsx`) || path.endsWith(`${componentName}.tsx`)) {
            dependencies.add(path);
          }
        }
      });
    }
  }
  
  return Array.from(dependencies);
}

/**
 * Resolve import path to actual file path
 * @param {string} importPath - Import path from code
 * @param {string} currentFile - Current file path
 * @param {Map} allFiles - Map of all files
 * @returns {string|null} Resolved file path
 */
function resolveImportPath(importPath, currentFile, allFiles) {
  // Handle relative imports
  if (importPath.startsWith('./') || importPath.startsWith('../')) {
    const currentDir = currentFile.substring(0, currentFile.lastIndexOf('/'));
    const resolvedPath = resolvePath(currentDir, importPath);
    
    // Try different extensions
    const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.json'];
    for (const ext of extensions) {
      const fullPath = resolvedPath + ext;
      if (allFiles.has(fullPath)) {
        return fullPath;
      }
    }
    
    // Try index files
    for (const ext of ['.js', '.jsx', '.ts', '.tsx']) {
      const indexPath = resolvedPath + '/index' + ext;
      if (allFiles.has(indexPath)) {
        return indexPath;
      }
    }
  }
  
  // Handle absolute imports (from project root)
  if (importPath.startsWith('/')) {
    const possiblePaths = [importPath.substring(1)];
    const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.json'];
    
    for (const path of possiblePaths) {
      for (const ext of extensions) {
        const fullPath = path + ext;
        if (allFiles.has(fullPath)) {
          return fullPath;
        }
      }
    }
  }
  
  return null;
}

/**
 * Resolve relative path
 * @param {string} basePath - Base directory path
 * @param {string} relativePath - Relative path
 * @returns {string} Resolved path
 */
function resolvePath(basePath, relativePath) {
  const baseSegments = basePath.split('/').filter(Boolean);
  const relativeSegments = relativePath.split('/').filter(Boolean);
  
  const resultSegments = [...baseSegments];
  
  for (const segment of relativeSegments) {
    if (segment === '..') {
      resultSegments.pop();
    } else if (segment !== '.') {
      resultSegments.push(segment);
    }
  }
  
  return resultSegments.join('/');
}

/**
 * Check if two paths are related
 * @param {string} nodePath - Node file path
 * @param {string} depPath - Dependency path
 * @param {string} currentPath - Current file path
 * @returns {boolean} Whether paths are related
 */
function isRelatedPath(nodePath, depPath, currentPath) {
  // Check if the dependency path matches the node path pattern
  const nodeBaseName = nodePath.split('/').pop().split('.')[0];
  const depBaseName = depPath.split('/').pop().split('.')[0];
  
  return nodeBaseName === depBaseName || 
         nodePath.includes(depBaseName) || 
         depPath.includes(nodeBaseName);
}

/**
 * Get file type based on path
 * @param {string} filePath - File path
 * @returns {string} File type
 */
function getFileType(filePath) {
  if (filePath.startsWith('pages/api/')) return 'api';
  if (filePath.startsWith('pages/')) return 'page';
  if (filePath.startsWith('components/')) return 'component';
  if (filePath.startsWith('lib/')) return 'utility';
  if (filePath.startsWith('styles/')) return 'style';
  if (filePath.includes('config') || filePath.endsWith('.config.js')) return 'config';
  if (filePath.includes('test') || filePath.includes('spec')) return 'test';
  if (filePath.endsWith('.md')) return 'documentation';
  
  return 'file';
}

/**
 * Calculate file weight based on content and importance
 * @param {string} content - File content
 * @param {string} filePath - File path
 * @returns {number} Weight score
 */
function calculateFileWeight(content, filePath) {
  let weight = 1;
  
  // Base weight by file type
  if (filePath.includes('index')) weight += 3;
  if (filePath.includes('main')) weight += 3;
  if (filePath.includes('app')) weight += 2;
  if (filePath.startsWith('pages/')) weight += 2;
  if (filePath.startsWith('pages/api/')) weight += 1;
  if (filePath.startsWith('components/')) weight += 1;
  
  // Weight by content complexity
  const lines = content.split('\n').length;
  if (lines > 500) weight += 3;
  else if (lines > 200) weight += 2;
  else if (lines > 100) weight += 1;
  
  // Weight by import/export count
  const importCount = (content.match(/import\s+/g) || []).length;
  const exportCount = (content.match(/export\s+/g) || []).length;
  weight += Math.min(Math.floor((importCount + exportCount) / 3), 3);
  
  // Weight by function/class count
  const functionCount = (content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g) || []).length;
  const classCount = (content.match(/class\s+\w+/g) || []).length;
  weight += Math.min(Math.floor((functionCount + classCount) / 2), 2);
  
  return Math.min(weight, 10); // Cap at 10
}

/**
 * Get programming language from file path
 * @param {string} filePath - File path
 * @returns {string} Language identifier
 */
function getLanguageFromPath(filePath) {
  const extension = filePath.split('.').pop().toLowerCase();
  
  const languageMap = {
    'js': 'javascript',
    'jsx': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'py': 'python',
    'java': 'java',
    'go': 'go',
    'rs': 'rust',
    'c': 'c',
    'cpp': 'cpp',
    'css': 'css',
    'html': 'html',
    'json': 'json',
    'md': 'markdown'
  };
  
  return languageMap[extension] || 'text';
}

/**
 * Get dependency type
 * @param {string} content - File content
 * @param {string} dep - Dependency path
 * @returns {string} Dependency type
 */
function getDependencyType(content, dep) {
  if (content.includes(`import ${dep}`) || content.includes(`from '${dep}'`)) {
    return 'import';
  }
  if (content.includes(`require('${dep}')`)) {
    return 'require';
  }
  if (content.includes(`<${dep}`)) {
    return 'component';
  }
  return 'reference';
}