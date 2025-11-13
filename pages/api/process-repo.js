// // import { parseGitHubUrl, getRepositoryInfo, getAllFiles, getFileContent } from '../../lib/github';
// // import { chunkCodeFile } from '../../lib/chunker';
// // import { batchProcessEmbeddings, testHuggingFaceConnection } from '../../lib/embeddings';
// // import { addChunksToVectorStore, deleteRepositoryData } from '../../lib/chromadb';
// // import { getRepositoryId } from '../../lib/utils';

// // export default async function handler(req, res) {
// //   if (req.method !== 'POST') {
// //     return res.status(405).json({ error: 'Method not allowed' });
// //   }
  
// //   const { url } = req.body;
  
// //   if (!url) {
// //     return res.status(400).json({ error: 'GitHub repository URL is required' });
// //   }
  
// //   console.log(`Starting repository processing for: ${url}`);
  
// //   try {
    
// //     console.log('Step 1: Parsing GitHub URL...');
// //     const { owner, repo } = parseGitHubUrl(url);
// //     const repoId = getRepositoryId(owner, repo);
    
// //     console.log(`Repository: ${owner}/${repo}`);
    
    
// //     console.log('Step 2: Fetching repository information...');
// //     const repoInfo = await getRepositoryInfo(owner, repo);
    
// //     if (!repoInfo) {
// //       return res.status(404).json({ 
// //         error: 'Repository not found or not accessible',
// //         message: 'Please ensure the repository exists and is public'
// //       });
// //     }
    
// //     console.log(`Repository info retrieved: ${repoInfo.name} (${repoInfo.language})`);
    
    
// //     console.log('Step 3: Testing Hugging Face API connection...');
    
// //     if (!process.env.HUGGINGFACE_API_KEY) {
// //       return res.status(500).json({
// //         error: 'Hugging Face API key not configured',
// //         message: 'Please set HUGGINGFACE_API_KEY in your environment variables'
// //       });
// //     }
    
// //     const isApiWorking = await testHuggingFaceConnection();
// //     if (!isApiWorking) {
// //       return res.status(500).json({
// //         error: 'Hugging Face API connection failed',
// //         message: 'Please check your HUGGINGFACE_API_KEY and try again'
// //       });
// //     }
    
// //     console.log('✓ Hugging Face API connection successful');
    
    
// //     console.log('Step 4: Cleaning up existing repository data...');
// //     try {
// //       await deleteRepositoryData(repoId);
// //       console.log('✓ Existing data cleaned up');
// //     } catch (cleanupError) {
// //       console.log('No existing data to clean up or cleanup failed:', cleanupError.message);
// //     }
    
  
// //     console.log('Step 5: Fetching repository files...');
// //     const files = await getAllFiles(owner, repo);
    
// //     if (!files || files.length === 0) {
// //       return res.status(404).json({
// //         error: 'No supported files found in repository',
// //         message: 'The repository does not contain any supported file types (.js, .jsx, .ts, .tsx, .py, .java, .go, .cpp, .rs, .html, .css)',
// //         repository: repoInfo
// //       });
// //     }
    
// //     console.log(`Found ${files.length} supported files`);
    
    
// //     console.log('Step 6: Processing files and creating code chunks...');
// //     const chunks = [];
// //     let processedFiles = 0;
    
    
// //     const MAX_FILES = 50;
// //     const filesToProcess = files.slice(0, MAX_FILES);
    
// //     if (files.length > MAX_FILES) {
// //       console.log(`Note: Processing first ${MAX_FILES} files out of ${files.length} total files`);
// //     }
    
// //     for (const file of filesToProcess) {
// //       try {
// //         console.log(`Processing file: ${file.path}`);
        
        
// //         const content = await getFileContent(file.downloadUrl);
        
// //         if (!content || content.trim().length === 0) {
// //           console.log(`Skipping empty file: ${file.path}`);
// //           continue;
// //         }
        
     
// //         if (content.length > 100000) { 
// //           console.log(`Skipping large file (${content.length} chars): ${file.path}`);
// //           continue;
// //         }
        
       
// //         const fileChunks = chunkCodeFile(content, file.path);
        
// //         if (fileChunks && fileChunks.length > 0) {
// //           chunks.push(...fileChunks);
// //           processedFiles++;
// //           console.log(`✓ Created ${fileChunks.length} chunks from ${file.path}`);
// //         }
        
        
// //         await new Promise(resolve => setTimeout(resolve, 100));
        
