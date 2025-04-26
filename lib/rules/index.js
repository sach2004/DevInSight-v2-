/**
 * Central registry for all code analysis rules
 * This file exports a function to create a fully configured code analysis engine
 */

import { CodeAnalysisEngine } from '../codeAnalysis';
import { createReactRules, createTodoAppRules } from './reactRules';
import { createJavaScriptRules } from './javascriptRules';

/**
 * Create a fully configured code analysis engine with all available rules
 * @param {Object} options - Options for configuring the engine
 * @param {boolean} options.includeReactRules - Whether to include React-specific rules
 * @param {boolean} options.includeJsRules - Whether to include JavaScript/TypeScript rules
 * @param {boolean} options.includeTodoRules - Whether to include Todo-specific rules
 * @param {Array<string>} options.excludeRules - Rule IDs to exclude
 * @returns {CodeAnalysisEngine} - Configured code analysis engine
 */
export function createCodeAnalysisEngine(options = {}) {
  const {
    includeReactRules = true,
    includeJsRules = true,
    includeTodoRules = true,
    excludeRules = []
  } = options;
  
  const engine = new CodeAnalysisEngine();
  
  // Create all rules based on options
  let allRules = [];
  
  if (includeJsRules) {
    allRules = [...allRules, ...createJavaScriptRules()];
  }
  
  if (includeReactRules) {
    allRules = [...allRules, ...createReactRules()];
  }
  
  if (includeTodoRules) {
    allRules = [...allRules, ...createTodoAppRules()];
  }
  
  // Filter out excluded rules
  const filteredRules = allRules.filter(rule => !excludeRules.includes(rule.id));
  
  // Add rules to engine
  engine.addRules(filteredRules);
  
  return engine;
}

/**
 * Get a list of all available rule IDs
 * @returns {Array<Object>} - List of rule IDs with metadata
 */
export function getAvailableRules() {
  const jsRules = createJavaScriptRules();
  const reactRules = createReactRules();
  const todoRules = createTodoAppRules();
  
  const allRules = [...jsRules, ...reactRules, ...todoRules];
  
  return allRules.map(rule => ({
    id: rule.id,
    title: rule.title,
    category: rule.category,
    severity: rule.severity,
    description: rule.description
  }));
}

/**
 * Detect the type of codebase based on file patterns
 * @param {Array<string>} filePaths - List of file paths in the repository
 * @returns {Object} - Detected characteristics of the codebase
 */
export function detectCodebaseType(filePaths) {
  const fileExtensions = filePaths.map(path => {
    const parts = path.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  });
  
  const uniqueExtensions = [...new Set(fileExtensions)].filter(Boolean);
  
  // Check for common file patterns
  const hasReact = filePaths.some(path => 
    path.endsWith('.jsx') || 
    path.endsWith('.tsx') || 
    path.includes('react') ||
    path.includes('component')
  );
  
  const hasTodo = filePaths.some(path =>
    path.toLowerCase().includes('todo') || 
    path.toLowerCase().includes('task')
  );
  
  const hasTests = filePaths.some(path =>
    path.includes('.test.') || 
    path.includes('.spec.') || 
    path.includes('__tests__')
  );
  
  const primaryLanguage = detectPrimaryLanguage(filePaths, uniqueExtensions);
  
  return {
    hasReact,
    hasTodo,
    hasTests,
    primaryLanguage,
    extensions: uniqueExtensions
  };
}

/**
 * Detect the primary programming language used in the codebase
 * @param {Array<string>} filePaths - List of file paths
 * @param {Array<string>} extensions - Unique file extensions
 * @returns {string} - Primary language
 */
function detectPrimaryLanguage(filePaths, extensions) {
  // Count files by extension
  const extensionCounts = {};
  
  filePaths.forEach(path => {
    const ext = path.split('.').pop().toLowerCase();
    if (ext) {
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    }
  });
  
  // Language detection based on extensions
  if (extensions.includes('jsx') || extensions.includes('tsx')) {
    return 'React';
  } else if (extensions.includes('ts') || extensions.includes('tsx')) {
    return 'TypeScript';
  } else if (extensions.includes('js')) {
    return 'JavaScript';
  } else if (extensions.includes('py')) {
    return 'Python';
  } else if (extensions.includes('java')) {
    return 'Java';
  } else if (extensions.includes('go')) {
    return 'Go';
  } else if (extensions.includes('rb')) {
    return 'Ruby';
  } else if (extensions.includes('php')) {
    return 'PHP';
  } else if (extensions.includes('cs')) {
    return 'C#';
  } else if (extensions.includes('cpp') || extensions.includes('hpp')) {
    return 'C++';
  } else if (extensions.includes('c') || extensions.includes('h')) {
    return 'C';
  } else if (extensions.includes('rs')) {
    return 'Rust';
  } else {
    // Return the most common extension
    const sorted = Object.entries(extensionCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0].toUpperCase() : 'Unknown';
  }
}