import { getAllFiles } from '../../lib/github';


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
    
    
    const files = await getAllFiles(owner, repo);
    
    if (files.length === 0) {
      return res.status(404).json({ 
        error: 'No files found in the repository',
        fileTree: { name: repo, type: 'directory', children: [] }
      });
    }
    
    
    const fileTree = buildFileTree(files, repo);
    
    return res.status(200).json({
      success: true,
      fileTree,
    });
  } catch (error) {
    console.error('Error fetching file structure:', error);
    
    return res.status(500).json({
      error: 'Failed to fetch file structure',
      message: error.message,
    });
  }
}

/**
 
 * @param {Array<Object>} files 
 * @param {string} rootName 
 * @returns {Object} 
 */
function buildFileTree(files, rootName) {
  const root = {
    name: rootName,
    type: 'directory',
    children: []
  };
  
  files.forEach(file => {
    const pathParts = file.path.split('/');
    let currentNode = root;
    
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      
   
      if (i === pathParts.length - 1) {
        currentNode.children.push({
          name: part,
          type: 'file',
          path: file.path,
        });
      } else {
        
        let found = false;
        for (const child of currentNode.children) {
          if (child.type === 'directory' && child.name === part) {
            currentNode = child;
            found = true;
            break;
          }
        }
        
        if (!found) {
          const newDir = {
            name: part,
            type: 'directory',
            children: []
          };
          currentNode.children.push(newDir);
          currentNode = newDir;
        }
      }
    }
  });
  
  
  sortTree(root);
  
  return root;
}

/**
 
 * @param {Object} node 
 */
function sortTree(node) {
  if (node.children) {
   
    node.children.sort((a, b) => {
      
      if (a.type === 'directory' && b.type !== 'directory') return -1;
      if (a.type !== 'directory' && b.type === 'directory') return 1;
      
      
      return a.name.localeCompare(b.name);
    });
    
  
    node.children.forEach(child => {
      if (child.type === 'directory') {
        sortTree(child);
      }
    });
  }
}