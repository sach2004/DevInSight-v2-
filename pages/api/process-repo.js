import { parseGitHubUrl, getRepositoryInfo, getAllFiles, getFileContent } from '../../lib/github';
import { chunkCodeFile } from '../../lib/chunker';
import { batchProcessEmbeddings, testHuggingFaceConnection } from '../../lib/embeddings';
import { addChunksToVectorStore, deleteRepositoryData } from '../../lib/chromadb';
import { getRepositoryId } from '../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'GitHub repository URL is required' });
  }
  
  console.log(`Starting repository processing for: ${url}`);
  
  try {
    // Step 1: Parse and validate GitHub URL
    console.log('Step 1: Parsing GitHub URL...');
    const { owner, repo } = parseGitHubUrl(url);
    const repoId = getRepositoryId(owner, repo);
    
    console.log(`Repository: ${owner}/${repo}`);
    
    // Step 2: Get repository information
    console.log('Step 2: Fetching repository information...');
    const repoInfo = await getRepositoryInfo(owner, repo);
    
    if (!repoInfo) {
      return res.status(404).json({ 
        error: 'Repository not found or not accessible',
        message: 'Please ensure the repository exists and is public'
      });
    }
    
    console.log(`Repository info retrieved: ${repoInfo.name} (${repoInfo.language})`);
    
    // Step 3: Test Hugging Face API connection before proceeding
    console.log('Step 3: Testing Hugging Face API connection...');
    
    if (!process.env.HUGGINGFACE_API_KEY) {
      return res.status(500).json({
        error: 'Hugging Face API key not configured',
        message: 'Please set HUGGINGFACE_API_KEY in your environment variables'
      });
    }
    
    const isApiWorking = await testHuggingFaceConnection();
    if (!isApiWorking) {
      return res.status(500).json({
        error: 'Hugging Face API connection failed',
        message: 'Please check your HUGGINGFACE_API_KEY and try again'
      });
    }
    
    console.log('✓ Hugging Face API connection successful');
    
    // Step 4: Clean up any existing data for this repository
    console.log('Step 4: Cleaning up existing repository data...');
    try {
      await deleteRepositoryData(repoId);
      console.log('✓ Existing data cleaned up');
    } catch (cleanupError) {
      console.log('No existing data to clean up or cleanup failed:', cleanupError.message);
    }
    
    // Step 5: Get all files from the repository
    console.log('Step 5: Fetching repository files...');
    const files = await getAllFiles(owner, repo);
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        error: 'No supported files found in repository',
        message: 'The repository does not contain any supported file types (.js, .jsx, .ts, .tsx, .py, .java, .go, .cpp, .rs, .html, .css)',
        repository: repoInfo
      });
    }
    
    console.log(`Found ${files.length} supported files`);
    
    // Step 6: Process files and create chunks
    console.log('Step 6: Processing files and creating code chunks...');
    const chunks = [];
    let processedFiles = 0;
    
    // Limit the number of files to process to avoid overwhelming the API
    const MAX_FILES = 50;
    const filesToProcess = files.slice(0, MAX_FILES);
    
    if (files.length > MAX_FILES) {
      console.log(`Note: Processing first ${MAX_FILES} files out of ${files.length} total files`);
    }
    
    for (const file of filesToProcess) {
      try {
        console.log(`Processing file: ${file.path}`);
        
        // Get file content
        const content = await getFileContent(file.downloadUrl);
        
        if (!content || content.trim().length === 0) {
          console.log(`Skipping empty file: ${file.path}`);
          continue;
        }
        
        // Skip very large files to avoid memory issues
        if (content.length > 100000) { // 100KB limit
          console.log(`Skipping large file (${content.length} chars): ${file.path}`);
          continue;
        }
        
        // Create chunks from the file
        const fileChunks = chunkCodeFile(content, file.path);
        
        if (fileChunks && fileChunks.length > 0) {
          chunks.push(...fileChunks);
          processedFiles++;
          console.log(`✓ Created ${fileChunks.length} chunks from ${file.path}`);
        }
        
        // Add a small delay to avoid overwhelming GitHub's API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (fileError) {
        console.error(`Error processing file ${file.path}:`, fileError.message);
        // Continue processing other files instead of failing completely
        continue;
      }
    }
    
    if (chunks.length === 0) {
      return res.status(400).json({
        error: 'No code chunks could be created',
        message: 'The repository files could not be processed into analyzable chunks',
        repository: repoInfo,
        processedFiles,
        totalFiles: files.length
      });
    }
    
    console.log(`Created ${chunks.length} total chunks from ${processedFiles} files`);
    
    // Step 7: Generate embeddings for chunks
    console.log('Step 7: Generating embeddings for code chunks...');
    console.log('This may take several minutes depending on the repository size...');
    
    let embeddedChunks;
    try {
      embeddedChunks = await batchProcessEmbeddings(chunks);
      
      if (!embeddedChunks || embeddedChunks.length === 0) {
        throw new Error('No embeddings were successfully generated');
      }
      
      console.log(`✓ Successfully generated embeddings for ${embeddedChunks.length}/${chunks.length} chunks`);
      
    } catch (embeddingError) {
      console.error('Embedding generation failed:', embeddingError);
      
      return res.status(500).json({
        error: 'Failed to generate embeddings',
        message: embeddingError.message,
        repository: repoInfo,
        processedFiles,
        totalChunks: chunks.length,
        suggestion: 'This might be due to rate limiting or API issues. Please try again in a few minutes.'
      });
    }
    
    // Step 8: Store embeddings in vector database
    console.log('Step 8: Storing embeddings in vector database...');
    try {
      await addChunksToVectorStore(repoId, embeddedChunks);
      console.log('✓ Successfully stored embeddings in vector database');
      
    } catch (vectorError) {
      console.error('Vector storage failed:', vectorError);
      
      return res.status(500).json({
        error: 'Failed to store embeddings',
        message: vectorError.message,
        repository: repoInfo,
        processedFiles,
        processedChunks: embeddedChunks.length
      });
    }
    
    // Step 9: Success response
    console.log('🎉 Repository processing completed successfully!');
    
    const successResponse = {
      success: true,
      message: 'Repository processed successfully',
      repository: repoInfo,
      stats: {
        totalFiles: files.length,
        processedFiles,
        totalChunks: chunks.length,
        processedChunks: embeddedChunks.length,
        successRate: Math.round((embeddedChunks.length / chunks.length) * 100)
      },
      nextSteps: [
        'You can now chat with the repository',
        'Explore the file structure',
        'View generated documentation',
        'Analyze code health and dependencies'
      ]
    };
    
    return res.status(200).json(successResponse);
    
  } catch (error) {
    console.error('Repository processing failed:', error);
    
    // Determine error type and provide appropriate response
    let errorResponse = {
      error: 'Repository processing failed',
      message: error.message
    };
    
    // Add specific error handling for different types of errors
    if (error.message.includes('Not a valid GitHub URL')) {
      errorResponse.error = 'Invalid GitHub URL';
      errorResponse.suggestion = 'Please provide a valid GitHub repository URL (e.g., https://github.com/owner/repo)';
      return res.status(400).json(errorResponse);
    }
    
    if (error.message.includes('Failed to fetch repository information')) {
      errorResponse.error = 'Repository not accessible';
      errorResponse.suggestion = 'Please ensure the repository exists, is public, and you have the correct URL';
      return res.status(404).json(errorResponse);
    }
    
    if (error.message.includes('HUGGINGFACE_API_KEY')) {
      errorResponse.error = 'API configuration error';
      errorResponse.suggestion = 'Please check your Hugging Face API key configuration';
      return res.status(500).json(errorResponse);
    }
    
    if (error.message.includes('rate limit') || error.message.includes('fetching the blob')) {
      errorResponse.error = 'API rate limit exceeded';
      errorResponse.suggestion = 'Please wait a few minutes and try again. Consider upgrading your Hugging Face plan for higher rate limits.';
      return res.status(429).json(errorResponse);
    }
    
    // Generic server error
    errorResponse.suggestion = 'Please try again. If the problem persists, check the server logs for more details.';
    return res.status(500).json(errorResponse);
  }
}

// Helper function to validate environment variables
function validateEnvironment() {
  const required = ['HUGGINGFACE_API_KEY', 'GITHUB_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

// Export for testing
export { validateEnvironment };