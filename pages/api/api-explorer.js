

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
    
    let collection;
    try {
      collection = await getCollection(repoId);
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
    
    const apiQuery = await generateEmbedding("API endpoint route handler request response");
    
    const apiChunks = await querySimilarChunks(repoId, apiQuery, 50);
    
    if (!apiChunks || apiChunks.length === 0) {
      return res.status(200).json({
        apiRoot: "/api",
        endpoints: [],
        message: "Unable to analyze API endpoints in this repository."
      });
    }
    
    console.log(`Found ${apiChunks.length} API-related chunks`);
    
    const endpoints = [];
    
    const apiFileChunks = apiChunks.filter(chunk => 
      chunk.metadata && 
      chunk.metadata.path && 
      (chunk.metadata.path.includes('/api/') || 
       chunk.metadata.path.includes('controller') || 
       chunk.metadata.path.includes('routes') ||
       chunk.content.includes('export default') ||
       chunk.content.includes('req.method') ||
       chunk.content.includes('res.status') ||
       chunk.content.includes('res.json'))
    );
    
    console.log(`Found ${apiFileChunks.length} filtered API chunks`);
    
    const fileChunks = {};
    apiFileChunks.forEach(chunk => {
      if (!chunk.metadata || !chunk.metadata.path) return;
      
      const path = chunk.metadata.path;
      if (!fileChunks[path]) {
        fileChunks[path] = [];
      }
      
      fileChunks[path].push(chunk);
    });
    
    console.log(`Processing ${Object.keys(fileChunks).length} files`);
    
    const processedPaths = new Set();
    
    for (const [path, chunks] of Object.entries(fileChunks)) {
      if (processedPaths.has(path)) continue;
      processedPaths.add(path);
      
      const fileContent = chunks.map(chunk => chunk.content).join('\n\n');
      
      const endpoint = extractEndpointInfo(path, fileContent);
      
      if (endpoint) {
        endpoints.push(endpoint);
        console.log(`Created endpoint for ${path}: ${endpoint.method} ${endpoint.path}`);
      }
    }
    
    if (endpoints.length === 0) {
      console.log('No endpoints found, creating sample endpoints...');
      
      try {
        const files = await getAllFiles(owner, repo);
        const potentialApiFiles = files.filter(file => 
          file.path.includes('/api/') || 
          file.path.includes('controller') || 
          file.path.includes('routes') ||
          file.path.includes('handlers')
        );
        
        console.log(`Found ${potentialApiFiles.length} potential API files`);
        
        if (potentialApiFiles.length === 0) {
          endpoints.push(
            {
              id: 'sample-get',
              path: '/api/example',
              method: 'GET',
              description: 'Sample GET endpoint',
              requestParams: [
                { name: 'id', type: 'string', required: true, description: 'Resource identifier' }
              ],
              responseFields: [
                { name: 'data', type: 'object', description: 'Response data' },
                { name: 'success', type: 'boolean', description: 'Request success status' }
              ],
              exampleRequest: { id: 'example-123' },
              exampleResponse: { data: { message: 'Hello World' }, success: true },
              sourcePath: 'Generated example',
              relatedFiles: []
            },
            {
              id: 'sample-post',
              path: '/api/data',
              method: 'POST',
              description: 'Sample POST endpoint',
              requestParams: [
                { name: 'name', type: 'string', required: true, description: 'Item name' },
                { name: 'value', type: 'string', required: false, description: 'Item value' }
              ],
              responseFields: [
                { name: 'id', type: 'string', description: 'Created item ID' },
                { name: 'success', type: 'boolean', description: 'Creation success status' }
              ],
              exampleRequest: { name: 'example', value: 'test' },
              exampleResponse: { id: 'new-123', success: true },
              sourcePath: 'Generated example',
              relatedFiles: []
            }
          );
        } else {
          for (const file of potentialApiFiles.slice(0, 5)) {
            const endpoint = createSampleEndpoint(file.path);
            if (endpoint) {
              endpoints.push(endpoint);
            }
          }
        }
      } catch (error) {
        console.error('Error getting repository files:', error);
        
        endpoints.push({
          id: 'fallback',
          path: '/api/unknown',
          method: 'POST',
          description: 'API endpoint detected but analysis failed',
          requestParams: [{ name: 'data', type: 'object', required: true, description: 'Request data' }],
          responseFields: [{ name: 'result', type: 'object', description: 'Response result' }],
          exampleRequest: { data: 'example' },
          exampleResponse: { result: 'success' },
          sourcePath: 'Unknown',
          relatedFiles: []
        });
      }
    }
    
    console.log(`Final endpoint count: ${endpoints.length}`);
    endpoints.sort((a, b) => a.path.localeCompare(b.path));
    
    return res.status(200).json({
      apiRoot: "/api",
      endpoints,
      success: true,
      debug: {
        totalChunks: apiChunks.length,
        filteredChunks: apiFileChunks ? apiFileChunks.length : 0,
        processedFiles: Object.keys(fileChunks || {}).length,
        endpointCount: endpoints.length
      }
    });
  } catch (error) {
    console.error('Error analyzing API endpoints:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze API endpoints',
      message: error.message,
    });
  }
}

