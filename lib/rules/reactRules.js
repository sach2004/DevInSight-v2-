
import { PatternRule, SEVERITY, CATEGORY } from '../codeAnalysis';

/**
 * @returns {Array<PatternRule>} 
 */
export function createReactRules() {
  return [
    
    new PatternRule('react-no-index-key', {
      title: "Using array index as React key",
      description: "Using array index as key can lead to performance issues and unexpected behavior when the list items can change. Keys should be stable, predictable, and unique.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use a unique, stable identifier from your data instead of the array index. If your items don't have IDs, consider generating unique IDs for them.",
      pattern: /\.map\(\s*\([^,]+,\s*(?:i|idx|index|key|k)\s*\)[^=]*=>[^<]*<[^>]*\s+key=\s*{\s*(?:i|idx|index|key|k)\s*}/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('react-async-effect', {
      title: "Async function directly in useEffect",
      description: "useEffect callback cannot be async directly as it must return either nothing or a cleanup function, not a Promise.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Define the async function inside useEffect and then call it, e.g., useEffect(() => { const fetchData = async () => {...}; fetchData(); }, []);",
      pattern: /useEffect\s*\(\s*async\s*\(\s*\)\s*=>/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('react-effect-deps', {
      title: "Missing dependency array in useEffect",
      description: "useEffect without a dependency array will run after every render, which might lead to performance issues or infinite loops.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.PERFORMANCE,
      suggestion: "Add a dependency array as the second argument to useEffect. Include all variables from the outer scope that are used inside the effect.",
      pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*{[^}]*}\s*\);/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
  
    new PatternRule('react-no-direct-mutation', {
      title: "Direct state mutation in React",
      description: "Directly mutating state in React can lead to unexpected behavior and bugs because React relies on immutability for efficient updates.",
      severity: SEVERITY.HIGH,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Use setState or the updater function from useState to update state. For arrays and objects, create a new copy before modifying.",
      pattern: /setState\s*\(\s*([^=]*)\s*\1\.(push|pop|shift|unshift|splice|sort|reverse)\s*\(/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
   
    new PatternRule('react-setstate-function', {
      title: "setState depending on current state without function form",
      description: "When the new state depends on the previous state, you should use the function form of setState to ensure you're working with the most current state.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use the function form of setState: setState(prevState => prevState + 1) instead of setState(state + 1)",
      pattern: /set([A-Z][a-zA-Z]*)\s*\(\s*\1\s*[+\-*/]/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
 
    new PatternRule('react-missing-key', {
      title: "Missing key prop for list elements",
      description: "Each element in a list should have a unique 'key' prop to help React identify which items have changed, are added, or are removed.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Add a unique 'key' prop to each element in the list. Use a stable ID from your data if available.",
      pattern: /\.map\s*\(\s*\([^)]*\)\s*=>\s*(<(?!Fragment)[A-Z][a-zA-Z]*|<[a-z][^>]*>)[^{]*(?!key=)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
   
    new PatternRule('react-usestate-function-deps', {
      title: "useState with function initialization but no dependencies",
      description: "When using a function to initialize state, be careful as it will run on every render unless you memoize it with useMemo or move it outside the component.",
      severity: SEVERITY.LOW,
      category: CATEGORY.PERFORMANCE,
      suggestion: "If the initialization is expensive and depends on props, wrap it with useMemo. If it doesn't depend on anything, move it outside the component.",
      pattern: /const\s*\[\s*[^,\]]+\s*,\s*[^,\]]+\s*\]\s*=\s*useState\s*\(\s*\(\s*\)\s*=>\s*{[^}]*}\s*\)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('react-effect-cleanup', {
      title: "Possible memory leak in useEffect",
      description: "Effects that set up subscriptions, timers, or fetch data should clean up to prevent memory leaks.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Return a cleanup function from your effect that cancels subscriptions, clears timers, or aborts fetch requests.",
      pattern: /useEffect\s*\(\s*\(\s*\)\s*=>\s*{\s*(?:setInterval|setTimeout|fetch|new AbortController|addEventListener)\s*\([^}]*}\s*,\s*\[\s*\]\s*\)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
   
    new PatternRule('react-no-find-dom-node', {
      title: "Using deprecated findDOMNode",
      description: "findDOMNode is deprecated in StrictMode and will be removed in a future major version.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use callback refs or createRef instead.",
      pattern: /findDOMNode\s*\(/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('react-props-destructuring', {
      title: "Incorrect props destructuring",
      description: "Incorrect destructuring of props can lead to undefined variables or errors.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Make sure to destructure from the props object correctly. Use object destructuring in the parameter ({prop1, prop2}) or destructure from props inside the component.",
      pattern: /function\s+([A-Z][a-zA-Z]*)\s*\(\s*\{\s*[a-zA-Z0-9_$,\s]*\}\s*\)[^{]*{\s*const\s*\{\s*[a-zA-Z0-9_$,\s]*\}\s*=\s*props/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('react-usestate-naming', {
      title: "useState variable naming mismatch",
      description: "Inconsistent naming convention for useState variables can make the code harder to read and maintain.",
      severity: SEVERITY.LOW,
      category: CATEGORY.CODE_STYLE,
      suggestion: "Follow the convention of const [value, setValue] = useState(initialValue), where the setter is prefixed with 'set' followed by the capitalized state variable name.",
      pattern: /const\s*\[\s*([a-z][a-zA-Z0-9]*)\s*,\s*(?!set[A-Z])([a-z][a-zA-Z0-9]*)\s*\]\s*=\s*useState/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('react-no-spread-props', {
      title: "Props spreading without explicit props",
      description: "Spreading all props ({...props}) can make it hard to know which props a component expects and can lead to prop name collisions.",
      severity: SEVERITY.LOW,
      category: CATEGORY.MAINTAINABILITY,
      suggestion: "Destructure and use only the props you need explicitly, or if you need to forward props, be explicit about which ones are forwarded.",
      pattern: /<[A-Z][a-zA-Z]*\s+[^>]*\{\s*\.\.\.(props|rest)\s*\}/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    })
  ];
}

/**
 
 * @returns {Array<PatternRule>} 
 */
export function createTodoAppRules() {
  return [
  
    new PatternRule('todo-direct-mutation', {
      title: "Directly mutating todos array",
      description: "The todos array is being mutated directly, which can cause React to miss updates and lead to bugs.",
      severity: SEVERITY.HIGH,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Create a new array using map, filter, or spread operator instead of modifying the existing array.",
      pattern: /(todos)\.(push|pop|shift|unshift|splice|sort|reverse|forEach)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
   
    new PatternRule('todo-missing-keys', {
      title: "Missing keys in todo list items",
      description: "Each todo item in the list should have a unique key prop to help React efficiently update the UI.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Add a unique key prop to each todo item, preferably using the todo's id.",
      pattern: /todos\.map\(\s*\([^)]*\)\s*=>\s*(<(?!Fragment)[A-Z][a-zA-Z]*|<[a-z][^>]*>)[^{]*(?!key=)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('todo-index-as-key', {
      title: "Using array index as todo item key",
      description: "Using array index as key for todo items can lead to unexpected behavior when the list changes.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Use a unique identifier from the todo item, such as id, as the key prop.",
      pattern: /todos\.map\(\s*\([^,]+,\s*(?:i|idx|index|key|k)\s*\)[^=]*=>[^<]*<[^>]*\s+key=\s*{\s*(?:i|idx|index|key|k)\s*}/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
   
    new PatternRule('todo-toggle-bug', {
      title: "Incorrect todo toggle implementation",
      description: "The toggle implementation isn't creating a new array, or is incorrectly updating the completed status.",
      severity: SEVERITY.HIGH,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Use map to create a new array where you only toggle the completed status of the specific todo by id.",
      pattern: /setTodos\s*\(\s*todos\.map\s*\(\s*[^=>]*\s*=>\s*{\s*(?!(return\s+{))[^}]*}\s*\)\s*\)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
   
    new PatternRule('todo-form-prevent-default', {
      title: "Todo form missing preventDefault",
      description: "The todo form submission doesn't prevent the default form action, which would cause a page reload.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Call e.preventDefault() at the beginning of your form submission handler.",
      pattern: /onSubmit\s*=\s*{\s*(?:\([^)]*\)|[^=>{]*)(?!\s*{\s*(?:[^}]*e\.preventDefault\(\)|[^}]*preventDefault\(\)))/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('todo-reset-input', {
      title: "Todo input not reset after submission",
      description: "The input field should be reset after adding a new todo.",
      severity: SEVERITY.LOW,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Set the input state to an empty string after adding the todo.",
      pattern: /setTodos\s*\(\s*\[.*\]\s*\)[^;]*(?!setInput\s*\(\s*['"`]\s*['"`]\s*\))/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('todo-delete-bug', {
      title: "Potential bug in todo deletion",
      description: "The todo deletion logic may have issues like not creating a new array or using incorrect id comparison.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Use filter to create a new array excluding the todo with the matching id. Ensure you're comparing the correct id types (string vs number).",
      pattern: /setTodos\s*\(\s*todos\.filter\s*\(\s*[^=>]*\s*=>\s*[^!.]*(?!==)(?![!=]=)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('todo-empty-check', {
      title: "Missing empty todo check",
      description: "New todos should be checked for empty content before being added to the list.",
      severity: SEVERITY.LOW,
      category: CATEGORY.BEST_PRACTICE,
      suggestion: "Add a check to ensure the input isn't empty before adding a new todo.",
      pattern: /onSubmit\s*=\s*{\s*(?:\([^)]*\)|[^=>{]*)\s*=>\s*{(?![^}]*if\s*\([^}]*trim\(\)[^}]*===?\s*['"`]\s*['"`])/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    }),
    
    
    new PatternRule('todo-id-generation', {
      title: "Problematic todo id generation",
      description: "The method used to generate todo ids may not guarantee uniqueness.",
      severity: SEVERITY.MEDIUM,
      category: CATEGORY.ERROR_PRONE,
      suggestion: "Use a more reliable id generation method like UUID or incrementing from the highest current id.",
      pattern: /id:\s*Math\.random\(\)/g,
      languages: ['javascript', 'typescript', 'react'],
      filePatterns: ['*.jsx', '*.tsx', '*.js', '*.ts']
    })
  ];
}