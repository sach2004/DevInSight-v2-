import { generateEmbedding } from '../../lib/embeddings';
import { querySimilarChunks, getCollection } from '../../lib/chromadb';
import { queryGroq } from '../../lib/groq';
import { getRepositoryInfo } from '../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { question, repoId, enhancedContext } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: 'Question is required' });
  }
  
  if (!repoId) {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  
  try {
    console.log(`Processing chat for repository: ${repoId}, question: "${question}"`);
    
    
    const [owner, repo] = repoId.split('/');
    
  
    try {
      const collection = await getCollection(repoId);
      console.log(`Found collection for ${repoId} with ${collection.data?.length || 0} items`);
      
      if (!collection.data || collection.data.length === 0) {
        return res.status(200).json({
          answer: "I don't have any code data for this repository yet. Try processing the repository again or ask a general question that doesn't require specific code context.",
          chunkCount: 0
        });
      }
    } catch (error) {
      console.error('Error getting collection:', error);
      return res.status(200).json({
        answer: "I couldn't access the repository data. Please try processing the repository again.",
        chunkCount: 0
      });
    }
    
  
    const isCodeGenerationRequest = /write|create|generate|implement|develop|code|fix|improve|add functionality|refactor/i.test(question);
    
   
    console.log('Generating embedding for question...');
    const questionEmbedding = await generateEmbedding(question);
    
    
    const chunksToRetrieve = isCodeGenerationRequest || enhancedContext ? 12 : 5;
    
    
    console.log(`Querying for similar chunks (${chunksToRetrieve} max)...`);
    const similarChunks = await querySimilarChunks(repoId, questionEmbedding, chunksToRetrieve);
    
    console.log(`Found ${similarChunks.length} similar chunks`);
    
    if (similarChunks.length === 0) {
      return res.status(200).json({
        answer: "I couldn't find relevant code in the repository to answer your question. Could you please rephrase or ask about another aspect of the codebase?",
        chunkCount: 0
      });
    }
    
    
    console.log('Getting repository information...');
    const repoInfo = await getRepositoryInfo(owner, repo);
    
   
    console.log('Querying LLM with context...');
    const answer = await queryGroq(question, similarChunks, repoInfo);
    
    console.log('Successfully generated answer');
    return res.status(200).json({
      answer,
      chunkCount: similarChunks.length
    });
  } catch (error) {
    console.error('Error processing chat message:', error);
    
    return res.status(500).json({
      answer: `I encountered an error while processing your question: ${error.message}. Please try again or ask a different question.`,
      error: true,
      chunkCount: 0
    });
  }
}