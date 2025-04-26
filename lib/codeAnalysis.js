/**
 * Advanced code analysis engine for detecting code issues and best practices
 * This engine can be used across multiple languages with language-specific rules
 */

// Rule severity levels
export const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Code quality categories
export const CATEGORY = {
  PERFORMANCE: 'Performance',
  MAINTAINABILITY: 'Maintainability',
  SECURITY: 'Security',
  BEST_PRACTICE: 'Best Practice',
  ERROR_PRONE: 'Error Prone',
  CODE_STYLE: 'Code Style',
  ACCESSIBILITY: 'Accessibility',
  COMPLEXITY: 'Complexity'
};

/**
 * Base rule class for code analysis
 */
class Rule {
  constructor(id, options) {
    this.id = id;
    this.title = options.title || id;
    this.description = options.description || '';
    this.severity = options.severity || SEVERITY.MEDIUM;
    this.category = options.category || CATEGORY.BEST_PRACTICE;
    this.suggestion = options.suggestion || '';
    this.languages = options.languages || ['*'];
    this.filePatterns = options.filePatterns || ['*'];
  }

  /**
   * Check if this rule applies to the given file path
   * @param {string} filePath - Path of the file to check
   * @returns {boolean} - Whether the rule applies
   */
  applies(filePath) {
    if (!filePath) return false;
    
    // Get file extension
    const extension = filePath.split('.').pop().toLowerCase();
    
    // Check language support
    const languageMatches = this.languages.includes('*') || 
                            this.languages.includes(extension) ||
                            this.languages.some(lang => getLanguagesFromExtension(extension).includes(lang));
    
    // Check file patterns
    const filePatternMatches = this.filePatterns.includes('*') ||
                              this.filePatterns.some(pattern => {
                                const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
                                return regex.test(filePath);
                              });
    
    return languageMatches && filePatternMatches;
  }
  
  /**
   * Analyze code for issues (to be implemented by subclasses)
   * @param {string} code - Code to analyze
   * @param {string} filePath - Path of the file
   * @returns {Array<Object>} - List of issues found
   */
  analyze(code, filePath) {
    throw new Error('Method must be implemented by subclass');
  }
  
  /**
   * Format an issue object with consistent properties
   * @param {Object} issue - Basic issue object
   * @param {string} filePath - Path of the file
   * @returns {Object} - Formatted issue object
   */
  formatIssue(issue, filePath) {
    return {
      id: `${this.id}-${Math.random().toString(36).substring(2, 8)}`,
      title: issue.title || this.title,
      description: issue.description || this.description,
      severity: issue.severity || this.severity,
      category: issue.category || this.category,
      location: issue.location || filePath,
      lineNumber: issue.lineNumber,
      suggestion: issue.suggestion || this.suggestion,
      codeSnippet: issue.codeSnippet || '',
      fixable: issue.fixable || false,
      fixCode: issue.fixCode || null,
      rule: this.id
    };
  }
}

/**
 * Pattern-based rule that uses regex to detect issues
 */
export class PatternRule extends Rule {
  constructor(id, options) {
    super(id, options);
    this.pattern = options.pattern;
    if (!this.pattern) {
      throw new Error('Pattern rule must have a pattern property');
    }
  }
  
  analyze(code, filePath) {
    if (!code) return [];
    
    const issues = [];
    const matches = code.match(this.pattern);
    
    if (matches && matches.length > 0) {
      // Extract line numbers for each match
      const lines = code.split('\n');
      const matchIndices = [];
      
      // Find all occurrences of the pattern
      let regex = new RegExp(this.pattern.source, 'g');
      let match;
      while ((match = regex.exec(code)) !== null) {
        matchIndices.push(match.index);
      }
      
      // Find line numbers for each match
      matchIndices.forEach(index => {
        // Count newlines to determine line number
        const textBeforeMatch = code.substring(0, index);
        const lineNumber = textBeforeMatch.split('\n').length;
        
        // Extract code snippet
        const startLine = Math.max(1, lineNumber - 2);
        const endLine = Math.min(lines.length, lineNumber + 2);
        const codeSnippet = lines.slice(startLine - 1, endLine).join('\n');
        
        // Create issue
        issues.push(
          this.formatIssue({
            lineNumber: lineNumber,
            codeSnippet: codeSnippet
          }, filePath)
        );
      });
    }
    
    return issues;
  }
}

/**
 * Static analysis engine that runs rules on code
 */
export class CodeAnalysisEngine {
  constructor() {
    this.rules = [];
  }
  
  /**
   * Add a rule to the engine
   * @param {Rule} rule - Rule to add
   */
  addRule(rule) {
    this.rules.push(rule);
  }
  
  /**
   * Add multiple rules to the engine
   * @param {Array<Rule>} rules - Rules to add
   */
  addRules(rules) {
    this.rules.push(...rules);
  }
  