// //       } catch (fileError) {
// //         console.error(`Error processing file ${file.path}:`, fileError.message);
        
// //         continue;
// //       }
// //     }
    
// //     if (chunks.length === 0) {
// //       return res.status(400).json({
// //         error: 'No code chunks could be created',
// //         message: 'The repository files could not be processed into analyzable chunks',
// //         repository: repoInfo,
// //         processedFiles,
// //         totalFiles: files.length
// //       });
// //     }
    
// //     console.log(`Created ${chunks.length} total chunks from ${processedFiles} files`);
    
   
// //     console.log('Step 7: Generating embeddings for code chunks...');
// //     console.log('This may take several minutes depending on the repository size...');
    
// //     let embeddedChunks;
// //     try {
// //       embeddedChunks = await batchProcessEmbeddings(chunks);
      
// //       if (!embeddedChunks || embeddedChunks.length === 0) {
// //         throw new Error('No embeddings were successfully generated');
// //       }
      
// //       console.log(`✓ Successfully generated embeddings for ${embeddedChunks.length}/${chunks.length} chunks`);
      
// //     } catch (embeddingError) {
// //       console.error('Embedding generation failed:', embeddingError);
      
// //       return res.status(500).json({
// //         error: 'Failed to generate embeddings',
// //         message: embeddingError.message,
// //         repository: repoInfo,
// //         processedFiles,
// //         totalChunks: chunks.length,
// //         suggestion: 'This might be due to rate limiting or API issues. Please try again in a few minutes.'
// //       });
// //     }
    
    
// //     console.log('Step 8: Storing embeddings in vector database...');
// //     try {
// //       await addChunksToVectorStore(repoId, embeddedChunks);
// //       console.log('✓ Successfully stored embeddings in vector database');
      
// //     } catch (vectorError) {
// //       console.error('Vector storage failed:', vectorError);
      
// //       return res.status(500).json({
// //         error: 'Failed to store embeddings',
// //         message: vectorError.message,
// //         repository: repoInfo,
// //         processedFiles,
// //         processedChunks: embeddedChunks.length
// //       });
// //     }
    
  
// //     console.log('🎉 Repository processing completed successfully!');
    
// //     const successResponse = {
// //       success: true,
// //       message: 'Repository processed successfully',
// //       repository: repoInfo,
// //       stats: {
// //         totalFiles: files.length,
// //         processedFiles,
// //         totalChunks: chunks.length,
// //         processedChunks: embeddedChunks.length,
// //         successRate: Math.round((embeddedChunks.length / chunks.length) * 100)
// //       },
// //       nextSteps: [
// //         'You can now chat with the repository',
// //         'Explore the file structure',
// //         'View generated documentation',
// //         'Analyze code health and dependencies'
// //       ]
// //     };
    
// //     return res.status(200).json(successResponse);
    
// //   } catch (error) {
// //     console.error('Repository processing failed:', error);
    
    
// //     let errorResponse = {
// //       error: 'Repository processing failed',
// //       message: error.message
// //     };
    
    
// //     if (error.message.includes('Not a valid GitHub URL')) {
// //       errorResponse.error = 'Invalid GitHub URL';
// //       errorResponse.suggestion = 'Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo)';
// //       return res.status(400).json(errorResponse);
// //     }
    
// //     if (error.message.includes('Failed to fetch repository information')) {
// //       errorResponse.error = 'Repository not accessible';
// //       errorResponse.suggestion = 'Please ensure the repository exists, is public, and you have the correct URL';
// //       return res.status(404).json(errorResponse);
// //     }
    
// //     if (error.message.includes('HUGGINGFACE_API_KEY')) {
// //       errorResponse.error = 'API configuration error';
// //       errorResponse.suggestion = 'Please check your Hugging Face API key configuration';
// //       return res.status(500).json(errorResponse);
// //     }
    
// //     if (error.message.includes('rate limit') || error.message.includes('fetching the blob')) {
// //       errorResponse.error = 'API rate limit exceeded';
// //       errorResponse.suggestion = 'Please wait a few minutes and try again. Consider upgrading your Hugging Face plan for higher rate limits.';
// //       return res.status(429).json(errorResponse);
// //     }
    
   
// //     errorResponse.suggestion = 'Please try again. If the problem persists, check the server logs for more details.';
// //     return res.status(500).json(errorResponse);
// //   }
// // }


