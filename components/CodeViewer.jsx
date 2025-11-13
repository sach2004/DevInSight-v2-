import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import { getLanguageForSyntaxHighlighting } from '../lib/utils';


export default function CodeViewer({ code, filePath, isExpanded = false }) {
  
  const language = getLanguageForSyntaxHighlighting(filePath);
  
  return (
    <div className="mb-4 rounded-lg overflow-hidden border border-gray-300">
      <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex justify-between items-center">
        <span className="font-mono text-sm truncate">{filePath}</span>
        <span className="text-xs text-gray-500">{language}</span>
      </div>
      
      <div className={isExpanded ? '' : 'max-h-60 overflow-y-auto'}>
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          showLineNumbers={true}
          wrapLines={true}
        >
          {code}
        </SyntaxHighlighter>
      </div>
      
      {!isExpanded && (
        <div className="bg-gray-100 px-4 py-1 text-center border-t border-gray-300">
          <span className="text-xs text-gray-500">Scroll to see more</span>
        </div>
      )}
    </div>
  );
}