  /**
   * Analyze code with all applicable rules
   * @param {string} code - Code to analyze
   * @param {string} filePath - Path of the file
   * @returns {Array<Object>} - List of issues found
   */
  analyzeCode(code, filePath) {
    const issues = [];
    
    this.rules
      .filter(rule => rule.applies(filePath))
      .forEach(rule => {
        try {
          const ruleIssues = rule.analyze(code, filePath);
          issues.push(...ruleIssues);
        } catch (error) {
          console.error(`Error running rule ${rule.id}:`, error);
        }
      });
    
    return issues;
  }
  
  /**
   * Calculate code quality metrics
   * @param {string} code - Code to analyze
   * @param {Array<Object>} issues - Issues found in the code
   * @returns {Object} - Code quality metrics
   */
  calculateMetrics(code, issues) {
    // Basic metrics
    const lineCount = code.split('\n').length;
    
    // Severity counts
    const severityCounts = {
      [SEVERITY.LOW]: 0,
      [SEVERITY.MEDIUM]: 0,
      [SEVERITY.HIGH]: 0,
      [SEVERITY.CRITICAL]: 0
    };
    
    // Category counts
    const categoryCounts = {};
    Object.values(CATEGORY).forEach(category => {
      categoryCounts[category] = 0;
    });
    
    // Count issues by severity and category
    issues.forEach(issue => {
      if (severityCounts[issue.severity] !== undefined) {
        severityCounts[issue.severity]++;
      }
      
      if (categoryCounts[issue.category] !== undefined) {
        categoryCounts[issue.category]++;
      }
    });
    
    // Calculate weighted score (lower is better)
    const severityWeights = {
      [SEVERITY.LOW]: 1,
      [SEVERITY.MEDIUM]: 3,
      [SEVERITY.HIGH]: 5,
      [SEVERITY.CRITICAL]: 10
    };
    
    const issueScore = issues.reduce((score, issue) => {
      return score + (severityWeights[issue.severity] || 1);
    }, 0);
    
    // Calculate quality score (0-100, higher is better)
    // Base score of 100, reduced by normalized issue score
    const maxScore = lineCount * 0.5; // Theoretical max if half of lines had critical issues
    const qualityScore = Math.max(0, Math.min(100, 100 - (issueScore / maxScore * 100)));
    
    return {
      lineCount,
      issueCount: issues.length,
      severityCounts,
      categoryCounts,
      issueScore,
      qualityScore: Math.round(qualityScore)
    };
  }
}

/**
 * Get language identifiers from file extension
 * @param {string} extension - File extension
 * @returns {Array<string>} - List of languages
 */
function getLanguagesFromExtension(extension) {
  const languageMap = {
    'js': ['javascript'],
    'jsx': ['javascript', 'react'],
    'ts': ['typescript'],
    'tsx': ['typescript', 'react'],
    'py': ['python'],
    'java': ['java'],
    'go': ['go'],
    'c': ['c'],
    'cpp': ['cpp'],
    'h': ['c', 'cpp'],
    'hpp': ['cpp'],
    'rs': ['rust'],
    'html': ['html'],
    'css': ['css'],
    'scss': ['scss', 'css'],
    'less': ['less', 'css'],
    'json': ['json'],
    'md': ['markdown'],
    'yaml': ['yaml'],
    'yml': ['yaml'],
    'rb': ['ruby'],
    'php': ['php']
  };
  
  return languageMap[extension] || [];
}

/**
 * Utility function to count function parameters
 * @param {string} functionCode - Function code
 * @returns {number} - Number of parameters
 */
export function countFunctionParameters(functionCode) {
  const match = functionCode.match(/function\s+\w+\s*\((.*?)\)/);
  if (!match) return 0;
  
  const paramsString = match[1].trim();
  if (!paramsString) return 0;
  
  return paramsString.split(',').length;
}

/**
 * Utility function to estimate cyclomatic complexity
 * @param {string} code - Code to analyze
 * @returns {number} - Estimated cyclomatic complexity
 */
export function estimateCyclomaticComplexity(code) {
  // Count decision points (simplified)
  const ifCount = (code.match(/if\s*\(/g) || []).length;
  const elseCount = (code.match(/else\s*{/g) || []).length;
  const forCount = (code.match(/for\s*\(/g) || []).length;
  const whileCount = (code.match(/while\s*\(/g) || []).length;
  const doCount = (code.match(/do\s*{/g) || []).length;
  const switchCount = (code.match(/switch\s*\(/g) || []).length;
  const caseCount = (code.match(/case\s+/g) || []).length;
  const catchCount = (code.match(/catch\s*\(/g) || []).length;
  const ternaryCount = (code.match(/\?/g) || []).length;
  const logicalAndCount = (code.match(/&&/g) || []).length;
  const logicalOrCount = (code.match(/\|\|/g) || []).length;
  
  // Base complexity of 1 + all decision points
  return 1 + ifCount + elseCount + forCount + whileCount + doCount + 
         switchCount + caseCount + catchCount + ternaryCount + 
         logicalAndCount + logicalOrCount;
}