function extractEndpointInfo(path, content) {
  try {
    const pathParts = path.split('/');
    const fileName = pathParts[pathParts.length - 1].replace(/\.\w+$/, '');
    const endpointId = fileName;
    
    let method = 'POST';
    
    if (content.includes('req.method === \'GET\'') || content.includes('method: \'GET\'')) {
      method = 'GET';
    } else if (content.includes('req.method === \'PUT\'') || content.includes('method: \'PUT\'')) {
      method = 'PUT';
    } else if (content.includes('req.method === \'DELETE\'') || content.includes('method: \'DELETE\'')) {
      method = 'DELETE';
    }
    
    let apiPath = `/api/${fileName}`;
    
    if (path.includes('pages/api/')) {
      const apiPathSegments = path.split('pages/api/')[1].split('.');
      apiPathSegments.pop();
      apiPath = `/api/${apiPathSegments.join('.')}`;
    }
    
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
      description = `${method} endpoint for ${fileName.replace(/-/g, ' ')} operations`;
    }
    
    const requestParams = [];
    
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
    
    const responseFields = [];
    
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
    
    if (responseFields.length === 0) {
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
    
    if (Object.keys(exampleResponse).length === 0) {
      exampleResponse.success = true;
      responseFields.push({
        name: 'success',
        type: 'boolean',
        description: 'Whether the request was successful'
      });
    }
    
    const relatedFiles = [];
    const importMatches = content.match(/(?:import|require)\s+.*?(?:from\s+)?['"]([^'"]+)['"]/g);
    if (importMatches) {
      importMatches.forEach(importStatement => {
        const match = importStatement.match(/['"]([^'"]+)['"]/);
        if (match) {
          const importPath = match[1];
          if (!importPath.startsWith('.')) return;
          
          let absolutePath = importPath;
          if (importPath.startsWith('./')) {
            const dir = path.substring(0, path.lastIndexOf('/'));
            absolutePath = `${dir}/${importPath.substring(2)}`;
          } else if (importPath.startsWith('../')) {
            const dir = path.substring(0, path.lastIndexOf('/'));
            const parentDir = dir.substring(0, dir.lastIndexOf('/'));
            absolutePath = `${parentDir}/${importPath.substring(3)}`;
          }
          
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
      relatedFiles: [...new Set(relatedFiles)]
    };
  } catch (error) {
    console.error(`Error extracting endpoint info from ${path}:`, error);
    return null;
  }
}

function createSampleEndpoint(path) {
  const pathParts = path.split('/');
  const fileName = pathParts[pathParts.length - 1].replace(/\.\w+$/, '');
  const endpointId = fileName;
  
  let apiPath = `/api/${fileName}`;
  if (path.includes('pages/api/')) {
    const apiPathSegments = path.split('pages/api/')[1].split('.');
    apiPathSegments.pop();
    apiPath = `/api/${apiPathSegments.join('.')}`;
  }
  
  let method = 'POST';
  if (fileName.startsWith('get') || fileName.includes('list') || fileName.includes('search')) {
    method = 'GET';
  } else if (fileName.startsWith('update') || fileName.includes('edit')) {
    method = 'PUT';
  } else if (fileName.startsWith('delete') || fileName.includes('remove')) {
    method = 'DELETE';
  }
  
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

function guessTypeFromUsage(paramName, content) {
  if (paramName.includes('id') || paramName.includes('Id')) return 'string';
  if (paramName.includes('name') || paramName.includes('Name')) return 'string';
  if (paramName.includes('email') || paramName.includes('Email')) return 'string';
  if (paramName.includes('count') || paramName.includes('Count')) return 'number';
  if (paramName.includes('is') || paramName.includes('has') || paramName.includes('enable') || paramName.includes('disable')) return 'boolean';
  if (paramName.includes('date') || paramName.includes('Date')) return 'string';
  if (paramName.includes('list') || paramName.includes('List') || paramName.includes('array') || paramName.includes('Array')) return 'array';
  if (paramName.includes('options') || paramName.includes('Options') || paramName.includes('config') || paramName.includes('Config')) return 'object';
  
  const typeofCheck = content.match(new RegExp(`typeof\\s+${paramName}\\s*===?\\s*["']([\\w]+)["']`));
  if (typeofCheck) return typeofCheck[1];
  
  if (content.includes(`${paramName}.map`) || content.includes(`${paramName}.forEach`) || content.includes(`${paramName}.filter`)) return 'array';
  if (content.includes(`${paramName}.length`)) return content.includes(`${paramName}[`) ? 'array' : 'string';
  if (content.includes(`${paramName}.toUpperCase`) || content.includes(`${paramName}.toLowerCase`)) return 'string';
  if (content.includes(`${paramName}.toFixed`) || content.includes(`${paramName} + 1`)) return 'number';
  
  return 'string';
}

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
  
  if (value.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*$/)) {
    if (value.includes('count') || value.includes('Count') || value.includes('total') || value.includes('Total')) return 'number';
    if (value.includes('is') || value.includes('has')) return 'boolean';
    if (value.includes('list') || value.includes('List') || value.includes('array') || value.includes('Array')) return 'array';
    if (value.includes('obj') || value.includes('Obj') || value.includes('options') || value.includes('Options')) return 'object';
  }
  
  return 'string';
}