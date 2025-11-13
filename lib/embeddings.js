import { InferenceClient } from "@huggingface/inference";
const client = new InferenceClient(process.env.HUGGINGFACE_API_KEY);

export async function generateEmbedding(text) {
  if (!process.env.HUGGINGFACE_API_KEY) {
    throw new Error("HUGGINGFACE_API_KEY is not set");
  }

  try {
    const truncatedText = text.slice(0, 4096);

    console.log("Generating embedding...");

    const result = await client.featureExtraction({
      model: "BAAI/bge-small-en-v1.5",
      inputs: truncatedText,
      provider: "hf-inference",
    });

    if (Array.isArray(result) && result.length > 0) {
      return result;
    }

    throw new Error("Invalid response format");
  } catch (error) {
    console.error("Embedding generation failed:", error.message);
    throw error;
  }
}

export async function batchProcessEmbeddingsFast(chunks) {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const embeddedChunks = [];

  console.log(`Processing ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      const combinedContent = `${chunk.metadata?.path || "unknown"}: ${
        chunk.metadata?.name || "section"
      }\n\n${chunk.content}`;

      const embedding = await generateEmbedding(combinedContent);

      embeddedChunks.push({
        ...chunk,
        embedding,
        index: i,
      });

      console.log(`✓ Processed chunk ${i + 1}/${chunks.length}`);

      // Delay to avoid rate limits
      if (i < chunks.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`✗ Failed chunk ${i + 1}:`, error.message);
    }
  }

  console.log(
    `Successfully processed ${embeddedChunks.length}/${chunks.length} chunks`
  );

  if (embeddedChunks.length === 0) {
    throw new Error("Failed to process any chunks");
  }

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
