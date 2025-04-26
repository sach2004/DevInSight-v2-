import { useState, useEffect } from 'react';
import { AlertTriangle, Check, File, HelpCircle, RefreshCw, Wrench, MessageSquare, Copy } from 'lucide-react';

export default function CodeHealth({ 
  repositoryInfo, 
  onDataLoaded, 
  cachedData, 
  isDataLoaded,
  onChatRequest  // New prop to handle communication with chat interface
}) {
  const [healthData, setHealthData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [fixCode, setFixCode] = useState(null);
  const [isGeneratingFix, setIsGeneratingFix] = useState(false);

  useEffect(() => {
    if (repositoryInfo) {
      // Use cached data if available
      if (isDataLoaded && cachedData) {
        setHealthData(cachedData);
      } else {
        fetchHealthData();
      }
    }
  }, [repositoryInfo, isDataLoaded, cachedData]);

  const fetchHealthData = async () => {
    if (isDataLoaded && healthData) {
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/code-health', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to analyze code health');
      }

      const data = await response.json();
      setHealthData(data);
      
      // Notify parent component that data is loaded
      if (onDataLoaded) {
        onDataLoaded(data);
      }
    } catch (error) {
      console.error('Error analyzing code health:', error);
      setError(error.message);
      
      // Generate sample data for demonstration
      generateSampleData();
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to send a prompt to the chat interface
  const sendToChatbot = (issue) => {
    // Create a detailed prompt for the chatbot
    // Using specific language tag for the code block to ensure proper syntax highlighting
    const language = determineLanguageFromPath(issue.location);
    
    const prompt = `I need help fixing an issue in file "${issue.location}": ${issue.title}. 

Problem: ${issue.description}

Suggested fix: ${issue.suggestion}

Please provide a complete and improved version of this code that fixes the issue.`;

    // Use the onChatRequest callback to send this prompt to the chat tab
    if (onChatRequest) {
      onChatRequest(prompt);
    }
  };

  // Helper function to determine the language from file path
  const determineLanguageFromPath = (path) => {
    if (!path) return 'javascript';
    
    if (path.endsWith('.js')) return 'javascript';
    if (path.endsWith('.jsx')) return 'jsx';
    if (path.endsWith('.ts')) return 'typescript';
    if (path.endsWith('.tsx')) return 'tsx';
    if (path.endsWith('.py')) return 'python';
    if (path.endsWith('.java')) return 'java';
    if (path.endsWith('.html')) return 'html';
    if (path.endsWith('.css')) return 'css';
    if (path.endsWith('.go')) return 'go';
    if (path.endsWith('.php')) return 'php';
    if (path.endsWith('.rb')) return 'ruby';
    if (path.endsWith('.rs')) return 'rust';
    if (path.endsWith('.c') || path.endsWith('.h')) return 'c';
    if (path.endsWith('.cpp') || path.endsWith('.hpp')) return 'cpp';
    if (path.endsWith('.json')) return 'json';
    if (path.endsWith('.md')) return 'markdown';
    
    // Default to javascript for unknown file extensions
    return 'javascript';
  };

  const generateSampleData = () => {
    const sampleData = {
      summary: {
        score: 78,
        issueCount: 12,
        fileCount: 32,
        complexity: {
          high: 3,
          medium: 7,
          low: 22
        },
        testCoverage: 65,
      },
      categories: [
        { name: 'Code Complexity', score: 72, issueCount: 4 },
        { name: 'Duplication', score: 86, issueCount: 2 },
        { name: 'Code Style', score: 91, issueCount: 1 },
        { name: 'Error Handling', score: 68, issueCount: 3 },
        { name: 'Documentation', score: 75, issueCount: 2 }
      ],
      issues: [
        {
          id: 'complex-1',
          title: 'High complexity in ChatInterface.jsx',
          description: 'The handleSubmit function has a cyclomatic complexity of 12, which exceeds the recommended limit of 10.',
          severity: 'medium',
          category: 'Code Complexity',
          location: 'components/ChatInterface.jsx:46',
          suggestion: 'Consider breaking down the handleSubmit function into smaller, more focused functions for better maintainability.',
          fixable: true,
          codeSnippet: "const handleSubmit = async (e) => {\n  e.preventDefault();\n  \n  if (!input.trim() || isLoading) return;\n  \n  const userMessage = {\n    id: Date.now().toString(),\n    role: 'user',\n    content: input.trim(),\n  };\n  \n  setMessages((prev) => [...prev, userMessage]);\n  setInput('');\n  setIsLoading(true);\n  const startTime = Date.now();\n  \n  try {\n    const response = await fetch('/api/chat', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n      },\n      body: JSON.stringify({\n        question: userMessage.content,\n        repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,\n        enhancedContext: true \n      }),\n    });\n    \n    if (!response.ok) {\n      throw new Error('Failed to get response');\n    }\n    \n    const data = await response.json();\n    const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);\n    \n    setProcessingStats({\n      chunkCount: data.chunkCount || 0,\n      processingTime\n    });\n    \n    const assistantMessage = {\n      id: Date.now().toString() + '-response',\n      role: 'assistant',\n      content: data.answer,\n    };\n    \n    setMessages((prev) => [...prev, assistantMessage]);\n  } catch (error) {\n    console.error('Error getting chat response:', error);\n    \n    const errorMessage = {\n      id: Date.now().toString() + '-error',\n      role: 'assistant',\n      content: 'Sorry, I encountered an error while processing your question. Please try again.',\n      error: true,\n    };\n    \n    setMessages((prev) => [...prev, errorMessage]);\n  } finally {\n    setIsLoading(false);\n  }\n};"
        },
        {
          id: 'error-1',
          title: 'Missing error handling in API call',
          description: 'The API request in fetch call doesn\'t properly handle all potential error cases.',
          severity: 'high',
          category: 'Error Handling',
          location: 'pages/api/chat.js:32',
          suggestion: 'Add specific error handling for different error scenarios including network issues and invalid responses.',
          fixable: true,
          codeSnippet: "try {\n  const response = await fetch('/api/chat', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n    },\n    body: JSON.stringify({\n      question: userMessage.content,\n      repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,\n    }),\n  });\n  \n  if (!response.ok) {\n    throw new Error('Failed to get response');\n  }\n  \n  const data = await response.json();\n  \n  return res.status(200).json(data);\n} catch (error) {\n  console.error('Error processing chat message:', error);\n  \n  return res.status(500).json({\n    error: 'Internal server error',\n  });\n}"
        },
        {
          id: 'dup-1',
          title: 'Duplicated markdown processing logic',
          description: 'The markdown processing logic is duplicated across ChatInterface.jsx and Documentation.jsx components.',
          severity: 'medium',
          category: 'Duplication',
          location: 'Multiple files',
          suggestion: 'Extract the markdown processing logic into a shared utility function in lib/utils.js',
          fixable: true,
          codeSnippet: "// In ChatInterface.jsx\nconst processMarkdown = (text) => {\n  text = text.replace(/## (.*?)(\\n|$)/g, '<h2 class=\"text-xl font-bold my-3\">$1</h2>');\n  text = text.replace(/### (.*?)(\\n|$)/g, '<h3 class=\"text-lg font-semibold my-2\">$1</h3>');\n  \n  text = text.replace(/^\\s*[-*]\\s+(.*?)$/gm, '<li class=\"ml-4\">• $1</li>');\n  text = text.replace(/^\\s*(\\d+)\\.\\s+(.*?)$/gm, '<li class=\"ml-4\">$1. $2</li>');\n  \n  text = text.replace(/<li class=\"ml-4\">•([\\s\\S]*?)(?=<h|<li class=\"ml-4\">\\d|$)/g, '<ul class=\"my-2\">$&</ul>');\n  text = text.replace(/<li class=\"ml-4\">(\\d+)([\\s\\S]*?)(?=<h|<li class=\"ml-4\">•|$)/g, '<ol class=\"my-2\">$&</ol>');\n  \n  text = text.replace(/`([^\"]+)`/g, '<code class=\"px-1 py-0.5 bg-gray-100 rounded font-mono text-sm text-red-600\">$1</code>');\n  \n  text = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');\n  text = text.replace(/\\*(.*?)\\*/g, '<em>$1</em>');\n  \n  text = text.replace(/\\[(.*?)\\]\\((.*?)\\)/g, '<a href=\"$2\" class=\"text-blue-600 underline\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>');\n  \n  text = text.replace(/\\n\\n/g, '</p><p class=\"my-2\">');\n  \n  if (!text.startsWith('<h') && !text.startsWith('<ul') && !text.startsWith('<ol') && !text.startsWith('<p')) {\n    text = '<p class=\"my-2\">' + text + '</p>';\n  }\n  \n  return text;\n};\n\n// Similar function in Documentation.jsx\nconst renderMarkdown = (content) => {\n  // Very similar implementation...\n}"
        },
        {
          id: 'doc-1',
          title: 'Missing JSDoc comments',
          description: 'Several exported functions in the lib directory lack proper JSDoc documentation.',
          severity: 'low',
          category: 'Documentation',
          location: 'lib/*.js',
          suggestion: 'Add JSDoc comments to all exported functions, describing parameters, return values, and behavior.',
          fixable: true,
          codeSnippet: "export function isValidGitHubUrl(url) {\n  try {\n    const urlObj = new URL(url);\n    \n    if (urlObj.hostname !== 'github.com') {\n      return false;\n    }\n    \n    const pathSegments = urlObj.pathname.split('/').filter(Boolean);\n    \n    if (pathSegments.length < 2) {\n      return false;\n    }\n    \n    return true;\n  } catch (error) {\n    return false;\n  }\n}"
        },
        {
          id: 'complex-2',
          title: 'Deep nesting in processMessageContent',
          description: 'The processMessageContent function has 4 levels of nesting, making it difficult to follow.',
          severity: 'medium',
          category: 'Code Complexity',
          location: 'components/ChatInterface.jsx:98',
          suggestion: 'Extract nested logic into separate helper functions to reduce nesting depth.',
          fixable: true,
          codeSnippet: "const processMessageContent = (content) => {\n  if (!content) return [{ type: 'text', content: '' }];\n  \n  const parts = [];\n  const codeBlockRegex = /```(\\w+)?\\n([\\s\\S]*?)```/g;\n  \n  let lastIndex = 0;\n  let match;\n  \n  while ((match = codeBlockRegex.exec(content)) !== null) {\n    if (match.index > lastIndex) {\n      parts.push({\n        type: 'text',\n        content: processMarkdown(content.slice(lastIndex, match.index)),\n      });\n    }\n    \n    parts.push({\n      type: 'code',\n      language: match[1] || 'text',\n      content: match[2],\n    });\n    \n    lastIndex = match.index + match[0].length;\n  }\n  \n  if (lastIndex < content.length) {\n    parts.push({\n      type: 'text',\n      content: processMarkdown(content.slice(lastIndex)),\n    });\n  }\n  \n  if (parts.length === 0) {\n    parts.push({\n      type: 'text',\n      content: processMarkdown(content),\n    });\n  }\n  \n  return parts;\n};"
        }
      ],
      fileScores: [
        { file: 'components/ChatInterface.jsx', score: 68, issueCount: 3 },
        { file: 'pages/api/chat.js', score: 72, issueCount: 2 },
        { file: 'lib/github.js', score: 85, issueCount: 1 },
        { file: 'lib/embeddings.js', score: 91, issueCount: 0 },
        { file: 'lib/chromadb.js', score: 79, issueCount: 1 }
      ]
    };
    
    setHealthData(sampleData);
    
    // Notify parent component
    if (onDataLoaded) {
      onDataLoaded(sampleData);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100';
      case 'medium':
        return 'text-amber-600 bg-amber-100';
      case 'low':
        return 'text-blue-600 bg-blue-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBackgroundColor = (score) => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 80) return 'bg-blue-100';
    if (score >= 70) return 'bg-amber-100';
    return 'bg-red-100';
  };

  const renderSeverityBadge = (severity) => {
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(severity)}`}>
        {severity === 'high' && <AlertTriangle size={12} className="mr-1" />}
        {severity === 'medium' && <AlertTriangle size={12} className="mr-1" />}
        {severity === 'low' && <Check size={12} className="mr-1" />}
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </span>
    );
  };

  const handleGenerateFix = async (issue) => {
    setIsGeneratingFix(true);
    setFixCode(null);
    
    try {
      // In a real implementation, we would call an API to generate the fix
      // For demo purposes, we'll use pre-defined fixes
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      
      let fixedCode = '';
      
      switch(issue.id) {
        case 'complex-1':
          fixedCode = "// Break down the handleSubmit function into smaller parts\nconst handleSubmit = async (e) => {\n  e.preventDefault();\n  \n  if (!input.trim() || isLoading) return;\n  \n  const userMessage = createUserMessage(input.trim());\n  \n  setMessages((prev) => [...prev, userMessage]);\n  setInput('');\n  setIsLoading(true);\n  \n  const startTime = Date.now();\n  \n  try {\n    const result = await sendChatRequest(userMessage, repositoryInfo);\n    updateChatWithResult(result, startTime);\n  } catch (error) {\n    handleChatError(error);\n  } finally {\n    setIsLoading(false);\n  }\n};\n\n// Helper functions to make the code more maintainable\nconst createUserMessage = (content) => ({\n  id: Date.now().toString(),\n  role: 'user',\n  content,\n});\n\nconst sendChatRequest = async (userMessage, repositoryInfo) => {\n  const response = await fetch('/api/chat', {\n    method: 'POST',\n    headers: {\n      'Content-Type': 'application/json',\n    },\n    body: JSON.stringify({\n      question: userMessage.content,\n      repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,\n      enhancedContext: true \n    }),\n  });\n  \n  if (!response.ok) {\n    throw new Error('Failed to get response');\n  }\n  \n  return await response.json();\n};\n\nconst updateChatWithResult = (data, startTime) => {\n  const processingTime = ((Date.now() - startTime) / 1000).toFixed(1);\n  \n  setProcessingStats({\n    chunkCount: data.chunkCount || 0,\n    processingTime\n  });\n  \n  const assistantMessage = {\n    id: Date.now().toString() + '-response',\n    role: 'assistant',\n    content: data.answer,\n  };\n  \n  setMessages((prev) => [...prev, assistantMessage]);\n};\n\nconst handleChatError = (error) => {\n  console.error('Error getting chat response:', error);\n  \n  const errorMessage = {\n    id: Date.now().toString() + '-error',\n    role: 'assistant',\n    content: 'Sorry, I encountered an error while processing your question. Please try again.',\n    error: true,\n  };\n  \n  setMessages((prev) => [...prev, errorMessage]);\n};";
          break;
        case 'error-1':
          fixedCode = "try {\n  // Validate input parameters\n  if (!question) {\n    return res.status(400).json({ \n      error: 'Question is required',\n      success: false\n    });\n  }\n  \n  // Handle the API request with better error handling\n  try {\n    const response = await fetch('/api/chat', {\n      method: 'POST',\n      headers: {\n        'Content-Type': 'application/json',\n      },\n      body: JSON.stringify({\n        question: userMessage.content,\n        repoId: `${repositoryInfo.owner.name}/${repositoryInfo.name}`,\n      }),\n    });\n    \n    // Handle different HTTP status codes\n    if (response.status === 404) {\n      return res.status(404).json({\n        error: 'Requested resource not found',\n        success: false\n      });\n    } else if (response.status === 401 || response.status === 403) {\n      return res.status(response.status).json({\n        error: 'Authentication or authorization error',\n        success: false\n      });\n    } else if (!response.ok) {\n      const errorData = await response.json().catch(() => ({}));\n      throw new Error(errorData.message || `Server responded with status: ${response.status}`);\n    }\n    \n    const data = await response.json();\n    return res.status(200).json(data);\n  } catch (error) {\n    // Categorize errors for better error handling\n    if (error.name === 'AbortError') {\n      console.error('Request was aborted:', error);\n      return res.status(408).json({\n        error: 'Request timeout',\n        success: false\n      });\n    } else if (error.name === 'TypeError' && error.message.includes('NetworkError')) {\n      console.error('Network error:', error);\n      return res.status(503).json({\n        error: 'Network error, please check your connection',\n        success: false\n      });\n    }\n    \n    // Default error handling\n    console.error('Error processing chat message:', error);\n    return res.status(500).json({\n      error: 'An unexpected error occurred',\n      message: error.message,\n      success: false\n    });\n  }\n} catch (outerError) {\n  // Catch any errors in the error handling itself\n  console.error('Critical error in error handling:', outerError);\n  return res.status(500).json({\n    error: 'Internal server error',\n    success: false\n  });\n}";
          break;
        case 'dup-1':
          fixedCode = "// In lib/utils.js\n/**\n * Process markdown text into HTML with consistent styling\n * @param {string} text - Markdown text to process\n * @returns {string} - Processed HTML\n */\nexport function processMarkdown(text) {\n  if (!text) return '';\n  \n  // Process headings\n  text = text.replace(/## (.*?)(\\n|$)/g, '<h2 class=\"text-xl font-bold my-3\">$1</h2>');\n  text = text.replace(/### (.*?)(\\n|$)/g, '<h3 class=\"text-lg font-semibold my-2\">$1</h3>');\n  \n  // Process lists\n  text = text.replace(/^\\s*[-*]\\s+(.*?)$/gm, '<li class=\"ml-4\">• $1</li>');\n  text = text.replace(/^\\s*(\\d+)\\.\\s+(.*?)$/gm, '<li class=\"ml-4\">$1. $2</li>');\n  \n  // Wrap lists\n  text = text.replace(/<li class=\"ml-4\">•([\\s\\S]*?)(?=<h|<li class=\"ml-4\">\\d|$)/g, '<ul class=\"my-2\">$&</ul>');\n  text = text.replace(/<li class=\"ml-4\">(\\d+)([\\s\\S]*?)(?=<h|<li class=\"ml-4\">•|$)/g, '<ol class=\"my-2\">$&</ol>');\n  \n  // Process inline code\n  text = text.replace(/`([^\"]+)`/g, '<code class=\"px-1 py-0.5 bg-gray-100 rounded font-mono text-sm text-red-600\">$1</code>');\n  \n  // Process bold and italic\n  text = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');\n  text = text.replace(/\\*(.*?)\\*/g, '<em>$1</em>');\n  \n  // Process links\n  text = text.replace(/\\[(.*?)\\]\\((.*?)\\)/g, '<a href=\"$2\" class=\"text-blue-600 underline\" target=\"_blank\" rel=\"noopener noreferrer\">$1</a>');\n  \n  // Process paragraphs\n  text = text.replace(/\\n\\n/g, '</p><p class=\"my-2\">');\n  \n  // Ensure all text is wrapped in paragraphs\n  if (!text.startsWith('<h') && !text.startsWith('<ul') && !text.startsWith('<ol') && !text.startsWith('<p')) {\n    text = '<p class=\"my-2\">' + text + '</p>';\n  }\n  \n  return text;\n}\n\n// In ChatInterface.jsx\nimport { processMarkdown } from '../lib/utils';\n\n// Then use it directly:\n// processMarkdown(content)\n\n// In Documentation.jsx\nimport { processMarkdown } from '../lib/utils';\n\n// Then replace the renderMarkdown function to use the shared utility:\nconst renderMarkdown = (content) => {\n  if (!content) return null;\n  \n  const parts = [];\n  const codeBlockRegex = /```(\\w+)?\\n([\\s\\S]*?)```/g;\n  \n  let lastIndex = 0;\n  let match;\n  \n  while ((match = codeBlockRegex.exec(content)) !== null) {\n    if (match.index > lastIndex) {\n      parts.push({\n        type: 'text',\n        content: content.slice(lastIndex, match.index),\n      });\n    }\n    \n    parts.push({\n      type: 'code',\n      language: match[1] || 'text',\n      content: match[2],\n    });\n    \n    lastIndex = match.index + match[0].length;\n  }\n  \n  if (lastIndex < content.length) {\n    parts.push({\n      type: 'text',\n      content: content.slice(lastIndex),\n    });\n  }\n  \n  return parts.map((part, index) => {\n    if (part.type === 'text') {\n      return (\n        <div \n          key={index} \n          className=\"prose prose-blue max-w-none\" \n          dangerouslySetInnerHTML={{ __html: processMarkdown(part.content) }} \n        />\n      );\n    } else if (part.type === 'code') {\n      // Keep SyntaxHighlighter implementation\n      // ...\n    }\n    return null;\n  });\n};";
          break;
        case 'doc-1':
          fixedCode = "/**\n * Validates if a URL is a valid GitHub repository URL\n * @param {string} url - The URL to validate\n * @returns {boolean} - True if the URL is a valid GitHub repository URL, false otherwise\n * @example\n * // Returns true for valid URLs\n * isValidGitHubUrl(\"https://github.com/username/repository\")\n * \n * // Returns false for invalid URLs\n * isValidGitHubUrl(\"https://gitlab.com/username/repository\")\n * isValidGitHubUrl(\"https://github.com\") // Missing repository path\n */\nexport function isValidGitHubUrl(url) {\n  try {\n    const urlObj = new URL(url);\n    \n    if (urlObj.hostname !== 'github.com') {\n      return false;\n    }\n    \n    const pathSegments = urlObj.pathname.split('/').filter(Boolean);\n    \n    if (pathSegments.length < 2) {\n      return false;\n    }\n    \n    return true;\n  } catch (error) {\n    return false;\n  }\n}";
          break;
        case 'complex-2':
          fixedCode = "/**\n * Process message content to separate text and code blocks\n * @param {string} content - Message content to process\n * @returns {Array<Object>} - Array of content parts with types\n */\nconst processMessageContent = (content) => {\n  if (!content) return [{ type: 'text', content: '' }];\n  \n  return extractContentParts(content);\n};\n\n/**\n * Extract text and code parts from content\n * @param {string} content - Content to extract parts from\n * @returns {Array<Object>} - Array of content parts\n */\nconst extractContentParts = (content) => {\n  const parts = [];\n  const codeBlockRegex = /```(\\w+)?\\n([\\s\\S]*?)```/g;\n  \n  let lastIndex = 0;\n  let match;\n  \n  while ((match = codeBlockRegex.exec(content)) !== null) {\n    // Add text before code block\n    addTextPart(parts, content, lastIndex, match.index);\n    \n    // Add code block\n    addCodePart(parts, match);\n    \n    lastIndex = match.index + match[0].length;\n  }\n  \n  // Add remaining text after last code block\n  addRemainingText(parts, content, lastIndex);\n  \n  // Handle case with no parts added\n  if (parts.length === 0) {\n    parts.push({\n      type: 'text',\n      content: processMarkdown(content),\n    });\n  }\n  \n  return parts;\n};\n\n/**\n * Add text part to parts array\n * @param {Array<Object>} parts - Array to add part to\n * @param {string} content - Original content\n * @param {number} start - Start index\n * @param {number} end - End index\n */\nconst addTextPart = (parts, content, start, end) => {\n  if (end > start) {\n    parts.push({\n      type: 'text',\n      content: processMarkdown(content.slice(start, end)),\n    });\n  }\n};\n\n/**\n * Add code part to parts array\n * @param {Array<Object>} parts - Array to add part to\n * @param {RegExpExecArray} match - Regex match result\n */\nconst addCodePart = (parts, match) => {\n  parts.push({\n    type: 'code',\n    language: match[1] || 'text',\n    content: match[2],\n  });\n};\n\n/**\n * Add remaining text after the last code block\n * @param {Array<Object>} parts - Array to add part to\n * @param {string} content - Original content\n * @param {number} lastIndex - Start index for remaining text\n */\nconst addRemainingText = (parts, content, lastIndex) => {\n  if (lastIndex < content.length) {\n    parts.push({\n      type: 'text',\n      content: processMarkdown(content.slice(lastIndex)),\n    });\n  }\n};";
          break;
        default:
          fixedCode = '// No fix available for this issue';
      }
      
      setFixCode(fixedCode);
    } catch (error) {
      console.error('Error generating fix:', error);
    } finally {
      setIsGeneratingFix(false);
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Analyzing code health...</p>
        <p className="text-sm text-gray-500 mt-2">This may take a minute or two.</p>
      </div>
    );
  }

  // Render error state
  if (error && !healthData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-red-600">Error Analyzing Code Health</h2>
        <p>{error}</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={fetchHealthData}
        >
          Try Again
        </button>
      </div>
    );
  }

  // Render no data state
  if (!healthData) {
    return (
      <div className="p-6 bg-white rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Code Health Analysis</h2>
        <p className="text-gray-600">No code health data is available.</p>
        <button 
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          onClick={fetchHealthData}
        >
          Analyze Code Health
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFDF8] border-4 border-black rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Code Health Analysis</h2>
        <button
          onClick={fetchHealthData}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <RefreshCw size={14} className="mr-1" />
          Refresh Analysis
        </button>
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex space-x-4">
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'issues'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('issues')}
          >
            Issues ({healthData.issues.length})
          </button>
          <button
            className={`pb-2 px-1 text-sm font-medium ${
              activeTab === 'files'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('files')}
          >
            Files
          </button>
        </div>
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Overall score */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Overall Health Score</h3>
              <div className="flex items-end">
                <span className={`text-3xl font-bold ${getScoreColor(healthData.summary.score)}`}>
                  {healthData.summary.score}
                </span>
                <span className="text-sm text-gray-500 ml-1 mb-1">/100</span>
              </div>
              <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getScoreBackgroundColor(healthData.summary.score)}`}
                  style={{ width: `${healthData.summary.score}%` }}
                ></div>
              </div>
            </div>
            
            {/* Issue breakdown */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Issues Found</h3>
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-red-600">High</span>
                  <span className="text-xs font-medium">{healthData.issues.filter(i => i.severity === 'high').length}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-red-500"
                    style={{ width: `${(healthData.issues.filter(i => i.severity === 'high').length / healthData.issues.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-amber-600">Medium</span>
                  <span className="text-xs font-medium">{healthData.issues.filter(i => i.severity === 'medium').length}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500"
                    style={{ width: `${(healthData.issues.filter(i => i.severity === 'medium').length / healthData.issues.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-blue-600">Low</span>
                  <span className="text-xs font-medium">{healthData.issues.filter(i => i.severity === 'low').length}</span>
                </div>
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500"
                    style={{ width: `${(healthData.issues.filter(i => i.severity === 'low').length / healthData.issues.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Test coverage */}
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Test Coverage</h3>
              <div className="flex items-end">
                <span className={`text-3xl font-bold ${getScoreColor(healthData.summary.testCoverage)}`}>
                  {healthData.summary.testCoverage}%
                </span>
              </div>
              <div className="mt-3 h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getScoreBackgroundColor(healthData.summary.testCoverage)}`}
                  style={{ width: `${healthData.summary.testCoverage}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Category breakdown */}
          <h3 className="text-lg font-medium mb-3">Health Categories</h3>
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-200">
              {healthData.categories.map((category, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">{category.name}</h4>
                    <span className={`font-bold ${getScoreColor(category.score)}`}>{category.score}</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className={getScoreBackgroundColor(category.score)}
                      style={{ width: `${category.score}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    {category.issueCount} {category.issueCount === 1 ? 'issue' : 'issues'} found
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Issues tab */}
      {activeTab === 'issues' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          {selectedIssue ? (
            <div className="p-6">
              <div className="flex justify-between items-start">
                <h3 className="text-lg font-medium">{selectedIssue.title}</h3>
                <button 
                  onClick={() => {
                    setSelectedIssue(null);
                    setFixCode(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  &times;
                </button>
              </div>
              
              <div className="flex space-x-3 mt-2">
                {renderSeverityBadge(selectedIssue.severity)}
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                  {selectedIssue.category}
                </span>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Location</div>
                <div className="font-mono text-sm bg-gray-50 p-2 rounded">{selectedIssue.location}</div>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Description</div>
                <p className="text-gray-800">{selectedIssue.description}</p>
              </div>
              
              <div className="mt-4">
                <div className="text-sm text-gray-500 mb-1">Suggestion</div>
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 text-blue-800">
                  {selectedIssue.suggestion}
                </div>
              </div>
              
              {selectedIssue.codeSnippet && (
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-500 mb-1">Code Snippet</div>
                    <div className="flex space-x-2">
                      {selectedIssue.fixable && !fixCode && (
                        <button
                          onClick={() => handleGenerateFix(selectedIssue)}
                          className="flex items-center text-sm px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
                          disabled={isGeneratingFix}
                        >
                          {isGeneratingFix ? (
                            <>
                              <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-green-800"></div>
                              Generating Fix...
                            </>
                          ) : (
                            <>
                              <Wrench size={14} className="mr-2" />
                              Fix It
                            </>
                          )}
                        </button>
                      )}
                      
                      {/* New button for sending to chatbot */}
                      <button
                        onClick={() => sendToChatbot(selectedIssue)}
                        className="flex items-center text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                      >
                        <MessageSquare size={14} className="mr-2" />
                        Ask Chatbot
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 bg-gray-800 rounded-md overflow-hidden">
                    <pre className="text-xs text-gray-200 p-4 overflow-x-auto">
                      <code>{selectedIssue.codeSnippet}</code>
                    </pre>
                  </div>
                </div>
              )}
              
              {fixCode && (
                <div className="mt-6">
                  <div className="flex justify-between items-center">
                    <div className="text-sm font-medium text-green-600 mb-1">Fixed Code</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(fixCode)
                          .then(() => {
                            alert('Fixed code copied to clipboard!');
                          })
                          .catch(() => {
                            alert('Failed to copy code');
                          });
                      }}
                      className="flex items-center text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                    >
                      <Copy size={12} className="mr-1" />
                      Copy
                    </button>
                  </div>
                  <div className="mt-2 bg-green-50 border border-green-200 rounded-md overflow-hidden">
                    <pre className="text-xs p-4 overflow-x-auto">
                      <code>{fixCode}</code>
                    </pre>
                  </div>
                </div>
              )}
              
              <div className="mt-6 flex justify-end">
                <button 
                  className="px-3 py-1 bg-blue-100 text-blue-800 rounded-md text-sm hover:bg-blue-200 transition-colors"
                  onClick={() => {
                    setSelectedIssue(null);
                    setFixCode(null);
                  }}
                >
                  Back to issues
                </button>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {healthData.issues.map((issue, index) => (
                <div 
                  key={index} 
                  className="px-6 py-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedIssue(issue)}
                >
                  <div className="flex items-start">
                    <div className="mt-0.5">
                      {issue.severity === 'high' && <AlertTriangle size={18} className="text-red-500" />}
                      {issue.severity === 'medium' && <AlertTriangle size={18} className="text-amber-500" />}
                      {issue.severity === 'low' && <HelpCircle size={18} className="text-blue-500" />}
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">{issue.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{issue.location}</div>
                    </div>
                    <div className="ml-4 flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {issue.category}
                      </span>
                      
                      {/* Add chatbot button to list items */}
                      <button 
                        className="text-xs flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 rounded"
                        onClick={(e) => {
                          e.stopPropagation();
                          sendToChatbot(issue);
                        }}
                      >
                        <MessageSquare size={12} className="mr-1" />
                        Ask Chatbot
                      </button>
                      
                      {issue.fixable && (
                        <button 
                          className="text-xs flex items-center px-2 py-0.5 bg-green-100 text-green-800 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedIssue(issue);
                            handleGenerateFix(issue);
                          }}
                        >
                          <Wrench size={12} className="mr-1" />
                          Fix
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Files tab */}
      {activeTab === 'files' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="divide-y divide-gray-200">
            {healthData.fileScores
              .sort((a, b) => a.score - b.score) // Sort by score ascending (worst first)
              .map((file, index) => (
                <div key={index} className="px-6 py-4">
                  <div className="flex items-start">
                    <div className="mt-0.5">
                      <File size={18} className="text-gray-400" />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="font-medium text-gray-900">{file.file}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {file.issueCount} {file.issueCount === 1 ? 'issue' : 'issues'} found
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className={`text-lg font-bold ${getScoreColor(file.score)}`}>
                        {file.score}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 ml-7">
                    <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className={getScoreBackgroundColor(file.score)}
                        style={{ width: `${file.score}%` }}
                      ></div>
                    </div>
                  </div>
                  {file.issueCount > 0 && (
                    <div className="mt-2 ml-7 flex space-x-3">
                      <button
                        onClick={() => {
                          const firstIssue = healthData.issues.find(issue => issue.location.includes(file.file));
                          if (firstIssue) {
                            setActiveTab('issues');
                            setSelectedIssue(firstIssue);
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        View issues
                      </button>
                      
                      {/* Add a chat button for files */}
                      <button
                        onClick={() => {
                          const fileIssues = healthData.issues.filter(issue => 
                            issue.location.includes(file.file)
                          );
                          
                          if (fileIssues.length > 0) {
                            // Create a comprehensive prompt about all issues in this file
                            const language = determineLanguageFromPath(file.file);
                            const issueList = fileIssues.map((issue, idx) => 
                              `Issue ${idx+1}: ${issue.title} - ${issue.description} (${issue.severity} severity)`
                            ).join('\n\n');
                            
                            const prompt = `I need help fixing all the issues in file "${file.file}". There are ${fileIssues.length} problems to fix:

${issueList}

Here's a code snippet from one of the issues:

\`\`\`${language}
${fileIssues[0].codeSnippet}
\`\`\`

Please provide a complete, improved version of this file that fixes all these issues.`;
                            
                            if (onChatRequest) {
                              onChatRequest(prompt);
                            }
                          }
                        }}
                        className="text-xs flex items-center text-blue-600 hover:text-blue-800"
                      >
                        <MessageSquare size={12} className="mr-1" />
                        Fix with chatbot
                      </button>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}