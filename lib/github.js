import { Octokit } from 'octokit';


const SUPPORTED_EXTENSIONS = [
  '.js', '.jsx', '.ts', '.tsx',  
  '.py',                         
  '.java',                       
  '.go',                         
  '.cpp', '.hpp', '.h', '.c',    
  '.rs',                         
  '.html', '.css',               
];


const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**

 * @param {string} url 
 * @returns {Object} 
 */
export function parseGitHubUrl(url) {
  try {
  
    const urlObj = new URL(url);
    
    if (urlObj.hostname !== 'github.com') {
      throw new Error('Not a valid GitHub URL');
    }
    
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathSegments.length < 2) {
      throw new Error('URL does not contain a valid repository path');
    }
    
    return {
      owner: pathSegments[0],
      repo: pathSegments[1],
    };
  } catch (error) {
    throw new Error(`Invalid GitHub URL: ${error.message}`);
  }
}

/**
 
 * @param {string} owner 
 * @param {string} repo 
 * @returns {Object} 
 */
export async function getRepositoryInfo(owner, repo) {
  try {
    const { data } = await octokit.rest.repos.get({
      owner,
      repo,
    });
    
    return {
      name: data.name,
      description: data.description,
      stars: data.stargazers_count,
      language: data.language,
      owner: {
        name: data.owner.login,
        avatar: data.owner.avatar_url,
      },
    };
  } catch (error) {
    throw new Error(`Failed to fetch repository information: ${error.message}`);
  }
}

/**
 
 * @param {string} owner 
 * @param {string} repo 
 * @param {string} path 
 * @returns {Array} 
 */
export async function getAllFiles(owner, repo, path = '') {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    
    let files = [];
    
    
    if (!Array.isArray(data)) {
      if (isSupportedFile(data.name)) {
        return [{ path: data.path, type: 'file', downloadUrl: data.download_url }];
      }
      return [];
    }
    
    
    for (const item of data) {
      if (item.type === 'file' && isSupportedFile(item.name)) {
        files.push({
          path: item.path,
          type: 'file',
          downloadUrl: item.download_url,
        });
      } else if (item.type === 'dir') {
        
        if (shouldSkipDirectory(item.name)) {
          continue;
        }
        
      
        const subDirFiles = await getAllFiles(owner, repo, item.path);
        files = [...files, ...subDirFiles];
      }
    }
    
    return files;
  } catch (error) {
    console.error(`Error fetching files at path ${path}:`, error);
    return [];
  }
}

/**

 * @param {string} filename 
 * @returns {boolean} 
 */
function isSupportedFile(filename) {
  const extension = '.' + filename.split('.').pop().toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(extension);
}

/**
 
 * @param {string} dirName 
 * @returns {boolean} 
 */
function shouldSkipDirectory(dirName) {
  const skipDirs = [
    'node_modules',
    '.git',
    'dist',
    'build',
    '.next',
    'venv',
    '__pycache__',
    'vendor',
  ];
  
  return skipDirs.includes(dirName.toLowerCase());
}

/**
 
 * @param {string} url 
 * @returns {string}
 */
export async function getFileContent(url) {
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching file content:`, error);
    return null;
  }
}