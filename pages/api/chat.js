import { generateEmbedding } from '../../lib/embeddings';
import { querySimilarChunks, getCollection } from '../../lib/chromadb';
import openai from '../../lib/openai';
import { getRepositoryInfo } from '../../lib/github';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { question, repoId, enhancedContext } = req.body;
  if (!question) return res.status(400).json({ error: 'Question is required' });
  if (!repoId) return res.status(400).json({ error: 'Repository ID is required' });

  try {
    const [owner, repo] = repoId.split('/');
    let collection;
    try {
      collection = await getCollection(repoId);
      if (!collection.data || collection.data.length === 0) {
        return res.status(200).json({ answer: "I don't have any code data for this repository yet.", chunkCount: 0 });
      }
    } catch (error) {
      return res.status(200).json({ answer: "I couldn't access the repository data.", chunkCount: 0 });
    }

    const isCodeGenerationRequest = /write|create|generate|implement|develop|code|fix|improve|add functionality|refactor/i.test(question);
    const questionEmbedding = await generateEmbedding(question);
    const chunksToRetrieve = isCodeGenerationRequest || enhancedContext ? 12 : 5;
    const similarChunks = await querySimilarChunks(repoId, questionEmbedding, chunksToRetrieve);
    
    if (similarChunks.length === 0) {
      return res.status(200).json({ answer: "I couldn't find relevant code in the repository.", chunkCount: 0 });
    }

    const repoInfo = await getRepositoryInfo(owner, repo);
    
    let context = '';
    similarChunks.forEach((chunk) => {
      const filePath = chunk.metadata?.path || 'Unknown file';
      context += `\n--- FILE: ${filePath} ---\n${chunk.content}\n`;
    });

    if (context.length > 15000) {
      context = context.substring(0, 15000) + "\n... [Context truncated for speed] ...";
    }

    const systemPrompt = `You are a helpful code assistant for the '${repoInfo.name}' repository. Analyze the code and answer the user's question accurately. Use markdown for code blocks.`;
    const userPrompt = `Question: "${question}"\n\nContext:\n${context}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 2048
    });

    return res.status(200).json({
      answer: completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.',
      chunkCount: similarChunks.length
    });
  } catch (error) {
    return res.status(500).json({ answer: `Error: ${error.message}`, error: true, chunkCount: 0 });
  }
}