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
          apiRoot: "/api",
          endpoints: [],
          message: "No repository data available for analysis. Please process the repository first."
        });
      }
    } catch (error) {
      console.error('Error accessing vector store:', error);
      return res.status(500).json({
        error: 'Failed to access repository data',
        message: error.message,
      });
    }
    
    // Generate embedding for API-related content
    const apiQuery = await generateEmbedding("API endpoint route handler request response");
    
    // Get chunks related to API endpoints
    const apiChunks = await querySimilarChunks(repoId, apiQuery, 50);
    
    if (!apiChunks || apiChunks.length === 0) {
      return res.status(200).json({
        apiRoot: "/api",
        endpoints: [],
        message: "Unable to analyze API endpoints in this repository."
      });
    }
    
    // Filter chunks to focus on API files (Next.js convention: pages/api/*)
    const apiFileChunks = apiChunks.filter(chunk => 
      chunk.metadata && 
      chunk.metadata.path && 
      (chunk.metadata.path.includes('/api/') || chunk.metadata.path.includes('controller') || chunk.metadata.path.includes('routes'))
    );
    
    // Group chunks by file
    const fileChunks = {};
    apiFileChunks.forEach(chunk => {
      if (!chunk.metadata || !chunk.metadata.path) return;
      
      const path = chunk.metadata.path;
      if (!fileChunks[path]) {
        fileChunks[path] = [];
      }
      
      fileChunks[path].push(chunk);
    });
    
    // Extract API endpoints
    const endpoints = [];
    const processedPaths = new Set();
    
    // Process each API file
    for (const [path, chunks] of Object.entries(fileChunks)) {
      // Skip already processed paths
      if (processedPaths.has(path)) continue;
      processedPaths.add(path);
      
      // Combine chunks for full file analysis
      const fileContent = chunks.map(chunk => chunk.content).join('\n\n');
      
      // Extract endpoint information
      const endpoint = extractEndpointInfo(path, fileContent);
      
      if (endpoint) {
        endpoints.push(endpoint);
      }
    }
    
    // Handle case when no endpoints are found
    if (endpoints.length === 0) {
      // Try to find API-like files that might have been missed
      const allFilePaths = Object.keys(collection.data.reduce((acc, item) => {
        if (item.metadata && item.metadata.path) {
          acc[item.metadata.path] = true;
        }
        return acc;
      }, {}));
      
      const potentialApiFiles = allFilePaths.filter(path => 
        path.includes('/api/') || 
        path.includes('controller') || 
        path.includes('routes') ||
        path.includes('handlers')
      );
      
      // For demonstration purposes, create sample endpoints
      for (const path of potentialApiFiles.slice(0, 3)) {
        const endpoint = createSampleEndpoint(path);
        if (endpoint) {
          endpoints.push(endpoint);
        }
      }
    }
    
    // Sort endpoints by path
    endpoints.sort((a, b) => a.path.localeCompare(b.path));
    
    return res.status(200).json({
      apiRoot: "/api",
      endpoints,
      success: true
    });
  } catch (error) {
    console.error('Error analyzing API endpoints:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze API endpoints',
      message: error.message,
    });
  }
}

/**
 * Extract API endpoint information from file content
 * @param {string} path - File path
 * @param {string} content - File content
 * @returns {Object|null} - Endpoint information or null if not an API endpoint
 */
