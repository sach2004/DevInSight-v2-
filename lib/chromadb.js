
global.vectorStore = global.vectorStore || {
  collections: {}
};


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
    
    const collectionName = `repo_${repoId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    
    
    if (global.vectorStore.collections[collectionName]) {
      console.log(`Using existing collection for ${repoId}`);
      return global.vectorStore.collections[collectionName];
    }
    
    
    console.log(`Creating new collection for ${repoId}`);
    global.vectorStore.collections[collectionName] = {
      name: collectionName,
      metadata: {
        repository: repoId,
        created: new Date().toISOString()
      },
      data: [],
      add: async function({ ids, embeddings, documents, metadatas }) {
        for (let i = 0; i < ids.length; i++) {
          this.data.push({
            id: ids[i],
            embedding: embeddings[i],
            document: documents[i],
            metadata: metadatas[i]
          });
        }
        console.log(`Added ${ids.length} items to collection ${this.name}, total: ${this.data.length}`);
        return true;
      },
      query: async function({ queryEmbeddings, nResults }) {
        console.log(`Querying collection ${this.name} with ${this.data.length} items`);
        
        if (this.data.length === 0) {
          console.log(`Collection ${this.name} is empty`);
          return {
            ids: [[]],
            documents: [[]],
            metadatas: [[]],
            distances: [[]]
          };
        }
        
        const results = [];
        
        
        for (const item of this.data) {
          const similarity = cosineSimilarity(queryEmbeddings[0], item.embedding);
          results.push({
            id: item.id,
            document: item.document,
            metadata: item.metadata,
            distance: 1 - similarity 
          });
        }
        
        
        results.sort((a, b) => a.distance - b.distance);
        
        
        const topResults = results.slice(0, nResults);
        
        console.log(`Found ${topResults.length} matches for query`);
        
        return {
          ids: [topResults.map(r => r.id)],
          documents: [topResults.map(r => r.document)],
          metadatas: [topResults.map(r => r.metadata)],
          distances: [topResults.map(r => r.distance)]
        };
      }
    };
    
    return global.vectorStore.collections[collectionName];
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
    const collection = await getCollection(repoId);
    
    console.log(`Adding ${chunks.length} chunks to vector store...`);
    
    
    const BATCH_SIZE = 50;
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      
      const ids = batch.map((_, index) => `chunk_${i + index}`);
      const embeddings = batch.map(chunk => chunk.embedding);
      const documents = batch.map(chunk => chunk.content);
      const metadataList = batch.map(chunk => chunk.metadata);
      
      await collection.add({
        ids,
        embeddings,
        documents,
        metadatas: metadataList,
      });
      
      console.log(`Added batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(chunks.length/BATCH_SIZE)}`);
    }
    
    
    console.log(`Finished adding chunks to vector store. Collection now has ${collection.data.length} items.`);
  } catch (error) {
    console.error('Error adding chunks to vector store:', error);
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
    const collection = await getCollection(repoId);
    
 
    if (!collection.data || collection.data.length === 0) {
      console.log(`Collection for ${repoId} is empty. Cannot perform similarity search.`);
      return [];
    }
    
    console.log(`Performing similarity search on collection with ${collection.data.length} items`);
    
    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK
    });
    
    
    const formattedResults = [];
    
   
    if (results.documents && results.documents[0]) {
      for (let i = 0; i < results.documents[0].length; i++) {
        formattedResults.push({
          content: results.documents[0][i],
          metadata: results.metadatas[0][i] || {},
          distance: results.distances[0][i] || 1.0
        });
      }
    }
    
    console.log(`Returning ${formattedResults.length} similar chunks`);
    return formattedResults;
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
    
    const collectionName = `repo_${repoId.replace(/[^a-zA-Z0-9_]/g, '_')}`;
    
    
    if (global.vectorStore.collections[collectionName]) {
      delete global.vectorStore.collections[collectionName];
      console.log(`Deleted collection for repository: ${repoId}`);
    } else {
      console.log(`No existing collection found for repository: ${repoId}`);
    }
  } catch (error) {
    console.error('Error deleting repository data:', error);
    throw new Error(`Failed to delete repository data: ${error.message}`);
  }
}