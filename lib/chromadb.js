

import { createClient } from '@supabase/supabase-js';


const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**

 * @param {Array<number>} vecA 
 * @param {Array<number>} vecB 
 * @returns {number}
 */
function cosineSimilarity(vecA, vecB) {
  try {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      console.warn('Invalid vectors for similarity calculation');
      return 0;
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
      return 0;
    }
    
    return dotProduct / (normA * normB);
  } catch (error) {
    console.error('Error calculating similarity:', error);
    return 0;
  }
}

/**

 * @param {string} repoId 
 * @returns {Promise<Object>}
 */
export async function getCollection(repoId) {
  try {
    console.log(`Getting collection for ${repoId}`);
    
    
    const { data, error } = await supabase
      .from('vector_store')
      .select('id')
      .eq('repo_id', repoId)
      .limit(1);
    
    if (error) {
      console.error('Error checking collection:', error);
    }
    
  
    return {
      name: `repo_${repoId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
      repoId,
      data: data || [],
      
     
      add: async function({ ids, embeddings, documents, metadatas }) {
        const chunks = [];
        
        for (let i = 0; i < ids.length; i++) {
          chunks.push({
            repo_id: repoId,
            chunk_id: ids[i],
            content: documents[i],
            embedding: embeddings[i],
            metadata: metadatas[i] || {}
          });
        }
        
        const { data, error } = await supabase
          .from('vector_store')
          .insert(chunks);
        
        if (error) {
          throw new Error(`Failed to insert chunks: ${error.message}`);
        }
        
        console.log(`Added ${chunks.length} chunks to Supabase`);
        return true;
      },
      
   
      query: async function({ queryEmbeddings, nResults }) {
        console.log(`Querying Supabase for similar chunks in ${repoId}`);
        
       
        const { data, error } = await supabase
          .from('vector_store')
          .select('*')
          .eq('repo_id', repoId);
        
        if (error) {
          throw new Error(`Failed to query chunks: ${error.message}`);
        }
        
        if (!data || data.length === 0) {
          console.log(`No chunks found for repo ${repoId}`);
          return {
            ids: [[]],
            documents: [[]],
            metadatas: [[]],
            distances: [[]]
          };
        }
        
       
        const results = [];
        const queryVector = queryEmbeddings[0];
        
        for (const item of data) {
          const similarity = cosineSimilarity(queryVector, item.embedding);
          results.push({
            id: item.chunk_id,
            document: item.content,
            metadata: item.metadata,
            distance: 1 - similarity
          });
        }
        
      
        results.sort((a, b) => a.distance - b.distance);
        
       
        const topResults = results.slice(0, nResults);
        
        console.log(`Found ${topResults.length} similar chunks`);
        
        return {
          ids: [topResults.map(r => r.id)],
          documents: [topResults.map(r => r.document)],
          metadatas: [topResults.map(r => r.metadata)],
          distances: [topResults.map(r => r.distance)]
        };
      }
    };
  } catch (error) {
    console.error('Error initializing collection:', error);
    throw new Error(`Failed to initialize collection: ${error.message}`);
  }
}

/**
 * @param {string} repoId 
 * @param {Array<Object>} chunks 
 * @returns {Promise<void>}
 */
export async function addChunksToVectorStore(repoId, chunks) {
  try {
    console.log(`Adding ${chunks.length} chunks to Supabase vector store...`);
    
    
    const BATCH_SIZE = 50;
    let totalAdded = 0;
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      const ids = batch.map((_, index) => `chunk_${i + index}`);
      const embeddings = batch.map(chunk => chunk.embedding);
      const documents = batch.map(chunk => chunk.content);
      const metadataList = batch.map(chunk => chunk.metadata);
      
     
      const supabaseData = batch.map((chunk, index) => ({
        repo_id: repoId,
        chunk_id: ids[index],
        content: chunk.content,
        embedding: chunk.embedding,
        metadata: chunk.metadata || {}
      }));
      
      const { data, error } = await supabase
        .from('vector_store')
        .insert(supabaseData);
      
      if (error) {
        console.error('Error inserting batch:', error);
        throw new Error(`Failed to insert batch: ${error.message}`);
      }
      
      totalAdded += batch.length;
      console.log(`Added batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)} (${totalAdded}/${chunks.length} total)`);
    }
    
    console.log(`✓ Successfully added all ${totalAdded} chunks to Supabase`);
  } catch (error) {
    console.error('Error adding chunks to Supabase:', error);
    throw new Error(`Failed to add chunks to vector store: ${error.message}`);
  }
}

/**
 * @param {string} repoId 
 * @param {Array<number>} queryEmbedding 
 * @param {number} topK 
 * @returns {Promise<Array<Object>>}
 */
export async function querySimilarChunks(repoId, queryEmbedding, topK = 5) {
  try {
    console.log(`Querying Supabase for similar chunks in ${repoId}`);
    
    
    const { data, error } = await supabase
      .from('vector_store')
      .select('*')
      .eq('repo_id', repoId);
    
    if (error) {
      throw new Error(`Failed to query chunks: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
      console.log(`No chunks found for repo ${repoId}`);
      return [];
    }
    
    console.log(`Found ${data.length} chunks, calculating similarities...`);
    
  
    const results = [];
    
    for (const item of data) {
      const similarity = cosineSimilarity(queryEmbedding, item.embedding);
      results.push({
        content: item.content,
        metadata: item.metadata || {},
        distance: 1 - similarity 
      });
    }
    
   
    results.sort((a, b) => a.distance - b.distance);
    
    
    const topResults = results.slice(0, topK);
    
    console.log(`Returning ${topResults.length} most similar chunks`);
    return topResults;
  } catch (error) {
    console.error('Error querying similar chunks:', error);
    return [];
  }
}

/**
 * @param {string} repoId 
 * @returns {Promise<void>}
 */
export async function deleteRepositoryData(repoId) {
  try {
    console.log(`Deleting all data for repository: ${repoId}`);
    
    const { data, error } = await supabase
      .from('vector_store')
      .delete()
      .eq('repo_id', repoId);
    
    if (error) {
      console.error('Error deleting repository data:', error);
      throw new Error(`Failed to delete repository data: ${error.message}`);
    }
    
    console.log(`✓ Successfully deleted all data for repository: ${repoId}`);
  } catch (error) {
    console.error('Error deleting repository data:', error);
    throw new Error(`Failed to delete repository data: ${error.message}`);
  }
}

/**
 * @param {string} repoId 
 * @returns {Promise<Object>}
 */
export async function getRepositoryStats(repoId) {
  try {
    const { data, error } = await supabase
      .from('vector_store')
      .select('id, created_at')
      .eq('repo_id', repoId);
    
    if (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }
    
    return {
      chunkCount: data ? data.length : 0,
      lastUpdated: data && data.length > 0 ? data[0].created_at : null
    };
  } catch (error) {
    console.error('Error getting repository stats:', error);
    return { chunkCount: 0, lastUpdated: null };
  }
}