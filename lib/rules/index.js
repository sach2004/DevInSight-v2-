

import { CodeAnalysisEngine } from '../codeAnalysis';
import { createReactRules, createTodoAppRules } from './reactRules';
import { createJavaScriptRules } from './javascriptRules';

/**

 * @param {Object} options 
 * @param {boolean} options.includeReactRules 
 * @param {boolean} options.includeJsRules 
 * @param {boolean} options.includeTodoRules 
 * @param {Array<string>} options.excludeRules 
 * @returns {CodeAnalysisEngine} 
 */
export function createCodeAnalysisEngine(options = {}) {
  const {
    includeReactRules = true,
    includeJsRules = true,
    includeTodoRules = true,
    excludeRules = []
  } = options;
  
  const engine = new CodeAnalysisEngine();
  
 
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
  

  const filteredRules = allRules.filter(rule => !excludeRules.includes(rule.id));
  
  
  engine.addRules(filteredRules);
  
  return engine;
}

/**

 * @returns {Array<Object>} 
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
 * @param {Array<string>} filePaths 
 * @returns {Object} 
 */
export function detectCodebaseType(filePaths) {
  const fileExtensions = filePaths.map(path => {
    const parts = path.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  });
  
  const uniqueExtensions = [...new Set(fileExtensions)].filter(Boolean);
  
 
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
 
 * @param {Array<string>} filePaths 
 * @param {Array<string>} extensions 
 * @returns {string} 
 */
function detectPrimaryLanguage(filePaths, extensions) {
 
  const extensionCounts = {};
  
  filePaths.forEach(path => {
    const ext = path.split('.').pop().toLowerCase();
    if (ext) {
      extensionCounts[ext] = (extensionCounts[ext] || 0) + 1;
    }
  });
  
 
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
   
    const sorted = Object.entries(extensionCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0].toUpperCase() : 'Unknown';
  }
}