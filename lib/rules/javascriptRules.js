
import { PatternRule, SEVERITY, CATEGORY } from '../codeAnalysis';

/**

 * @returns {Array<PatternRule>} 
 */
export function createJavaScriptRules() {
  return [
   
    new PatternRule('js-no-console', {
      title: "Console statement in code",
      description: "Console statements should be removed from production code as they can cause performance issues and expose sensitive information.",
      severity: SEVERITY.LOW,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Remove console statements or wrap them in a development-only condition.",
      pattern: /console\.(log|warn|error|info|debug)\s*\(/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
   
    new PatternRule('js-unused-vars', {
      title: "Unused variable",
      description: "Unused variables clutter the code and can indicate logic errors or incomplete implementations.",
      severity: SEVERITY.LOW,
      category: CATEGORY.MAINTAINABILITY,
      suggestion: "Remove the unused variable or prefix it with an underscore if it's deliberately unused.",
      pattern: /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[^;]+;(?:(?!\1).)*$/gs,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-one-var', {
      title: "Multiple variable declarations in one statement",
      description: "Multiple variable declarations in one statement can be harder to read and debug.",
      severity: SEVERITY.LOW,
      category: CATEGORY.CODE_STYLE,
      suggestion: "Declare each variable in a separate statement for better readability.",
      pattern: /(?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*[^,;]+,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-eqeqeq', {
      title: "Using == instead of ===",
      description: "The === operator is safer than == as it also checks for type equality and avoids unexpected type coercion.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use === instead of == to avoid type coercion issues.",
      pattern: /[^!=<>!]==(?!=)/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
   
    new PatternRule('js-no-undefined', {
      title: "Using undefined directly",
      description: "Direct comparisons with undefined can be problematic as undefined is not a reserved word and can be overwritten.",
      severity: SEVERITY.LOW,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use typeof x === 'undefined' or compare with void 0 instead.",
      pattern: /([^.'"]\s*===?\s*undefined|undefined\s*===?\s*[^.'"])/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-empty-catch', {
      title: "Empty catch block",
      description: "Empty catch blocks swallow errors without any handling, which can hide serious problems.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "At minimum, log the error. Better yet, handle it appropriately for your application.",
      pattern: /catch\s*\([^)]*\)\s*{\s*}/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-useless-constructor', {
      title: "Useless constructor",
      description: "Empty constructors or constructors that just call super() are unnecessary in JavaScript classes.",
      severity: SEVERITY.LOW,
      category: CATEGORY.MAINTAINABILITY,
      suggestion: "Remove the constructor if it's empty or only calls super() without any other logic.",
      pattern: /constructor\s*\([^)]*\)\s*{\s*super\(\);?\s*}/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-memory-leak', {
      title: "Possible memory leak",
      description: "Event listeners, intervals, or timeouts created without being cleaned up can cause memory leaks.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.PERFORMANCE,
      suggestion: "Store references to intervals, timeouts, or event listeners and clean them up when no longer needed.",
      pattern: /(setInterval|setTimeout)\s*\([^,]+,[^)]+\)(?!\s*(?:const|let|var)\s+[a-zA-Z_$][a-zA-Z0-9_$]*\s*=)/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-param-reassign', {
      title: "Reassigning function parameters",
      description: "Reassigning function parameters can lead to unexpected behavior and make code harder to understand.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.MAINTAINABILITY,
      suggestion: "Declare a new variable instead of reassigning the parameter.",
      pattern: /function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]+)\)(?:[^=])*\2\s*=/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
  
    new PatternRule('js-prefer-optional-chaining', {
      title: "Not using optional chaining",
      description: "Optional chaining (?.) can simplify code that accesses nested properties that might be null or undefined.",
      severity: SEVERITY.LOW,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use the optional chaining operator (?.) instead of nested conditionals.",
      pattern: /if\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\s*(?:!==?\s*(?:null|undefined)\s*(?:&&|\)))/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
   
    new PatternRule('js-prefer-nullish-coalescing', {
      title: "Not using nullish coalescing",
      description: "Nullish coalescing (??) can simplify code that provides a default value for null or undefined.",
      severity: SEVERITY.LOW,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use the nullish coalescing operator (??) instead of logical OR for default values, especially when 0 or '' are valid values.",
      pattern: /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*===?\s*(?:null|undefined)\s*\?\s*([^:]+)\s*:\s*\1/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
  
    new PatternRule('js-no-foreach-return', {
      title: "Array forEach with return statement",
      description: "Using return inside a forEach callback doesn't break the loop as it might be expected to. Only the current iteration is affected.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Use a for...of loop, a for loop, or Array methods like find, some, or every if you need to break the loop early.",
      pattern: /\.forEach\s*\(\s*(?:function\s*\([^)]*\)|[^=>(]*)\s*(?:=>)?\s*{[^}]*\breturn\b[^}]*}/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-eval', {
      title: "Use of eval",
      description: "Using eval() is dangerous as it executes arbitrary code with the caller's privileges and is often unnecessary.",
      severity: SEVERITY.CRITICAL,
      category: CATEGORY.SECURITY,
      suggestion: "Avoid using eval(). Consider alternatives like using objects for dynamic property access or using Function constructors if absolutely necessary.",
      pattern: /\beval\s*\(/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-new-func', {
      title: "Use of Function constructor",
      description: "Using the Function constructor is similar to eval and can introduce security risks.",
      severity: SEVERITY.HIGH,
      category: CATEGORY.SECURITY,
      suggestion: "Avoid using the Function constructor. Define functions using function declarations, expressions, or arrow functions.",
      pattern: /new\s+Function\s*\(/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
   
    new PatternRule('js-no-with', {
      title: "Use of with statement",
      description: "The with statement is deprecated and can lead to confusing code and performance issues.",
      severity: SEVERITY.HIGH,
      category: CATEGORY.MAINTAINABILITY,
      suggestion: "Avoid using the with statement. Use destructuring or temporary variables instead.",
      pattern: /\bwith\s*\(/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-promise-executor-return', {
      title: "Promise executor returns a value",
      description: "Returning a value from a Promise executor function doesn't affect the promise's behavior and might indicate confusion about how Promises work.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Remove the return statement from the Promise executor, or ensure it's used correctly inside then/catch callbacks.",
      pattern: /new\s+Promise\s*\(\s*(?:function\s*\([^)]*\)|[^=>(]*)\s*(?:=>)?\s*{[^}]*\breturn\b[^}]*}/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-async-promise-executor', {
      title: "Using async function as Promise executor",
      description: "Using an async function as a Promise executor is problematic because errors thrown in the executor will be lost.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Use a regular function as the Promise executor and move async logic inside it.",
      pattern: /new\s+Promise\s*\(\s*async\s+(?:function|\()/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-nullable-access', {
      title: "Accessing properties on potentially null/undefined object",
      description: "Accessing properties on objects that could be null or undefined can cause runtime errors.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Use optional chaining (?.) or check that the object exists before accessing its properties.",
      pattern: /\b((?:const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=\s*(?:[^;]*?null|undefined)[^;]*;)[^\2]*\2\./g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),
    
    
    new PatternRule('js-no-var', {
      title: "Using var instead of const/let",
      description: "var declarations are function-scoped rather than block-scoped, which can lead to unexpected behavior.",
      severity: SEVERITY.LOW,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use const for variables that are never reassigned, and let for variables that are reassigned.",
      pattern: /\bvar\s+/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    }),

    
    new PatternRule('js-missing-await', {
      title: "Missing await in async function",
      description: "Calling an async function without await will not wait for the Promise to resolve, which may lead to unexpected behavior.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Add the await keyword before the async function call to wait for the Promise to resolve.",
      pattern: /async\s+function[^{]*{[^}]*?\b([a-zA-Z_$][a-zA-Z0-9_$]*\s*\([^)]*\))[^}]*\1[^}]*}/g,
      languages: ['javascript', 'typescript'],
      filePatterns: ['*.js', '*.jsx', '*.ts', '*.tsx']
    })
  ];
}