// // function validateEnvironment() {
// //   const required = ['HUGGINGFACE_API_KEY', 'GITHUB_TOKEN'];
// //   const missing = required.filter(key => !process.env[key]);
  
// //   if (missing.length > 0) {
// //     throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
// //   }
// // }

// // export { validateEnvironment };
// import { parseGitHubUrl, getRepositoryInfo, getAllFiles, getFileContent } from '../../lib/github';
// import { chunkCodeFile } from '../../lib/chunker';
// import { batchProcessEmbeddingsFast } from '../../lib/embeddings';
// import { addChunksToVectorStoreFast, deleteRepositoryData } from '../../lib/chromadb';
// import { getRepositoryId } from '../../lib/utils';

// export default async function handler(req, res) {
//   if (req.method !== 'POST') {
//     return res.status(405).json({ error: 'Method not allowed' });
//   }
  
//   const { url } = req.body;
  
//   if (!url) {
//     return res.status(400).json({ error: 'GitHub URL is required' });
//   }
  
//   try {
//     console.log(`Starting processing for: ${url}`);
    
//     const { owner, repo } = parseGitHubUrl(url);
//     const repoId = getRepositoryId(owner, repo);
    
//     const repositoryInfo = await getRepositoryInfo(owner, repo);
//     console.log(`Repository info retrieved: ${repositoryInfo.name}`);
    
//     await deleteRepositoryData(repoId);
//     console.log('Cleared existing data');
    
//     const files = await getAllFiles(owner, repo);
//     console.log(`Found ${files.length} files`);
    
//     if (files.length === 0) {
//       return res.status(200).json({
//         success: true,
//         repository: repositoryInfo,
//         processedFiles: 0,
//         processedChunks: 0,
//         message: 'No supported files found in repository'
//       });
//     }
    
//     const MAX_FILES = 100;
//     const filesToProcess = files.slice(0, MAX_FILES);
    
//     console.log(`Processing ${filesToProcess.length} files...`);
    
//     const allChunks = [];
//     let processedFiles = 0;
    
//     const CONCURRENT_FILES = 5;
    
//     for (let i = 0; i < filesToProcess.length; i += CONCURRENT_FILES) {
//       const batch = filesToProcess.slice(i, i + CONCURRENT_FILES);
      
//       const promises = batch.map(async (file) => {
//         try {
//           const content = await getFileContent(file.downloadUrl);
          
//           if (!content || content.length < 50) {
//             return [];
//           }
          
//           if (content.length > 50000) {
//             console.log(`Skipping large file: ${file.path} (${content.length} chars)`);
//             return [];
//           }
          
//           const chunks = chunkCodeFile(content, file.path, 300);
          
//           if (chunks.length > 20) {
//             return chunks.slice(0, 20);
//           }
          
//           return chunks;
//         } catch (error) {
//           console.error(`Error processing file ${file.path}:`, error.message);
//           return [];
//         }
//       });
      
//       const batchResults = await Promise.allSettled(promises);
      
//       batchResults.forEach((result, index) => {
//         if (result.status === 'fulfilled') {
//           allChunks.push(...result.value);
//           processedFiles++;
//         }
//       });
      
//       console.log(`Processed file batch ${Math.floor(i / CONCURRENT_FILES) + 1}/${Math.ceil(filesToProcess.length / CONCURRENT_FILES)}`);
//     }
    
//     console.log(`Generated ${allChunks.length} chunks from ${processedFiles} files`);
    
//     if (allChunks.length === 0) {
//       return res.status(200).json({
//         success: true,
//         repository: repositoryInfo,
//         processedFiles: processedFiles,
//         processedChunks: 0,
//         message: 'No code chunks could be generated'
//       });
//     }
    
//     const MAX_CHUNKS = 500;
//     const chunksToEmbed = allChunks.slice(0, MAX_CHUNKS);
    
//     console.log(`Generating embeddings for ${chunksToEmbed.length} chunks...`);
    
//     const embeddedChunks = await batchProcessEmbeddingsFast(chunksToEmbed);
    
//     console.log(`Generated ${embeddedChunks.length} embeddings`);
    
//     if (embeddedChunks.length === 0) {
//       return res.status(200).json({
//         success: true,
//         repository: repositoryInfo,
//         processedFiles: processedFiles,
//         processedChunks: 0,
//         message: 'Failed to generate embeddings'
//       });
//     }
    
//     console.log('Storing in vector database...');
    
