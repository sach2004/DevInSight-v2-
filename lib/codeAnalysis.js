

export const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};


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
   
   * @param {string} filePath 
   * @returns {boolean} 
   */
  applies(filePath) {
    if (!filePath) return false;
    
 
    const extension = filePath.split('.').pop().toLowerCase();
    
    
    const languageMatches = this.languages.includes('*') || 
                            this.languages.includes(extension) ||
                            this.languages.some(lang => getLanguagesFromExtension(extension).includes(lang));
    

    const filePatternMatches = this.filePatterns.includes('*') ||
                              this.filePatterns.some(pattern => {
                                const regex = new RegExp(pattern.replace(/\*/g, '.*'), 'i');
                                return regex.test(filePath);
                              });
    
    return languageMatches && filePatternMatches;
  }
  
  /**
   
   * @param {string} code 
   * @param {string} filePath 
   * @returns {Array<Object>} 
   */
  analyze(code, filePath) {
    throw new Error('Method must be implemented by subclass');
  }
  
  /**
   * @param {Object} issue 
   * @param {string} filePath 
   * @returns {Object} 
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
      
      const lines = code.split('\n');
      const matchIndices = [];
      
    
      let regex = new RegExp(this.pattern.source, 'g');
      let match;
      while ((match = regex.exec(code)) !== null) {
        matchIndices.push(match.index);
      }
      
    
      matchIndices.forEach(index => {
        
        const textBeforeMatch = code.substring(0, index);
        const lineNumber = textBeforeMatch.split('\n').length;
        
        
        const startLine = Math.max(1, lineNumber - 2);
        const endLine = Math.min(lines.length, lineNumber + 2);
        const codeSnippet = lines.slice(startLine - 1, endLine).join('\n');
        
      
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


export class CodeAnalysisEngine {
  constructor() {
    this.rules = [];
  }
  
  /**
  
   * @param {Rule} rule 
   */
  addRule(rule) {
    this.rules.push(rule);
  }
  
  /**
   * @param {Array<Rule>} rules 
   */
  addRules(rules) {
    this.rules.push(...rules);
  }
  
  /**
   * @param {string} code 
   * @param {string} filePath 
   * @returns {Array<Object>} 
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

   * @param {string} code 
   * @param {Array<Object>} issues 
   * @returns {Object} 
   */
  calculateMetrics(code, issues) {
    
    const lineCount = code.split('\n').length;
    
   
    const severityCounts = {
      [SEVERITY.LOW]: 0,
      [SEVERITY.MEDIUM]: 0,
      [SEVERITY.HIGH]: 0,
      [SEVERITY.CRITICAL]: 0
    };
    
    
    const categoryCounts = {};
    Object.values(CATEGORY).forEach(category => {
      categoryCounts[category] = 0;
    });
    
    
    issues.forEach(issue => {
      if (severityCounts[issue.severity] !== undefined) {
        severityCounts[issue.severity]++;
      }
      
      if (categoryCounts[issue.category] !== undefined) {
        categoryCounts[issue.category]++;
      }
    });
    
    
    const severityWeights = {
      [SEVERITY.LOW]: 1,
      [SEVERITY.MEDIUM]: 3,
      [SEVERITY.HIGH]: 5,
      [SEVERITY.CRITICAL]: 10
    };
    
    const issueScore = issues.reduce((score, issue) => {
      return score + (severityWeights[issue.severity] || 1);
    }, 0);
    
    
    const maxScore = lineCount * 0.5; 
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

 * @param {string} extension 
 * @returns {Array<string>} 
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
 
 * @param {string} functionCode 
 * @returns {number} 
 */
export function countFunctionParameters(functionCode) {
  const match = functionCode.match(/function\s+\w+\s*\((.*?)\)/);
  if (!match) return 0;
  
  const paramsString = match[1].trim();
  if (!paramsString) return 0;
  
  return paramsString.split(',').length;
}

/**
 
 * @param {string} code 
 * @returns {number} 
 */
export function estimateCyclomaticComplexity(code) {
  
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
  
  
  return 1 + ifCount + elseCount + forCount + whileCount + doCount + 
         switchCount + caseCount + catchCount + ternaryCount + 
         logicalAndCount + logicalOrCount;
}