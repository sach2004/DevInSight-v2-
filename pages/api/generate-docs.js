import { Groq } from 'groq-sdk';
import { Octokit } from 'octokit';
import { getCollection, querySimilarChunks } from '../../lib/chromadb';
import { generateEmbedding } from '../../lib/embeddings';
import { getRepositoryInfo } from '../../lib/github';
import { getRepositoryId } from '../../lib/utils';


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});


const MODEL = 'llama-3.1-8b-instant';
const MAX_TOKENS = 4096;


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  console.log("Request body:", JSON.stringify(req.body));
  
  
  let owner, repo;
  
  if (req.body.url) {
    
    try {
      const url = new URL(req.body.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) {
        owner = pathParts[0];
        repo = pathParts[1];
      }
    } catch (error) {
      console.error("Error parsing URL:", error);
      return res.status(400).json({ error: 'Invalid GitHub URL' });
    }
  } else if (req.body.owner && req.body.repo) {
    
    owner = req.body.owner;
    repo = req.body.repo;
  } else if (req.body.repository) {
   
    owner = req.body.repository.owner?.name || req.body.repository.owner;
    repo = req.body.repository.name;
  } else {
    return res.status(400).json({ error: 'Owner and repo parameters are required' });
  }
  
  console.log(`Processing documentation for ${owner}/${repo}`);
  
  if (!owner || !repo) {
    return res.status(400).json({ error: 'Owner and repo parameters are required' });
  }
  
  try {
    const repoId = getRepositoryId(owner, repo);
    
    
    const repoInfo = await getRepositoryInfo(owner, repo);
    console.log("Repository info retrieved:", repoInfo.name);
    
    
    let collectionExists = false;
    try {
      await getCollection(repoId);
      collectionExists = true;
    } catch (error) {
      console.error("Collection not found:", error);
      
      collectionExists = false;
    }
    
    let documentation;
    
    if (collectionExists) {
      try {
       
        const overviewQuery = await generateEmbedding("What is this project about? Explain the purpose, main features, and architecture");
        const structureQuery = await generateEmbedding("Describe the project structure, main directories, and important files");
        const architectureQuery = await generateEmbedding("Explain the software architecture, design patterns, and code organization");
        const apiQuery = await generateEmbedding("Document the main APIs, functions, and interfaces used in this project");
        const dependenciesQuery = await generateEmbedding("List the main dependencies and technologies used in this project");
        const setupQuery = await generateEmbedding("How to set up, install, and run this project? What are the requirements?");
        
       
        const overviewChunks = await querySimilarChunks(repoId, overviewQuery, 5);
        const structureChunks = await querySimilarChunks(repoId, structureQuery, 5);
        const architectureChunks = await querySimilarChunks(repoId, architectureQuery, 5);
        const apiChunks = await querySimilarChunks(repoId, apiQuery, 5);
        const dependenciesChunks = await querySimilarChunks(repoId, dependenciesQuery, 5);
        const setupChunks = await querySimilarChunks(repoId, setupQuery, 5);
        
        
        const usedLanguages = new Set();
        const allChunks = [
          ...overviewChunks, 
          ...structureChunks, 
          ...architectureChunks,
          ...apiChunks,
          ...dependenciesChunks,
          ...setupChunks
        ];
        
        allChunks.forEach(chunk => {
          if (chunk.metadata && chunk.metadata.language) {
            usedLanguages.add(chunk.metadata.language);
          }
        });
        
        
        let dependencies = [];
        let framework = '';
        
        try {
          const packageJsonFiles = await octokit.rest.search.code({
            q: `filename:package.json repo:${owner}/${repo}`,
          });
          
          if (packageJsonFiles.data.items.length > 0) {
            const packageJsonUrl = packageJsonFiles.data.items[0].html_url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
            const packageJsonContent = await fetch(packageJsonUrl).then(r => r.json()).catch(() => null);
            
            if (packageJsonContent) {
              
              const allDeps = {
                ...(packageJsonContent.dependencies || {}),
                ...(packageJsonContent.devDependencies || {})
              };
              
              dependencies = Object.keys(allDeps).slice(0, 10);
              
             
              if (allDeps.react) framework = 'React';
              else if (allDeps.vue) framework = 'Vue.js';
              else if (allDeps.angular) framework = 'Angular';
              else if (allDeps.next) framework = 'Next.js';
              else if (allDeps.nuxt) framework = 'Nuxt.js';
              else if (allDeps.express) framework = 'Express.js';
              else if (allDeps.koa) framework = 'Koa.js';
              else if (allDeps['@nestjs/core']) framework = 'NestJS';
            }
          }
        } catch (error) {
          console.error('Error fetching package.json:', error);
         
        }
        
        
        const overviewContent = await generateDocSection(
          "Overview", 
          "Provide a comprehensive overview of this project. Explain what this project does, its purpose, main features, and target users. Include any relevant background information.", 
          overviewChunks, 
          repoInfo
        );
        
        const structureContent = await generateDocSection(
          "Project Structure", 
          "Describe the project structure in detail. Explain the main directories, key files, and how they are organized. Focus on the most important parts of the codebase.", 
          structureChunks, 
          repoInfo
        );
        
        const architectureContent = await generateDocSection(
          "Architecture & Design", 
          "Explain the software architecture and design patterns used in this project. Describe the main components, how they interact, and the overall system design.", 
          architectureChunks, 
          repoInfo
        );
        
        const apiContent = await generateDocSection(
          "API Documentation", 
          "Document the main APIs, functions, classes, and interfaces in this project. Provide details on parameters, return values, and usage examples where appropriate.", 
          apiChunks, 
          repoInfo
        );
        
        const setupContent = await generateDocSection(
          "Setup & Installation", 
          "Provide detailed instructions on how to set up, install, and run this project. Include prerequisites, environment setup, configuration options, and any troubleshooting tips.", 
          setupChunks, 
          repoInfo
        );
        
        
        documentation = {
          title: `${repoInfo.name} Documentation`,
          overview: overviewContent,
          meta: {
            language: Array.from(usedLanguages)[0] || repoInfo.language || 'Unknown',
            framework: framework || 'Not detected',
            dependencies: dependencies
          },
          sections: {
            structure: {
              title: "Project Structure",
              content: structureContent
            },
            architecture: {
              title: "Architecture & Design",
              content: architectureContent
            },
            api: {
              title: "API Documentation",
              content: apiContent
            },
            setup: {
              title: "Setup & Installation",
              content: setupContent
            }
          }
        };
      } catch (error) {
        console.error("Error generating real documentation:", error);
      
        documentation = generateMockDocumentation(repoInfo);
      }
    } else {
      
      documentation = generateMockDocumentation(repoInfo);
    }
    
   
    const updatedRepository = {
      ...repoInfo,
      documentation: documentation
    };
    
    
    console.log("Documentation generated successfully");
    console.log("Repository keys:", Object.keys(updatedRepository));
    
    return res.status(200).json({
      repository: updatedRepository
    });
  } catch (error) {
    console.error('Error generating documentation:', error);
    
    
    try {
      const basicRepoInfo = await getRepositoryInfo(owner, repo);
      console.log("Returning basic repository info without documentation");
      
      const basicDocumentation = {
        title: `${basicRepoInfo.name} Documentation`,
        overview: basicRepoInfo.description || 'No detailed overview available.',
        meta: {
          language: basicRepoInfo.language || 'Unknown',
          dependencies: []
        },
        sections: {}
      };
      
      return res.status(200).json({
        repository: {
          ...basicRepoInfo,
          documentation: basicDocumentation
        }
      });
    } catch (repoError) {
      console.error('Error retrieving basic repository info:', repoError);
      
      return res.status(500).json({
        error: 'Failed to generate documentation and retrieve repository info',
        message: error.message
      });
    }
  }
}

