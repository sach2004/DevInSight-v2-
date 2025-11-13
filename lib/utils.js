
/**
 
 * @param {string} url 
 * @returns {boolean} 
 */
export function isValidGitHubUrl(url) {
  try {
    const urlObj = new URL(url);
    
    if (urlObj.hostname !== 'github.com') {
      return false;
    }
    
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    
  
    if (pathSegments.length < 2) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**

 * @param {string} owner 
 * @param {string} repo 
 * @returns {string} 
 */
export function getRepositoryId(owner, repo) {
  return `${owner}/${repo}`;
}

/**

 * @param {number} bytes 
 * @returns {string} 
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 
 * @param {string} filePath 
 * @returns {string} 
 */
export function getLanguageForSyntaxHighlighting(filePath) {
  const extension = filePath.split('.').pop().toLowerCase();
  
  
  const languageMap = {
    
    'js': 'javascript',
    'jsx': 'jsx',
    
    
    'ts': 'typescript',
    'tsx': 'tsx',
    
    
    'py': 'python',
    
    
    'java': 'java',
    
    
    'go': 'go',
    
    
    'c': 'c',
    'cpp': 'cpp',
    'h': 'c',
    'hpp': 'cpp',
    
   
    'rs': 'rust',
    
    
    'html': 'html',
    'css': 'css',
    'json': 'json',
    
    
    'md': 'markdown',
    'yml': 'yaml',
    'yaml': 'yaml',
  };
  
  return languageMap[extension] || 'text';
}

/**
 
 * @param {string} str 
 * @param {number} maxLength 
 * @returns {string} 
 */
export function truncateString(str, maxLength = 100) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}

/**

 * @param {string|Date} timestamp 
 * @returns {string} 
 */
export function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString();
}

/**
 
 * @param {Function} func 
 * @param {number} wait 
 * @returns {Function} 
 */
export function debounce(func, wait = 300) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}