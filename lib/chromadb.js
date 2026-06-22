import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const queryCache = new Map();

function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const norm = Math.sqrt(normA) * Math.sqrt(normB);
  return norm === 0 ? 0 : dot / norm;
}

export async function getCollection(repoId) {
  const { data, error } = await supabase
    .from('vector_store')
    .select('id')
    .eq('repo_id', repoId)
    .limit(1);

  if (error) console.error('Error checking collection:', error);

  return {
    name: `repo_${repoId.replace(/[^a-zA-Z0-9_]/g, '_')}`,
    repoId,
    data: data || [],
    add: async function({ ids, embeddings, documents, metadatas }) {
      const chunks = ids.map((id, i) => ({
        repo_id: repoId,
        chunk_id: id,
        content: documents[i],
        embedding: embeddings[i],
        metadata: metadatas[i] || {}
      }));
      const BATCH_SIZE = 100;
      for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        const batch = chunks.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('vector_store').insert(batch);
        if (error) throw new Error(`Failed to insert batch: ${error.message}`);
      }
      return true;
    },
    query: async function({ queryEmbeddings, nResults }) {
      const results = await querySimilarChunks(repoId, queryEmbeddings[0], nResults);
      return {
        ids: [results.map(r => r.id || 'unknown')],
        documents: [results.map(r => r.content)],
        metadatas: [results.map(r => r.metadata)],
        distances: [results.map(r => r.distance)]
      };
    }
  };
}

export async function addChunksToVectorStoreFast(repoId, chunks) {
  const BATCH_SIZE = 50;
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const supabaseData = batch.map((chunk, index) => ({
      repo_id: repoId,
      chunk_id: `chunk_${i + index}`,
      content: chunk.content,
      embedding: chunk.embedding,
      metadata: chunk.metadata || {}
    }));
    const { error } = await supabase.from('vector_store').insert(supabaseData);
    if (error) throw new Error(`Failed to insert batch: ${error.message}`);
  }
}

export async function querySimilarChunks(repoId, queryEmbedding, topK = 5) {
  const cacheKey = `${repoId}_all_data`;
  let data;

  if (queryCache.has(cacheKey)) {
    data = queryCache.get(cacheKey);
  } else {
    const { data: dbData, error } = await supabase
      .from('vector_store')
      .select('content, metadata, embedding')
      .eq('repo_id', repoId);
      
    if (error) throw new Error(`Failed to query chunks: ${error.message}`);
    data = dbData || [];
    queryCache.set(cacheKey, data);
    setTimeout(() => queryCache.delete(cacheKey), 60000);
  }

  if (!data || data.length === 0) return [];

  const results = data
    .map(item => ({
      content: item.content,
      metadata: item.metadata || {},
      similarity: cosineSimilarity(queryEmbedding, item.embedding)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK)
    .map(item => ({
      content: item.content,
      metadata: item.metadata,
      distance: 1 - item.similarity
    }));

  return results;
}

export async function deleteRepositoryData(repoId) {
  const { error } = await supabase
    .from('vector_store')
    .delete()
    .eq('repo_id', repoId);
  if (error) throw new Error(`Failed to delete repository data: ${error.message}`);
}

export async function getRepositoryStats(repoId) {
  const { data, error } = await supabase
    .from('vector_store')
    .select('id, created_at')
    .eq('repo_id', repoId);
  if (error) throw new Error(`Failed to get stats: ${error.message}`);
  return {
    chunkCount: data ? data.length : 0,
    lastUpdated: data && data.length > 0 ? data[0].created_at : null
  };
}