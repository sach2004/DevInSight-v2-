import { HfInference } from '@huggingface/inference';


const hf = new HfInference(process.env.HUGGINGFACE_API_KEY);


const EMBEDDING_MODEL = 'sentence-transformers/all-MiniLM-L6-v2';

/**

 * @param {string} text 
 * @returns {Promise<Array<number>>} 
 */
export async function generateEmbedding(text) {
  try {
   
    const truncatedText = text.slice(0, 8192);
    
    
    const result = await hf.featureExtraction({
      model: EMBEDDING_MODEL,
      inputs: truncatedText,
    });
    
    
    return result;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

/**
 
 * @param {Array<Object>} chunks 
 * @returns {Promise<Array<Object>>} 
 */
export async function batchProcessEmbeddings(chunks) {
  console.log(`Processing embeddings for ${chunks.length} chunks...`);
  
  const embeddedChunks = [];
  
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      const combinedContent = `File: ${chunk.metadata.path}\nSection: ${chunk.metadata.name || 'Unnamed section'}\n\n${chunk.content}`;
const embedding = await generateEmbedding(combinedContent);
      
      embeddedChunks.push({
        ...chunk,
        embedding
      });
      
      
      if ((i + 1) % 10 === 0) {
        console.log(`Processed ${i + 1}/${chunks.length} embeddings`);
      }
      
      
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`Error processing chunk ${i}:`, error);
    
    }
  }
  
  return embeddedChunks;
}