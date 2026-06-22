import { getCollection, querySimilarChunks } from '../../lib/chromadb';
import { generateEmbedding } from '../../lib/embeddings';
import openai from '../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { repoId } = req.body;
  if (!repoId) {
    return res.status(400).json({ error: 'Repository ID is required' });
  }

  try {
    let collection;
    try {
      collection = await getCollection(repoId);
      if (!collection.data || collection.data.length === 0) {
        return res.status(200).json({ apiRoot: "/api", endpoints: [] });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Failed to access repository data' });
    }

    const apiQuery = await generateEmbedding("API endpoint route handler request response controller");
    const apiChunks = await querySimilarChunks(repoId, apiQuery, 20);

    if (!apiChunks || apiChunks.length === 0) {
      return res.status(200).json({ apiRoot: "/api", endpoints: [] });
    }

    const context = apiChunks.map((chunk) => {
      const path = chunk.metadata?.path || 'Unknown file';
      return `File: ${path}\nCode:\n${chunk.content}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are an expert API Analyzer. Analyze the provided code snippets and extract API endpoints.
You must respond ONLY with a valid JSON object containing an "endpoints" array.
Each endpoint object must follow this exact schema:
{
  "id": "unique_id",
  "path": "/api/path",
  "method": "GET" | "POST" | "PUT" | "DELETE",
  "description": "What this endpoint does",
  "requestParams": [{"name": "param", "type": "string", "required": true, "description": "desc"}],
  "responseFields": [{"name": "field", "type": "string", "description": "desc"}],
  "exampleRequest": {},
  "exampleResponse": {},
  "sourcePath": "file/path.js",
  "relatedFiles": []
}
If no endpoints are found, return { "endpoints": [] }.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: context }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    let content = completion.choices[0].message.content;
    content = content.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(content);
    const endpoints = parsed.endpoints || [];

    return res.status(200).json({
      apiRoot: "/api",
      endpoints,
      success: true
    });

  } catch (error) {
    console.error('Error analyzing API endpoints:', error);
    return res.status(500).json({ error: 'Failed to analyze API endpoints', message: error.message });
  }
}