//     await addChunksToVectorStoreFast(repoId, embeddedChunks);
    
//     console.log('Repository processing completed successfully');
    
//     return res.status(200).json({
//       success: true,
//       repository: repositoryInfo,
//       processedFiles: processedFiles,
//       processedChunks: embeddedChunks.length
//     });
    
//   } catch (error) {
//     console.error('Error processing repository:', error);
    
//     return res.status(500).json({
//       error: 'Failed to process repository',
//       message: error.message,
//     });
//   }
// }
import { parseGitHubUrl, getRepositoryInfo, getAllFiles, getFileContent } from '../../lib/github';
import { chunkCodeFile } from '../../lib/chunker';
import { batchProcessEmbeddingsFast } from '../../lib/embeddings';
import { addChunksToVectorStoreFast, deleteRepositoryData } from '../../lib/chromadb';
import { getRepositoryId } from '../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'GitHub URL is required' });
  }
  
  try {
    console.log(`Starting processing for: ${url}`);
    
    const { owner, repo } = parseGitHubUrl(url);
    const repoId = getRepositoryId(owner, repo);
    
    const repositoryInfo = await getRepositoryInfo(owner, repo);
    console.log(`Repository info retrieved: ${repositoryInfo.name}`);
    
    await deleteRepositoryData(repoId);
    console.log('Cleared existing data');
    
    const files = await getAllFiles(owner, repo);
    console.log(`Found ${files.length} files`);
    
    if (files.length === 0) {
      return res.status(200).json({
        success: true,
        repository: repositoryInfo,
        processedFiles: 0,
        processedChunks: 0,
        message: 'No supported files found in repository'
      });
    }
    
    const MAX_FILES = 100;
    const filesToProcess = files.slice(0, MAX_FILES);
    
    console.log(`Processing ${filesToProcess.length} files...`);
    
    const allChunks = [];
    let processedFiles = 0;
    
    const CONCURRENT_FILES = 5;
    
    for (let i = 0; i < filesToProcess.length; i += CONCURRENT_FILES) {
      const batch = filesToProcess.slice(i, i + CONCURRENT_FILES);
      
      const promises = batch.map(async (file) => {
        try {
          const content = await getFileContent(file.downloadUrl);
          
          if (!content || content.length < 50) {
            return [];
          }
          
          if (content.length > 50000) {
            console.log(`Skipping large file: ${file.path} (${content.length} chars)`);
            return [];
          }
          
          const chunks = chunkCodeFile(content, file.path, 300);
          
          if (chunks.length > 20) {
            return chunks.slice(0, 20);
          }
          
          return chunks;
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error.message);
          return [];
        }
      });
      
      const batchResults = await Promise.allSettled(promises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allChunks.push(...result.value);
          processedFiles++;
        }
      });
      
      console.log(`Processed file batch ${Math.floor(i / CONCURRENT_FILES) + 1}/${Math.ceil(filesToProcess.length / CONCURRENT_FILES)}`);
    }
    
    console.log(`Generated ${allChunks.length} chunks from ${processedFiles} files`);
    
    if (allChunks.length === 0) {
      return res.status(200).json({
        success: true,
        repository: repositoryInfo,
        processedFiles: processedFiles,
        processedChunks: 0,
        message: 'No code chunks could be generated'
      });
    }
    
    const MAX_CHUNKS = 500;
    const chunksToEmbed = allChunks.slice(0, MAX_CHUNKS);
    
    console.log(`Generating embeddings for ${chunksToEmbed.length} chunks...`);
    
    const embeddedChunks = await batchProcessEmbeddingsFast(chunksToEmbed);
    
    console.log(`Generated ${embeddedChunks.length} embeddings`);
    
    if (embeddedChunks.length === 0) {
      return res.status(200).json({
        success: true,
        repository: repositoryInfo,
        processedFiles: processedFiles,
        processedChunks: 0,
        message: 'Failed to generate embeddings'
      });
    }
    
    console.log('Storing in vector database...');
    
    await addChunksToVectorStoreFast(repoId, embeddedChunks);
    
    console.log('Repository processing completed successfully');
    
    return res.status(200).json({
      success: true,
      repository: repositoryInfo,
      processedFiles: processedFiles,
      processedChunks: embeddedChunks.length
    });
    
  } catch (error) {
    console.error('Error processing repository:', error);
    
    return res.status(500).json({
      error: 'Failed to process repository',
      message: error.message,
    });
  }
}