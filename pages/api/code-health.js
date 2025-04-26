import { getAllFiles, getFileContent } from '../../lib/github';
import { querySimilarChunks, getCollection } from '../../lib/chromadb';
import { generateEmbedding } from '../../lib/embeddings';
import { createCodeAnalysisEngine, detectCodebaseType } from '../../lib/rules';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { repoId } = req.body;
  
  if (!repoId) {
    return res.status(400).json({ error: 'Repository ID is required' });
  }
  
  try {
    const [owner, repo] = repoId.split('/');
    
    // Check if we have code data for this repository
    let collection;
    try {
      collection = await getCollection(repoId);
      if (!collection.data || collection.data.length === 0) {
        return res.status(200).json({
          summary: {
            score: 0,
            issueCount: 0,
            fileCount: 0
          },
          issues: [],
          categories: [],
          fileScores: [],
          message: "No repository data available for analysis. Please process the repository first."
        });
      }
    } catch (error) {
      console.error('Error accessing vector store:', error);
      return res.status(500).json({
        error: 'Failed to access repository data',
        message: error.message,
      });
    }
    
    // Get all file paths from the collection
    const filePaths = [...new Set(collection.data.map(item => 
      item.metadata && item.metadata.path ? item.metadata.path : ''
    ))].filter(Boolean);
    
    // Detect codebase type to configure the analysis engine appropriately
    const codebaseType = detectCodebaseType(filePaths);
    console.log('Detected codebase type:', codebaseType);
    
    // Initialize the code analysis engine with appropriate rules
    const analysisEngine = createCodeAnalysisEngine({
      includeReactRules: codebaseType.hasReact,
      includeJsRules: ['JavaScript', 'TypeScript', 'React'].includes(codebaseType.primaryLanguage),
      includeTodoRules: codebaseType.hasTodo
    });
    
    // Analyze code quality by retrieving code chunks
    const codeQuery = await generateEmbedding("function class component code quality best practices");
    
    // Get chunks related to code
    const codeChunks = await querySimilarChunks(repoId, codeQuery, 50);
    
    if (!codeChunks || codeChunks.length === 0) {
      return res.status(200).json({
        summary: {
          score: 0,
          issueCount: 0,
          fileCount: 0
        },
        issues: [],
        categories: [],
        fileScores: [],
        message: "Unable to analyze code quality in this repository."
      });
    }
    
    // Group chunks by file
    const fileChunks = {};
    codeChunks.forEach(chunk => {
      if (!chunk.metadata || !chunk.metadata.path) return;
      
      const path = chunk.metadata.path;
      if (!fileChunks[path]) {
        fileChunks[path] = [];
      }
      
      fileChunks[path].push(chunk);
    });
    
    // Store issues found
    const issues = [];
    const fileCounts = {};
    
    // Process each file's chunks
    for (const [path, chunks] of Object.entries(fileChunks)) {
      // Combine chunks for full file analysis
      const fileContent = chunks.map(chunk => chunk.content).join('\n\n');
      fileCounts[path] = { issues: 0 };
      
      // Analyze the file using the code analysis engine
      const fileIssues = analysisEngine.analyzeCode(fileContent, path);
      
      // Process and add issues
      if (fileIssues && fileIssues.length > 0) {
        fileIssues.forEach(issue => {
          // Add additional metadata to the issue
          issues.push({
            id: issue.id,
            title: issue.title,
            description: issue.description,
            severity: issue.severity,
            category: issue.category,
            location: issue.location,
            lineNumber: issue.lineNumber,
            suggestion: issue.suggestion,
            codeSnippet: issue.codeSnippet || extractCodeSnippet(fileContent, issue.lineNumber),
            fixable: issue.fixable || true,
            rule: issue.rule
          });
          
          fileCounts[path].issues++;
        });
      }
      
      // Check for extremely long files (potential code smell)
      if (fileContent.length > 5000) {
        issues.push({
          id: `size-${path.replace(/[^a-z0-9]/gi, '-')}`,
          title: `Large file size in ${path}`,
          description: `This file is very large (${Math.round(fileContent.length / 1000)}KB), which may indicate it has too many responsibilities.`,
          severity: 'medium',
          category: 'Code Organization',
          location: path,
          suggestion: 'Consider breaking this file into smaller, more focused modules with single responsibilities.',
          codeSnippet: fileContent.substring(0, 500) + '...',
          fixable: false
        });
        
        fileCounts[path].issues++;
      }
    }
    
    // Run metrics analysis on the issues found
    const metrics = analysisEngine.calculateMetrics(
      Object.values(fileChunks).flat().map(chunk => chunk.content).join('\n'),
      issues
    );
    
    // Calculate file scores
    const fileScores = Object.entries(fileCounts).map(([file, data]) => {
      // Base score of 100, reduced by issues
      let score = 100;
      
      // Get file-specific issues
      const fileIssues = issues.filter(issue => issue.location === file);
      
      // Reduce score based on severity
      fileIssues.forEach(issue => {
        if (issue.severity === 'critical') score -= 15;
        else if (issue.severity === 'high') score -= 10;
        else if (issue.severity === 'medium') score -= 5;
        else score -= 2;
      });
      
      // Ensure score doesn't go below 0
      score = Math.max(0, score);
      
      return {
        file,
        score: Math.round(score),
        issueCount: fileIssues.length
      };
    });
    
    // Get issue categories and calculate category scores
    const categoryMap = {};
    issues.forEach(issue => {
      if (!categoryMap[issue.category]) {
        categoryMap[issue.category] = [];
      }
      categoryMap[issue.category].push(issue);
    });
    
    const categories = Object.entries(categoryMap).map(([name, categoryIssues]) => {
      // Base score of 100, reduced by issues
      let score = 100;
      
      // Reduce score based on severity
      categoryIssues.forEach(issue => {
        if (issue.severity === 'critical') score -= 12;
        else if (issue.severity === 'high') score -= 8;
        else if (issue.severity === 'medium') score -= 4;
        else score -= 2;
      });
      
      // Ensure score doesn't go below 0 or above 100
      score = Math.max(0, Math.min(100, score));
      
      return {
        name,
        score: Math.round(score),
        issueCount: categoryIssues.length
      };
    });
    
    // Calculate overall score
    const overallScore = Math.round(
      categories.reduce((sum, category) => sum + category.score, 0) / categories.length
    );
    
    // Estimate test coverage based on presence of test files
    let testCoverage = 65; // Default medium coverage
    if (codebaseType.hasTests) {
      testCoverage = 85; // Higher if tests are found
    } else {
      testCoverage = 10; // Very low if no test files found
    }
    
    // Generate complexity metrics
    const complexity = {
      high: fileScores.filter(f => f.score < 70).length,
      medium: fileScores.filter(f => f.score >= 70 && f.score < 85).length,
      low: fileScores.filter(f => f.score >= 85).length
    };
    
    // Sort issues by severity (high to low)
    const sortedIssues = [...issues].sort((a, b) => {
      const severityOrder = { 'critical': 4, 'high': 3, 'medium': 2, 'low': 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
    
    // Generate suggested fixes for some common issues
    sortedIssues.forEach(issue => {
      if (issue.fixable && issue.rule) {
        issue.fixCode = generateFixForIssue(issue, issue.codeSnippet);
      }
    });
    
    // Build response object
    const response = {
      summary: {
        score: overallScore,
        issueCount: issues.length,
        fileCount: Object.keys(fileChunks).length,
        complexity,
        testCoverage,
        codebaseType, // Include detected codebase information
        metrics: metrics // Include calculated metrics
      },
      categories,
      issues: sortedIssues,
      fileScores
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error analyzing code health:', error);
    
    return res.status(500).json({
      error: 'Failed to analyze code health',
      message: error.message,
    });
  }
}

/**
 * Extract a code snippet around a specific line
 * @param {string} code - Full file content
 * @param {number} lineNumber - Line number to center snippet around
 * @param {number} context - Number of lines of context to include (before and after)
 * @returns {string} - Code snippet
 */
function extractCodeSnippet(code, lineNumber, context = 3) {
  if (!code || !lineNumber) return '';
  
  const lines = code.split('\n');
  if (lineNumber <= 0 || lineNumber > lines.length) return '';
  
  const startLine = Math.max(1, lineNumber - context);
  const endLine = Math.min(lines.length, lineNumber + context);
  
  return lines.slice(startLine - 1, endLine).join('\n');
}

/**
 * Generate a fix for a common code issue
 * @param {Object} issue - Issue to generate a fix for
 * @param {string} codeSnippet - Code snippet containing the issue
 * @returns {string|null} - Fixed code or null if no fix can be generated
 */
function generateFixForIssue(issue, codeSnippet) {
  if (!issue || !codeSnippet) return null;
  
  // Try to generate a fix based on the rule ID
  switch (issue.rule) {
    case 'react-no-index-key':
      return fixIndexAsKey(codeSnippet);
    
    case 'react-async-effect':
      return fixAsyncEffect(codeSnippet);
    
    case 'react-effect-deps':
      return fixEffectDependencies(codeSnippet);
    
    case 'react-no-direct-mutation':
      return fixDirectStateMutation(codeSnippet);
    
    case 'react-setstate-function':
      return fixStateUpdateFunction(codeSnippet);
    
    case 'todo-direct-mutation':
      return fixTodoDirectMutation(codeSnippet);
    
    case 'todo-missing-keys':
      return fixTodoMissingKeys(codeSnippet);
    
    case 'todo-index-as-key':
      return fixTodoIndexKey(codeSnippet);
    
    case 'todo-toggle-bug':
      return fixTodoToggleBug(codeSnippet);
    
    case 'js-eqeqeq':
      return codeSnippet.replace(/([^=!<>])==/g, '$1===');
    
    case 'js-no-var':
      return codeSnippet.replace(/\bvar\b/g, 'const');
    
    case 'js-no-console':
      return codeSnippet.replace(/console\.(log|warn|error|info|debug)\s*\(/g, '// console.$1(');
    
    default:
      return null;
  }
}

/**
 * Fix using index as key in React
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixIndexAsKey(code) {
  // Replace index keys with suggested unique id approach
  return code.replace(
    /\.map\(\s*\(([^,]+),\s*(i|idx|index|key|k)\s*\)[^=]*=>\s*([^<]*<[^>]*)\s+key=\s*{\s*(i|idx|index|key|k)\s*}/g,
    (match, item, index, start) => {
      // Suggest using an ID from the item if available
      return `.map((${item}, ${index}) => ${start} key={${item}.id || \`item-\${${item}.name}-\${${index}}\`}`;
    }
  );
}

/**
 * Fix async function directly in useEffect
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixAsyncEffect(code) {
  return code.replace(
    /useEffect\s*\(\s*async\s*\(\s*\)\s*=>/g,
    'useEffect(() => {\n  const fetchData = async () =>'
  ).replace(
    /}\s*,\s*\[([^\]]*)\]\s*\);/g,
    '};\n  fetchData();\n}, [$1]);'
  );
}

/**
 * Fix missing dependency array in useEffect
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixEffectDependencies(code) {
  // Extract variables from the effect body
  const effectBody = code.match(/useEffect\s*\(\s*\(\s*\)\s*=>\s*{([^}]*)}\s*\);/)?.[1] || '';
  
  // Try to find variables that should be dependencies
  const varRegex = /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\b/g;
  const allVars = [...effectBody.matchAll(varRegex)].map(match => match[1]);
  
  // Filter out common keywords and local variables
  const keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'break', 'return', 'function', 
                    'try', 'catch', 'finally', 'const', 'let', 'var', 'new', 'this', 'true', 'false', 'null', 'undefined'];
  
  const potentialDeps = [...new Set(allVars)].filter(v => !keywords.includes(v));
  
  return code.replace(
    /useEffect\s*\(\s*\(\s*\)\s*=>\s*{([^}]*)}\s*\);/g,
    `useEffect(() => {$1}, [${potentialDeps.join(', ')}]);`
  );
}

/**
 * Fix direct state mutation
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixDirectStateMutation(code) {
  return code.replace(
    /setState\s*\(\s*([^=]*)\s*\1\.(push|pop|shift|unshift|splice|sort|reverse)\s*\(([^)]*)\)\s*\)/g,
    (match, state, method, args) => {
      switch (method) {
        case 'push':
          return `setState([...${state}, ${args}])`;
        case 'pop':
          return `setState(${state}.slice(0, -1))`;
        case 'shift':
          return `setState(${state}.slice(1))`;
        case 'unshift':
          return `setState([${args}, ...${state}])`;
        case 'sort':
        case 'reverse':
          return `setState([...${state}].${method}(${args}))`;
        default:
          return `setState([...${state}]) // Fixed mutation`;
      }
    }
  );
}

/**
 * Fix state update function
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixStateUpdateFunction(code) {
  return code.replace(
    /set([A-Z][a-zA-Z]*)\s*\(\s*(\1)\s*([+\-*/])\s*([^)]+)\)/g,
    (match, name, state, op, value) => {
      return `set${name}(prev${name} => prev${name} ${op} ${value})`;
    }
  );
}

