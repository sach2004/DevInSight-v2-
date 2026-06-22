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
        return res.status(200).json({
          summary: { score: 0, issueCount: 0, fileCount: 0 },
          issues: [],
          categories: [],
          fileScores: [],
          message: "No repository data available."
        });
      }
    } catch (error) {
      return res.status(500).json({ error: 'Failed to access repository data', message: error.message });
    }

    const codeQuery = await generateEmbedding("complex logic, error handling, security vulnerabilities, performance bottlenecks, anti-patterns, bugs");
    const codeChunks = await querySimilarChunks(repoId, codeQuery, 15);

    if (!codeChunks || codeChunks.length === 0) {
      return res.status(200).json({
        summary: { score: 100, issueCount: 0, fileCount: 0 },
        issues: [],
        categories: [],
        fileScores: []
      });
    }

    const context = codeChunks.map((chunk) => {
      const path = chunk.metadata?.path || 'Unknown file';
      return `File: ${path}\nCode:\n${chunk.content}`;
    }).join('\n\n---\n\n');

    const systemPrompt = `You are an expert Static Code Analyzer. Analyze the provided code snippets and identify bugs, security vulnerabilities, performance issues, and anti-patterns.
You must respond ONLY with a valid JSON object containing an "issues" array.
Each issue object must follow this exact schema:
{
  "title": "Short title",
  "description": "Detailed explanation",
  "severity": "high" | "medium" | "low",
  "category": "Security" | "Performance" | "Bug" | "Best Practice" | "Maintainability",
  "location": "Exact file path",
  "suggestion": "Actionable advice",
  "codeSnippet": "The exact problematic code",
  "fixCode": "The complete, corrected code snippet"
}
If no issues are found, return { "issues": [] }.`;

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
    const llmIssues = parsed.issues || [];

    const issues = llmIssues.map((issue, index) => ({
      id: `llm-${index}-${Date.now()}`,
      title: issue.title,
      description: issue.description,
      severity: issue.severity || 'medium',
      category: issue.category || 'Best Practice',
      location: issue.location || 'Unknown',
      suggestion: issue.suggestion,
      codeSnippet: issue.codeSnippet || '',
      fixCode: issue.fixCode || null,
      fixable: !!issue.fixCode,
      rule: 'llm-rag-analysis'
    }));

    const fileCounts = {};
    issues.forEach(issue => {
      if (!fileCounts[issue.location]) fileCounts[issue.location] = 0;
      fileCounts[issue.location]++;
    });

    const fileScores = Object.entries(fileCounts).map(([file, count]) => {
      let score = 100 - (count * 10);
      return { file, score: Math.max(0, score), issueCount: count };
    });

    const categoryMap = {};
    issues.forEach(issue => {
      if (!categoryMap[issue.category]) categoryMap[issue.category] = [];
      categoryMap[issue.category].push(issue);
    });

    const categories = Object.entries(categoryMap).map(([name, catIssues]) => {
      let score = 100 - (catIssues.length * 8);
      return { name, score: Math.max(0, score), issueCount: catIssues.length };
    });

    const overallScore = categories.length > 0 
      ? Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length) 
      : 100;

    return res.status(200).json({
      summary: {
        score: overallScore,
        issueCount: issues.length,
        fileCount: Object.keys(fileCounts).length,
        testCoverage: 65
      },
      categories,
      issues,
      fileScores
    });

  } catch (error) {
    console.error('Error analyzing code health:', error);
    return res.status(500).json({ error: 'Failed to analyze code health', message: error.message });
  }
}