/**

 * @param {string} title 
 * @param {string} prompt 
 * @param {Array<Object>} chunks 
 * @param {Object} repoInfo 
 * @returns {Promise<string>} 
 */
async function generateDocSection(title, prompt, chunks, repoInfo) {
  try {
    if (!chunks || chunks.length === 0) {
      return `# ${title}\n\nNo relevant code found for this section.`;
    }
    
    
    let context = '';
    
    chunks.forEach((chunk, index) => {
      const { content, metadata } = chunk;
      const filePath = metadata?.path || 'Unknown file';
      const chunkName = metadata?.name || 'Unnamed section';
      
      context += `\n\n--- FILE: ${filePath} ---\n`;
      context += `--- SECTION: ${chunkName} ---\n`;
      context += `${content}\n`;
    });
    
    
    const systemPrompt = `You are a professional technical documentation writer specializing in software development. 
You're tasked with creating a high-quality documentation section for the '${repoInfo.name}' repository.

The documentation should be thorough, clear, and well-structured. Focus on providing valuable insights about the code, not just summarizing it.
Use proper Markdown formatting with headings, lists, code blocks, and other formatting as appropriate.

Your documentation should:
1. Be written for developers who need to understand this codebase
2. Include code examples where relevant, using proper syntax highlighting
3. Explain technical concepts clearly and accurately
4. Be well-organized with appropriate headings and structure
5. Focus on the most important aspects rather than exhaustively covering everything`;
    
   
    const userPrompt = `I need you to write the "${title}" section of the documentation for the ${repoInfo.name} repository.

${prompt}

Here are the relevant parts of the codebase to help you write this section:
${context}

Write a comprehensive, well-structured documentation section using Markdown formatting. Include code examples where appropriate. Focus on the most important information that developers would need to know.`;
    
    
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: MAX_TOKENS,
      top_p: 0.95,
    });
    
    return response.choices[0]?.message?.content || 'Unable to generate documentation for this section.';
  } catch (error) {
    console.error(`Error generating documentation section '${title}':`, error);
    return `# ${title}\n\nUnable to generate documentation for this section due to an error: ${error.message}`;
  }
}

