import { getAllFiles, getFileContent } from '../../lib/github';
import openai from '../../lib/openai';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { repoId } = req.body;
  if (!repoId) return res.status(400).json({ error: 'Repository ID is required' });

  try {
    const [owner, repo] = repoId.split('/');
    const files = await getAllFiles(owner, repo);
    if (files.length === 0) return res.status(200).json({ nodes: [], links: [] });

    const filesToAnalyze = files.slice(0, 30);
    const nodes = [];
    const fileContents = new Map();

    for (const file of filesToAnalyze) {
      const content = await getFileContent(file.downloadUrl);
      if (content) {
        fileContents.set(file.path, content);
        nodes.push({ id: file.path, type: getFileType(file.path), weight: 5 });
      }
    }

    const fileMap = {};
    for (const [path, content] of fileContents.entries()) {
      fileMap[path] = content.substring(0, 1500);
    }

    const systemPrompt = `You are an expert code analyzer. You will receive a JSON object where keys are file paths and values are the first 1500 characters of the file.
Extract internal relative dependencies (imports/requires) for each file. Ignore external npm packages.
Return ONLY a valid JSON object with a "links" array: [{"source": "file1.js", "target": "file2.js"}].
If no dependencies, return {"links": []}.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(fileMap) }
      ],
      temperature: 0,
      response_format: { type: "json_object" }
    });

    let resContent = completion.choices[0].message.content;
    resContent = resContent.replace(/^```json\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(resContent);
    const links = parsed.links || [];

    const validLinks = links.filter(link => {
      const sourceExists = nodes.some(n => n.id === link.source);
      const targetExists = nodes.some(n => n.id === link.target || n.id.endsWith(link.target) || link.target.endsWith(n.id.split('/').pop()));
      return sourceExists && targetExists && link.source !== link.target;
    });

    const finalLinks = validLinks.map(link => {
      let targetId = link.target;
      const exactMatch = nodes.find(n => n.id === link.target);
      if (!exactMatch) {
        const partialMatch = nodes.find(n => n.id.endsWith(link.target) || link.target.endsWith(n.id.split('/').pop()));
        if (partialMatch) targetId = partialMatch.id;
      }
      return { source: link.source, target: targetId };
    });

    return res.status(200).json({ nodes, links: finalLinks });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to analyze dependencies', message: error.message });
  }
}

function getFileType(filePath) {
  if (filePath.startsWith('pages/api/')) return 'api';
  if (filePath.startsWith('pages/')) return 'page';
  if (filePath.startsWith('components/')) return 'component';
  if (filePath.startsWith('lib/')) return 'utility';
  return 'file';
}