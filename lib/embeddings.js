
/**

 * @param {string} text 
 * @returns {Promise<Array<number>>} 
 */
export async function generateEmbedding(text) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY is not set');
  }

  try {
    const truncatedText = text.slice(0, 8192);
    
    console.log('Calling Hugging Face API...');
    
  
    const response = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: truncatedText
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      
      if (response.status === 503) {
      
        console.log('Model loading, waiting 10 seconds...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
       
        const retryResponse = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: truncatedText
          })
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Retry failed: ${retryResponse.status}`);
        }
        
        const retryResult = await retryResponse.json();
        console.log(`✓ Generated embedding with ${retryResult.length} dimensions (after retry)`);
        return retryResult;
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (Array.isArray(result) && result.length > 0) {
      console.log(`✓ Generated embedding with ${result.length} dimensions`);
      return result;
    }
    
    throw new Error('Invalid response format');
    
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    throw error;
  }
}

/**
 * @param {Array<Object>} chunks 
 * @returns {Promise<Array<Object>>} 
 */
export async function batchProcessEmbeddings(chunks) {
  console.log(`Processing ${chunks.length} chunks...`);
  
  if (!chunks || chunks.length === 0) {
    return [];
  }
  
  const embeddedChunks = [];
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    try {
      const combinedContent = `File: ${chunk.metadata?.path || 'unknown'}\nSection: ${chunk.metadata?.name || 'Unnamed section'}\n\n${chunk.content}`;
      
      const embedding = await generateEmbedding(combinedContent);
      
      embeddedChunks.push({
        ...chunk,
        embedding
      });
      
      console.log(`✓ Processed chunk ${i + 1}/${chunks.length}`);
      
      
      if (i < chunks.length - 1) {
        console.log('Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
    } catch (error) {
      console.error(`✗ Failed chunk ${i + 1}:`, error.message);
     
      continue;
    }
  }
  
  console.log(`✓ Successfully processed ${embeddedChunks.length}/${chunks.length} chunks`);
  
  if (embeddedChunks.length === 0) {
    throw new Error('Failed to process any chunks');
  }
  
  return embeddedChunks;
}

/**
 * @returns {Promise<boolean>}
 */
export async function testHuggingFaceConnection() {
  try {
    console.log('Testing Hugging Face connection...');
    const testEmbedding = await generateEmbedding("This is a test.");
    return Array.isArray(testEmbedding) && testEmbedding.length > 0;
  } catch (error) {
    console.error('Connection test failed:', error.message);
    return false;
  }
}