/**
 
 * @param {Object} repoInfo 
 * @returns {Object} 
 */
function generateMockDocumentation(repoInfo) {
  return {
    title: `${repoInfo.name} Documentation`,
    overview: `# ${repoInfo.name}\n\nThis is an auto-generated overview of the ${repoInfo.name} repository. ${repoInfo.description ? `This project ${repoInfo.description}.` : 'This project is a software project hosted on GitHub.'}\n\n## Purpose\n\nThe main purpose of this project is to provide functionality as described in the repository description. For more detailed documentation, please ensure the repository has been properly processed.`,
    meta: {
      language: repoInfo.language || 'Unknown',
      framework: 'Not detected',
      dependencies: []
    },
    sections: {
      structure: {
        title: "Project Structure",
        content: "# Project Structure\n\nThis section would normally describe the structure of the project, including main directories and files. Since the repository hasn't been fully processed, detailed information is not available yet.\n\nTo generate complete documentation, make sure the repository has been properly processed through the system."
      },
      architecture: {
        title: "Architecture & Design",
        content: "# Architecture & Design\n\nThis section would normally explain the overall architecture of the application. Since the repository hasn't been fully processed, detailed information is not available yet.\n\nTo generate complete documentation, make sure the repository has been properly processed through the system."
      },
      api: {
        title: "API Documentation",
        content: "# API Documentation\n\nThis section would normally document the API endpoints and functions. Since the repository hasn't been fully processed, detailed information is not available yet.\n\nTo generate complete documentation, make sure the repository has been properly processed through the system."
      },
      setup: {
        title: "Setup & Installation",
        content: "# Setup & Installation\n\nThis section would normally provide detailed setup and installation instructions. Since the repository hasn't been fully processed, detailed information is not available yet.\n\nTypical steps might include:\n\n1. Clone the repository\n2. Install dependencies\n3. Configure environment variables\n4. Run the application\n\nFor detailed instructions, please refer to the repository's README file."
      }
    }
  };
}