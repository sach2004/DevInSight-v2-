import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set in your .env file");
  }
  
  try {
    const truncatedText = text.slice(0, 8000);
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncatedText,
      dimensions: 384
    });
    
    if (response.data && response.data.length > 0) {
      return response.data[0].embedding;
    }
    
    throw new Error("Invalid response format from OpenAI");
  } catch (error) {
    console.error("Embedding generation failed:", error.message);
    throw error;
  }
}

export async function batchProcessEmbeddingsFast(chunks) {
  if (!chunks || chunks.length === 0) return [];
  
  const embeddedChunks = [];
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (chunk, index) => {
      const combinedContent = `${chunk.metadata?.path || "unknown"}: ${chunk.metadata?.name || "section"}\n${chunk.content}`;
      const embedding = await generateEmbedding(combinedContent);
      return { ...chunk, embedding, index: i + index };
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        embeddedChunks.push(result.value);
      } else {
        console.error("Chunk embedding failed:", result.reason?.message);
      }
    });

    if (i < chunks.length - BATCH_SIZE) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  
  if (embeddedChunks.length === 0) throw new Error("Failed to process any chunks. Check your OPENAI_API_KEY.");
  return embeddedChunks;
}

export async function testHuggingFaceConnection() {
  try {
    const testEmbedding = await generateEmbedding("test");
    return Array.isArray(testEmbedding) && testEmbedding.length > 0;
  } catch (error) {
    console.error("Connection test failed:", error.message);
    return false;
  }
}