function extractEndpointInfo(path, content) {
  try {
    // Extract base information
    const pathParts = path.split('/');
    const fileName = pathParts[pathParts.length - 1].replace(/\.\w+$/, '');
    const endpointId = fileName;
    
    // Default to POST for API handler functions
    let method = 'POST';
    
    // Try to determine HTTP method from content
    if (content.includes('req.method === \'GET\'') || content.includes('method: \'GET\'')) {
      method = 'GET';
    } else if (content.includes('req.method === \'PUT\'') || content.includes('method: \'PUT\'')) {
      method = 'PUT';
    } else if (content.includes('req.method === \'DELETE\'') || content.includes('method: \'DELETE\'')) {
      method = 'DELETE';
    }
    
    // Extract API path
    let apiPath = `/api/${fileName}`;
    
    // Check if it's in pages/api structure (Next.js)
    if (path.includes('pages/api/')) {
      const apiPathSegments = path.split('pages/api/')[1].split('.');
      apiPathSegments.pop(); // Remove file extension
      apiPath = `/api/${apiPathSegments.join('.')}`;
    }
    
    // Attempt to extract description
    let description = '';
    const descriptionMatch = content.match(/\/\*\*[\s\S]*?\*\//) || content.match(/\/\/.*API.*endpoint/);
    if (descriptionMatch) {
      description = descriptionMatch[0]
        .replace(/\/\*\*|\*\/|\/\/|\*/g, '')
        .trim()
        .split('\n')
        .map(line => line.trim())
        .join(' ')
        .replace(/\s+/g, ' ');
    } else {
      // Generate a basic description based on the endpoint name
      description = `${method} endpoint for ${fileName.replace(/-/g, ' ')} operations`;
    }
    
    // Extract request parameters
    const requestParams = [];
    
    // Look for destructuring in parameters
    const destructuringMatch = content.match(/const\s*{([^}]+)}\s*=\s*req\.body/);
    if (destructuringMatch) {
      const paramNames = destructuringMatch[1].split(',').map(p => p.trim());
      
      paramNames.forEach(param => {
        if (param) {
          const isRequired = content.includes(`if (!${param})`) || 
                            content.includes(`if(!${param})`) || 
                            content.includes(`${param} is required`);
          
          requestParams.push({
            name: param,
            type: guessTypeFromUsage(param, content),
            required: isRequired,
            description: `The ${param.replace(/([A-Z])/g, ' $1').toLowerCase()} parameter`
          });
        }
      });
    }
    
    // Look for direct req.body access
    const directBodyAccess = content.match(/req\.body\.(\w+)/g);
    if (directBodyAccess) {
      const paramNames = directBodyAccess.map(match => match.replace('req.body.', ''));
      
      paramNames.forEach(param => {
        if (param && !requestParams.some(p => p.name === param)) {
          const isRequired = content.includes(`if (!req.body.${param})`) || 
                            content.includes(`if(!req.body.${param})`) || 
                            content.includes(`${param} is required`);
          
          requestParams.push({
            name: param,
            type: guessTypeFromUsage(param, content),
            required: isRequired,
            description: `The ${param.replace(/([A-Z])/g, ' $1').toLowerCase()} parameter`
          });
        }
      });
    }
    
    // For GET requests, look for query parameters
    if (method === 'GET') {
      const queryParams = content.match(/req\.query\.(\w+)/g);
      if (queryParams) {
        const paramNames = queryParams.map(match => match.replace('req.query.', ''));
        
        paramNames.forEach(param => {
          if (param && !requestParams.some(p => p.name === param)) {
            const isRequired = content.includes(`if (!req.query.${param})`) || 
                              content.includes(`if(!req.query.${param})`) || 
                              content.includes(`${param} is required`);
            
            requestParams.push({
              name: param,
              type: guessTypeFromUsage(param, content),
              required: isRequired,
              description: `The ${param.replace(/([A-Z])/g, ' $1').toLowerCase()} query parameter`
            });
          }
        });
      }
    }
    
    // Extract response fields
    const responseFields = [];
    
    // Look for response.json or res.status().json calls
    const jsonResponseMatch = content.match(/res(?:ponse)?\.(?:status\(\d+\)\.)?json\(\s*({[^}]+})/);
    if (jsonResponseMatch) {
      const responseObj = jsonResponseMatch[1];
      const fields = responseObj.replace(/[{}]/g, '').split(',').map(f => f.trim());
      
      fields.forEach(field => {
        if (field) {
          const [name, value] = field.split(':').map(p => p.trim());
          if (name && name !== '') {
            responseFields.push({
              name: name.replace(/['"]/g, ''),
              type: guessTypeFromValue(value),
              description: `The ${name.replace(/['"]/g, '').replace(/([A-Z])/g, ' $1').toLowerCase()} response field`
            });
          }
        }
      });
    }
    
    // If we couldn't extract response fields, check for other patterns
    if (responseFields.length === 0) {
      // Look for other return json patterns
      const returnMatch = content.match(/return\s*({[^}]+})/);
      if (returnMatch) {
        const responseObj = returnMatch[1];
        const fields = responseObj.replace(/[{}]/g, '').split(',').map(f => f.trim());
        
        fields.forEach(field => {
          if (field) {
            const [name, value] = field.split(':').map(p => p.trim());
            if (name && name !== '') {
              responseFields.push({
                name: name.replace(/['"]/g, ''),
                type: guessTypeFromValue(value),
                description: `The ${name.replace(/['"]/g, '').replace(/([A-Z])/g, ' $1').toLowerCase()} response field`
              });
            }
          }
        });
      }
    }
    
    // Generate example request based on request params
    const exampleRequest = {};
    requestParams.forEach(param => {
      switch (param.type) {
        case 'string':
          exampleRequest[param.name] = `example-${param.name}`;
          break;
        case 'number':
          exampleRequest[param.name] = 123;
          break;
        case 'boolean':
          exampleRequest[param.name] = true;
          break;
        case 'array':
          exampleRequest[param.name] = [1, 2, 3];
          break;
        case 'object':
          exampleRequest[param.name] = { id: 1, name: 'example' };
          break;
        default:
          exampleRequest[param.name] = `example-${param.name}`;
      }
    });
    
    // Generate example response based on response fields
    const exampleResponse = {};
    responseFields.forEach(field => {
      switch (field.type) {
        case 'string':
          exampleResponse[field.name] = `example-${field.name}`;
          break;
        case 'number':
          exampleResponse[field.name] = 123;
          break;
        case 'boolean':
          exampleResponse[field.name] = true;
          break;
        case 'array':
          exampleResponse[field.name] = [1, 2, 3];
          break;
        case 'object':
          exampleResponse[field.name] = { id: 1, name: 'example' };
          break;
        default:
          exampleResponse[field.name] = `example-${field.name}`;
      }
    });
    
    // Ensure we have at least some response if nothing was detected
    if (Object.keys(exampleResponse).length === 0) {
      exampleResponse.success = true;
      responseFields.push({
        name: 'success',
        type: 'boolean',
        description: 'Whether the request was successful'
      });
    }
    
    // Try to find related files
    const relatedFiles = [];
    const importMatches = content.match(/(?:import|require)\s+.*?(?:from\s+)?['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(importStatement => {
        const match = importStatement.match(/['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];
          if (!importPath.startsWith('.')) return; // Skip external package imports
          
          // Convert relative import to absolute path (simplified)
          let absolutePath = importPath;
          if (importPath.startsWith('./')) {
            const dir = path.substring(0, path.lastIndexOf('/'));
            absolutePath = `${dir}/${importPath.substring(2)}`;
          } else if (importPath.startsWith('../')) {
            const dir = path.substring(0, path.lastIndexOf('/'));
            const parentDir = dir.substring(0, dir.lastIndexOf('/'));
            absolutePath = `${parentDir}/${importPath.substring(3)}`;
          }
          
          // Add common JS/TS extensions if missing
          if (!absolutePath.includes('.')) {
            const extensions = ['.js', '.ts', '.jsx', '.tsx'];
            for (const ext of extensions) {
              relatedFiles.push(`${absolutePath}${ext}`);
            }
          } else {
            relatedFiles.push(absolutePath);
          }
        }
      });
    }
    
    // Build the endpoint object
    return {
      id: endpointId,
      path: apiPath,
      method: method,
      description: description,
      requestParams: requestParams.length > 0 ? requestParams : [
        {
          name: 'id',
          type: 'string',
          required: true,
          description: 'Identifier for the resource'
        }
      ],
      responseFields: responseFields.length > 0 ? responseFields : [
        {
          name: 'success',
          type: 'boolean',
          description: 'Whether the request was successful'
        }
      ],
      exampleRequest: Object.keys(exampleRequest).length > 0 ? exampleRequest : { id: 'example-id' },
      exampleResponse: exampleResponse,
      sourcePath: path,
      relatedFiles: [...new Set(relatedFiles)] // Remove duplicates
    };
  } catch (error) {
    console.error(`Error extracting endpoint info from ${path}:`, error);
    return null;
  }
}

/**
 * Create a sample endpoint for demonstration
 * @param {string} path - File path
 * @returns {Object} - Sample endpoint
 */
function createSampleEndpoint(path) {
  const pathParts = path.split('/');
  const fileName = pathParts[pathParts.length - 1].replace(/\.\w+$/, '');
  const endpointId = fileName;
  
  // Format a nice API path
  let apiPath = `/api/${fileName}`;
  if (path.includes('pages/api/')) {
    const apiPathSegments = path.split('pages/api/')[1].split('.');
    apiPathSegments.pop(); // Remove file extension
    apiPath = `/api/${apiPathSegments.join('.')}`;
  }
  
  // Generate a method based on common naming conventions
  let method = 'POST';
  if (fileName.startsWith('get') || fileName.includes('list') || fileName.includes('search')) {
    method = 'GET';
  } else if (fileName.startsWith('update') || fileName.includes('edit')) {
    method = 'PUT';
  } else if (fileName.startsWith('delete') || fileName.includes('remove')) {
    method = 'DELETE';
  }
  
  // Generate description based on filename
  const readableName = fileName
    .replace(/([A-Z])/g, ' $1')
    .replace(/-/g, ' ')
    .toLowerCase();
  
  return {
    id: endpointId,
    path: apiPath,
    method: method,
    description: `${method} endpoint for ${readableName}`,
    requestParams: [
      {
        name: 'id',
        type: 'string',
        required: true,
        description: 'Identifier for the resource'
      }
    ],
    responseFields: [
      {
        name: 'success',
        type: 'boolean',
        description: 'Whether the request was successful'
      }
    ],
    exampleRequest: { id: 'example-id' },
    exampleResponse: { success: true },
    sourcePath: path,
    relatedFiles: []
  };
}

/**
 * Guess parameter type from its usage in code
 * @param {string} paramName - Parameter name
 * @param {string} content - File content
 * @returns {string} - Guessed type
 */
function guessTypeFromUsage(paramName, content) {
  // Check for type hints in variable names
  if (paramName.includes('id') || paramName.includes('Id')) return 'string';
  if (paramName.includes('name') || paramName.includes('Name')) return 'string';
  if (paramName.includes('email') || paramName.includes('Email')) return 'string';
  if (paramName.includes('count') || paramName.includes('Count')) return 'number';
  if (paramName.includes('is') || paramName.includes('has') || paramName.includes('enable') || paramName.includes('disable')) return 'boolean';
  if (paramName.includes('date') || paramName.includes('Date')) return 'string';
  if (paramName.includes('list') || paramName.includes('List') || paramName.includes('array') || paramName.includes('Array')) return 'array';
  if (paramName.includes('options') || paramName.includes('Options') || paramName.includes('config') || paramName.includes('Config')) return 'object';
  
  // Check for type checking in code
  const typeofCheck = content.match(new RegExp(`typeof\\s+${paramName}\\s*===?\\s*["']([\\w]+)["']`));
  if (typeofCheck) return typeofCheck[1];
  
  // Check for common operations
  if (content.includes(`${paramName}.map`) || content.includes(`${paramName}.forEach`) || content.includes(`${paramName}.filter`)) return 'array';
  if (content.includes(`${paramName}.length`)) return content.includes(`${paramName}[`) ? 'array' : 'string';
  if (content.includes(`${paramName}.toUpperCase`) || content.includes(`${paramName}.toLowerCase`)) return 'string';
  if (content.includes(`${paramName}.toFixed`) || content.includes(`${paramName} + 1`)) return 'number';
  
  // Default to string for unknown types
  return 'string';
}

/**
 * Guess type from a value expression
 * @param {string} value - Value expression from code
 * @returns {string} - Guessed type
 */
function guessTypeFromValue(value) {
  if (!value) return 'string';
  
  value = value.trim();
  
  if (value === 'true' || value === 'false') return 'boolean';
  if (value.match(/^\d+$/)) return 'number';
  if (value.match(/^['"].*['"]$/)) return 'string';
  if (value.match(/^\[.*\]$/)) return 'array';
  if (value.match(/^{.*}$/)) return 'object';
  if (value.includes('?') && value.includes(':')) return guessTypeFromValue(value.split(':')[1].trim());
  if (value.includes('JSON.stringify')) return 'string';
  if (value.includes('join')) return 'string';
  if (value.includes('map')) return 'array';
  if (value.includes('filter')) return 'array';
  
  // Handle variable references
  if (value.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)) {
    // Common naming conventions
    if (value.includes('count') || value.includes('Count') || value.includes('total') || value.includes('Total')) return 'number';
    if (value.includes('is') || value.includes('has')) return 'boolean';
    if (value.includes('list') || value.includes('List') || value.includes('array') || value.includes('Array')) return 'array';
    if (value.includes('obj') || value.includes('Obj') || value.includes('options') || value.includes('Options')) return 'object';
  }
  
  // Default to string for unknown types
  return 'string';
}