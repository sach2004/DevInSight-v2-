import { parseGitHubUrl, getRepositoryInfo, getAllFiles, getFileContent } from '../../lib/github';
import { chunkCodeFile } from '../../lib/chunker';
import { batchProcessEmbeddings } from '../../lib/embeddings';
import { deleteRepositoryData, addChunksToVectorStore, getCollection } from '../../lib/chromadb';
import { getRepositoryId } from '../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { url } = req.body;
  
  if (!url) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }
  
  try {
    console.log(`Processing repository: ${url}`);
    
    
    const { owner, repo } = parseGitHubUrl(url);
    const repoId = getRepositoryId(owner, repo);
    
    console.log(`Repository ID: ${repoId}`);
    
    
    const repoInfo = await getRepositoryInfo(owner, repo);
    
    
    await deleteRepositoryData(repoId);
    
    
    console.log(`Fetching files from ${owner}/${repo}...`);
    const files = await getAllFiles(owner, repo);
    
    console.log(`Found ${files.length} files in the repository`);
    
    if (files.length === 0) {
      return res.status(400).json({ 
        error: 'No supported code files found in the repository' 
      });
    }
    
    
    console.log(`Processing ${files.length} files...`);
    
    
    const MAX_FILES = 40;
    const limitedFiles = files.slice(0, MAX_FILES);
    
    
    const MAX_FILES_PER_BATCH = 20;
    let allChunks = [];
    
   
    for (let i = 0; i < limitedFiles.length; i += MAX_FILES_PER_BATCH) {
      const fileBatch = limitedFiles.slice(i, i + MAX_FILES_PER_BATCH);
      const processedFiles = [];
      
      console.log(`Processing batch ${i/MAX_FILES_PER_BATCH + 1}/${Math.ceil(limitedFiles.length/MAX_FILES_PER_BATCH)}...`);
      
      
      for (const file of fileBatch) {
        try {
          
          const content = await getFileContent(file.downloadUrl);
          
          if (content) {
           
            const chunks = chunkCodeFile(content, file.path);
            processedFiles.push(...chunks);
          }
        } catch (error) {
          console.error(`Error processing file ${file.path}:`, error);
        
        }
      }
      
     
      if (processedFiles.length > 0) {
        const embeddedChunks = await batchProcessEmbeddings(processedFiles);
        allChunks.push(...embeddedChunks);
      }
    }
    
    if (allChunks.length === 0) {
      return res.status(400).json({
        error: 'Failed to generate any code chunks from the repository'
      });
    }
    
    
    await addChunksToVectorStore(repoId, allChunks);
    
    
    const collection = await getCollection(repoId);
    console.log(`Verification: Collection has ${collection.data?.length || 0} items`);
    
  
    return res.status(200).json({
      success: true,
      repository: repoInfo,
      processedFiles: limitedFiles.length,
      processedChunks: allChunks.length,
    });
  } catch (error) {
    console.error('Error processing repository:', error);
    
    return res.status(500).json({
      error: 'Failed to process repository',
      message: error.message,
    });
  }
}