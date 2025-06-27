
// /**

//  * @param {string} text 
//  * @returns {Promise<Array<number>>} 
//  */
// export async function generateEmbedding(text) {
//   if (!process.env.HUGGINGFACE_API_KEY) {
//     throw new Error('HUGGINGFACE_API_KEY is not set');
//   }

//   try {
//     const truncatedText = text.slice(0, 8192);
    
//     console.log('Calling Hugging Face API...');
    
  
//     const response = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify({
//         inputs: truncatedText
//       })
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       console.error('API Error:', response.status, errorText);
      
//       if (response.status === 503) {
      
//         console.log('Model loading, waiting 10 seconds...');
//         await new Promise(resolve => setTimeout(resolve, 10000));
        
       
//         const retryResponse = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5', {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify({
//             inputs: truncatedText
//           })
//         });
        
//         if (!retryResponse.ok) {
//           throw new Error(`Retry failed: ${retryResponse.status}`);
//         }
        
//         const retryResult = await retryResponse.json();
//         console.log(`✓ Generated embedding with ${retryResult.length} dimensions (after retry)`);
//         return retryResult;
//       }
      
//       throw new Error(`API error: ${response.status} - ${errorText}`);
//     }

//     const result = await response.json();
    
//     if (Array.isArray(result) && result.length > 0) {
//       console.log(`✓ Generated embedding with ${result.length} dimensions`);
//       return result;
//     }
    
//     throw new Error('Invalid response format');
    
//   } catch (error) {
//     console.error('Embedding generation failed:', error.message);
//     throw error;
//   }
// }

// /**
//  * @param {Array<Object>} chunks 
//  * @returns {Promise<Array<Object>>} 
//  */
// export async function batchProcessEmbeddings(chunks) {
//   console.log(`Processing ${chunks.length} chunks...`);
  
//   if (!chunks || chunks.length === 0) {
//     return [];
//   }
  
//   const embeddedChunks = [];
  
//   for (let i = 0; i < chunks.length; i++) {
//     const chunk = chunks[i];
    
//     try {
//       const combinedContent = `File: ${chunk.metadata?.path || 'unknown'}\nSection: ${chunk.metadata?.name || 'Unnamed section'}\n\n${chunk.content}`;
      
//       const embedding = await generateEmbedding(combinedContent);
      
//       embeddedChunks.push({
//         ...chunk,
//         embedding
//       });
      
//       console.log(`✓ Processed chunk ${i + 1}/${chunks.length}`);
      
      
//       if (i < chunks.length - 1) {
//         console.log('Waiting 3 seconds...');
//         await new Promise(resolve => setTimeout(resolve, 3000));
//       }
      
//     } catch (error) {
//       console.error(`✗ Failed chunk ${i + 1}:`, error.message);
     
//       continue;
//     }
//   }
  
//   console.log(`✓ Successfully processed ${embeddedChunks.length}/${chunks.length} chunks`);
  
//   if (embeddedChunks.length === 0) {
//     throw new Error('Failed to process any chunks');
//   }
  
//   return embeddedChunks;
// }

// /**
//  * @returns {Promise<boolean>}
//  */
// export async function testHuggingFaceConnection() {
//   try {
//     console.log('Testing Hugging Face connection...');
//     const testEmbedding = await generateEmbedding("This is a test.");
//     return Array.isArray(testEmbedding) && testEmbedding.length > 0;
//   } catch (error) {
//     console.error('Connection test failed:', error.message);
//     return false;
//   }
// }

export async function generateEmbedding(text) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new Error('HUGGINGFACE_API_KEY is not set');
  }

  try {
    const truncatedText = text.slice(0, 4096);
    
    const response = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: truncatedText,
        options: { wait_for_model: true }
      })
    });

    if (!response.ok) {
      if (response.status === 503) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const retryResponse = await fetch('https://api-inference.huggingface.co/models/BAAI/bge-small-en-v1.5', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: truncatedText,
            options: { wait_for_model: true }
          })
        });
        
        if (!retryResponse.ok) {
          throw new Error(`Retry failed: ${retryResponse.status}`);
        }
        
        const retryResult = await retryResponse.json();
        return retryResult;
      }
      
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (Array.isArray(result) && result.length > 0) {
      return result;
    }
    
    throw new Error('Invalid response format');
    
  } catch (error) {
    console.error('Embedding generation failed:', error.message);
    throw error;
  }
}

export async function batchProcessEmbeddingsFast(chunks) {
  if (!chunks || chunks.length === 0) {
    return [];
  }
  
  const BATCH_SIZE = 5;
  const embeddedChunks = [];
  const errors = [];
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (chunk, batchIndex) => {
      const globalIndex = i + batchIndex;
      
      try {
        const combinedContent = `${chunk.metadata?.path || 'unknown'}: ${chunk.metadata?.name || 'section'}\n\n${chunk.content}`;
        
        await new Promise(resolve => setTimeout(resolve, batchIndex * 200));
        
        const embedding = await generateEmbedding(combinedContent);
        
        return {
          ...chunk,
          embedding,
          index: globalIndex
        };
      } catch (error) {
        console.error(`Failed chunk ${globalIndex + 1}:`, error.message);
        errors.push({ index: globalIndex, error: error.message });
        return null;
      }
    });
    
    const batchResults = await Promise.allSettled(promises);
    
    batchResults.forEach((result, batchIndex) => {
      if (result.status === 'fulfilled' && result.value) {
        embeddedChunks.push(result.value);
      }
    });
    
    console.log(`Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)} (${embeddedChunks.length}/${chunks.length})`);
    
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`Successfully processed ${embeddedChunks.length}/${chunks.length} chunks`);
  
  if (embeddedChunks.length === 0) {
    throw new Error('Failed to process any chunks');
  }
  
  return embeddedChunks.sort((a, b) => a.index - b.index);
}

export async function testHuggingFaceConnection() {
  try {
    const testEmbedding = await generateEmbedding("test");
    return Array.isArray(testEmbedding) && testEmbedding.length > 0;
  } catch (error) {
    console.error('Connection test failed:', error.message);
    return false;
  }
}