/**
 * Fix direct todo mutation
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixTodoDirectMutation(code) {
  if (code.includes('todos.push')) {
    return code.replace(
      /todos\.push\s*\(([^)]+)\)/g,
      'setTodos([...todos, $1])'
    );
  }
  
  if (code.includes('todos.splice')) {
    return code.replace(
      /todos\.splice\s*\(([^)]+)\)/g,
      'setTodos(todos.filter((_, index) => index !== $1))'
    );
  }
  
  if (code.includes('todos.forEach')) {
    return code.replace(
      /todos\.forEach\s*\(\s*\(([^,)]+)[^)]*\)\s*=>\s*{([^}]+)}\s*\)/g,
      'setTodos(todos.map($1 => {$2 return $1; }))'
    );
  }
  
  return code.replace(
    /(todos)\.(push|pop|shift|unshift|splice|sort|reverse|forEach)/g,
    '// Use immutable operations instead of direct mutation\n// setTodos([...todos])'
  );
}

/**
 * Fix missing keys in todo list
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixTodoMissingKeys(code) {
  return code.replace(
    /todos\.map\(\s*\(([^)]+)\)\s*=>\s*(<(?!Fragment)[A-Z][a-zA-Z]*|<[a-z][^>]*>)([^{]*(?!key=))/g,
    `todos.map(($1) => $2 key={$1.id} $3`
  );
}

/**
 * Fix using index as key in todo list
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixTodoIndexKey(code) {
  return code.replace(
    /todos\.map\(\s*\(([^,]+),\s*(i|idx|index|key|k)\s*\)[^=]*=>[^<]*<[^>]*\s+key=\s*{\s*(i|idx|index|key|k)\s*}/g,
    `todos.map(($1, $2) => <div key={$1.id || \`todo-\${$1.text}-\${$2}\`}`
  );
}

/**
 * Fix todo toggle bug
 * @param {string} code - Code snippet
 * @returns {string} - Fixed code
 */
function fixTodoToggleBug(code) {
  if (!code.includes('return')) {
    return code.replace(
      /setTodos\s*\(\s*todos\.map\s*\(\s*([^=>]*)\s*=>\s*{\s*(?!(return\s+{))[^}]*}\s*\)\s*\)/g,
      `setTodos(todos.map($1 => {
        if ($1.id === id) {
          return { ...$1, completed: !$1.completed };
        }
        return $1;
      }))`
    );
  }
  return code;
}