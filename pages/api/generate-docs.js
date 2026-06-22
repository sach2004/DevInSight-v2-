import openai from '../../lib/openai';
import { getCollection, querySimilarChunks } from '../../lib/chromadb';
import { generateEmbedding } from '../../lib/embeddings';
import { getRepositoryInfo } from '../../lib/github';
import { getRepositoryId } from '../../lib/utils';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  
  let owner, repo;
  if (req.body.url) {
    try {
      const url = new URL(req.body.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length >= 2) { owner = pathParts[0]; repo = pathParts[1]; }
    } catch (error) { return res.status(400).json({ error: 'Invalid GitHub URL' }); }
  } else if (req.body.owner && req.body.repo) {
    owner = req.body.owner; repo = req.body.repo;
  } else if (req.body.repository) {
    owner = req.body.repository.owner?.name || req.body.repository.owner; repo = req.body.repository.name;
  } else {
    return res.status(400).json({ error: 'Owner and repo parameters are required' });
  }

  if (!owner || !repo) return res.status(400).json({ error: 'Owner and repo parameters are required' });

  try {
    const repoId = getRepositoryId(owner, repo);
    const repoInfo = await getRepositoryInfo(owner, repo);

    let collectionExists = false;
    try {
      const col = await getCollection(repoId);
      if (col.data && col.data.length > 0) collectionExists = true;
    } catch (error) {}

    let documentation;
    if (collectionExists) {
      try {
        const query = await generateEmbedding("project overview structure architecture api setup installation");
        const chunks = await querySimilarChunks(repoId, query, 15);
        
        let context = '';
        chunks.forEach((chunk) => {
          context += `\n--- FILE: ${chunk.metadata?.path || 'Unknown'} ---\n${chunk.content}\n`;
        });

        if (context.length > 15000) context = context.substring(0, 15000);

        let dependencies = [];
        let framework = '';
        try {
          const pkgUrl = `https://raw.githubusercontent.com/${owner}/${repo}/main/package.json`;
          const pkgRes = await fetch(pkgUrl);
          if (pkgRes.ok) {
            const pkg = await pkgRes.json();
            const allDeps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
            dependencies = Object.keys(allDeps).slice(0, 10);
            if (allDeps.react) framework = 'React';
            else if (allDeps.next) framework = 'Next.js';
            else if (allDeps.vue) framework = 'Vue.js';
            else if (allDeps.express) framework = 'Express.js';
          }
        } catch (error) {}

        const systemPrompt = `You are an expert technical writer. Generate comprehensive documentation for the '${repoInfo.name}' repository.
Return ONLY a valid JSON object with these exact keys:
{
  "overview": "Markdown string",
  "structure": "Markdown string",
  "architecture": "Markdown string",
  "api": "Markdown string",
  "setup": "Markdown string"
}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: context }
          ],
          temperature: 0.2,
          response_format: { type: "json_object" }
        });

        let content = completion.choices[0].message.content;
        content = content.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
        const parsed = JSON.parse(content);

        documentation = {
          title: `${repoInfo.name} Documentation`,
          overview: parsed.overview || '# Overview\nNo data.',
          meta: {
            language: repoInfo.language || 'Unknown',
            framework: framework || 'Not detected',
            dependencies: dependencies
          },
          sections: {
            structure: { title: "Project Structure", content: parsed.structure || '' },
            architecture: { title: "Architecture & Design", content: parsed.architecture || '' },
            api: { title: "API Documentation", content: parsed.api || '' },
            setup: { title: "Setup & Installation", content: parsed.setup || '' }
          }
        };
      } catch (error) {
        documentation = generateMockDocumentation(repoInfo);
      }
    } else {
      documentation = generateMockDocumentation(repoInfo);
    }

    return res.status(200).json({ repository: { ...repoInfo, documentation } });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to generate documentation', message: error.message });
  }
}

function generateMockDocumentation(repoInfo) {
  return {
    title: `${repoInfo.name} Documentation`,
    overview: `# ${repoInfo.name}\n${repoInfo.description || 'No description.'}`,
    meta: { language: repoInfo.language || 'Unknown', framework: 'Not detected', dependencies: [] },
    sections: {
      structure: { title: "Project Structure", content: "# Structure\nInformation not available." },
      architecture: { title: "Architecture & Design", content: "# Architecture\nInformation not available." },
      api: { title: "API Documentation", content: "# API\nInformation not available." },
      setup: { title: "Setup & Installation", content: "# Setup\nSee README." }
    }
  };
}