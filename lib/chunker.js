
// function estimateTokens(text) {
//   return text.split(/\s+/).length;
// }

// /**
 
//  * @param {string} content 
//  * @param {string} filePath 
//  * @param {number} maxTokens 
//  * @returns {Array} 
//  */
// export function chunkCodeFile(content, filePath, maxTokens = 400) {
//   const extension = filePath.split('.').pop().toLowerCase();
//   const chunks = [];
  
  
//   const fileMetadata = {
//     path: filePath,
//     language: getLanguageFromExtension(extension),
//     extension: extension
//   };
  
  
//   switch(fileMetadata.language) {
//     case 'javascript':
//     case 'typescript':
//       return chunkJSTS(content, fileMetadata, maxTokens);
//     case 'python':
//       return chunkPython(content, fileMetadata, maxTokens);
//     case 'java':
//       return chunkJava(content, fileMetadata, maxTokens);
//     case 'go':
//       return chunkGo(content, fileMetadata, maxTokens);
//     case 'c':
//     case 'cpp':
//       return chunkCCpp(content, fileMetadata, maxTokens);
//     case 'rust':
//       return chunkRust(content, fileMetadata, maxTokens);
//     default:
     
//       return chunkBySize(content, fileMetadata, maxTokens);
//   }
// }

// /**

//  * @param {string} extension 
//  * @returns {string} 
//  */
// function getLanguageFromExtension(extension) {
//   const extensionMap = {
//     'js': 'javascript',
//     'jsx': 'javascript',
//     'ts': 'typescript',
//     'tsx': 'typescript',
//     'py': 'python',
//     'java': 'java',
//     'go': 'go',
//     'c': 'c',
//     'h': 'c',
//     'cpp': 'cpp',
//     'hpp': 'cpp',
//     'rs': 'rust',
//     'html': 'html',
//     'css': 'css'
//   };
  
//   return extensionMap[extension] || 'text';
// }


// function chunkJSTS(content, fileMetadata, maxTokens) {
//   const chunks = [];
//   const lines = content.split('\n');
  
//   let currentChunk = '';
//   let currentChunkName = '';
//   let currentImports = '';
//   let inImportSection = true;
//   let blockDepth = 0;
  
 
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
    
//     if (line.trim().startsWith('import ') || line.trim().startsWith('export ')) {
//       currentImports += line + '\n';
//     } else if (line.trim() !== '') {
//       inImportSection = false;
//     }
    
//     if (!inImportSection) break;
//   }
  
//   inImportSection = false;
  
  
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
    
   
//     if (inImportSection) {
//       if (line.trim().startsWith('import ') || line.trim().startsWith('export ') || line.trim() === '') {
//         continue;
//       }
//       inImportSection = false;
//     }
    
    
//     if (blockDepth === 0 && 
//         (line.match(/function\s+(\w+)\s*\(/) || 
//          line.match(/class\s+(\w+)/) ||
//          line.match(/const\s+(\w+)\s*=\s*(\(\s*\)|function|\{)/) ||
//          line.match(/export\s+(default\s+)?function\s+(\w+)/) ||
//          line.match(/export\s+(default\s+)?class\s+(\w+)/))) {
      
     
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: currentImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
      
  
//       const functionMatch = line.match(/function\s+(\w+)\s*\(/);
//       const classMatch = line.match(/class\s+(\w+)/);
//       const constMatch = line.match(/const\s+(\w+)\s*=/);
//       const exportFunctionMatch = line.match(/export\s+(default\s+)?function\s+(\w+)/);
//       const exportClassMatch = line.match(/export\s+(default\s+)?class\s+(\w+)/);
      
//       if (functionMatch) currentChunkName = functionMatch[1];
//       else if (classMatch) currentChunkName = classMatch[1];
//       else if (constMatch) currentChunkName = constMatch[1];
//       else if (exportFunctionMatch) currentChunkName = exportFunctionMatch[2];
//       else if (exportClassMatch) currentChunkName = exportClassMatch[2];
      
//       currentChunk = line + '\n';
//     } else {
//       currentChunk += line + '\n';
//     }
    
    
//     const openBraces = (line.match(/\{/g) || []).length;
//     const closeBraces = (line.match(/\}/g) || []).length;
//     blockDepth += openBraces - closeBraces;
    
    
//     if (estimateTokens(currentChunk) > maxTokens && blockDepth === 0) {
//       chunks.push({
//         content: currentImports + currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: currentChunkName || 'Unnamed section'
//         }
//       });
//       currentChunk = '';
//     }
//   }
  
  
//   if (currentChunk.trim()) {
//     chunks.push({
//       content: currentImports + currentChunk,
//       metadata: {
//         ...fileMetadata,
//         chunkType: 'code',
//         name: currentChunkName || 'Unnamed section'
//       }
//     });
//   }
  
//   return chunks;
// }


// function chunkPython(content, fileMetadata, maxTokens) {
//   const chunks = [];
//   const lines = content.split('\n');
  
//   let currentChunk = '';
//   let currentChunkName = '';
//   let currentImports = '';
//   let inImportSection = true;
//   let inFunction = false;
//   let inClass = false;
//   let indentLevel = 0;
  
  
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
    
//     if (line.trim().startsWith('import ') || line.trim().startsWith('from ')) {
//       currentImports += line + '\n';
//     } else if (line.trim() !== '' && !line.trim().startsWith('#')) {
//       inImportSection = false;
//       break;
//     }
//   }
  
//   inImportSection = false;
  
  
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
    
    
//     if (inImportSection) {
//       if (line.trim().startsWith('import ') || line.trim().startsWith('from ') || line.trim() === '' || line.trim().startsWith('#')) {
//         continue;
//       }
//       inImportSection = false;
//     }
    
   
//     if (line.trim() !== '' && !line.trim().startsWith(' ') && !line.trim().startsWith('\t')) {
      
//       if (line.trim().startsWith('def ')) {
//         if (currentChunk.trim()) {
//           chunks.push({
//             content: currentImports + currentChunk,
//             metadata: {
//               ...fileMetadata,
//               chunkType: 'code',
//               name: currentChunkName || 'Unnamed section'
//             }
//           });
//         }
        
//         const functionMatch = line.match(/def\s+(\w+)\s*\(/);
//         currentChunkName = functionMatch ? functionMatch[1] : 'Unnamed function';
//         currentChunk = line + '\n';
//         inFunction = true;
//         indentLevel = 1;
//       }
     
//       else if (line.trim().startsWith('class ')) {
//         if (currentChunk.trim()) {
//           chunks.push({
//             content: currentImports + currentChunk,
//             metadata: {
//               ...fileMetadata,
//               chunkType: 'code',
//               name: currentChunkName || 'Unnamed section'
//             }
//           });
//         }
        
//         const classMatch = line.match(/class\s+(\w+)/);
//         currentChunkName = classMatch ? classMatch[1] : 'Unnamed class';
//         currentChunk = line + '\n';
//         inClass = true;
//         indentLevel = 1;
//       }
     
//       else if (inFunction || inClass) {
//         inFunction = false;
//         inClass = false;
//         indentLevel = 0;
        
//         chunks.push({
//           content: currentImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName
//           }
//         });
        
//         currentChunk = line + '\n';
//         currentChunkName = '';
//       }
//       else {
//         currentChunk += line + '\n';
//       }
//     } 
    
//     else if (inFunction || inClass) {
      
//       const lineIndent = line.search(/\S|$/);
      
//       if (lineIndent === 0 && line.trim() !== '') {
       
//         inFunction = false;
//         inClass = false;
//         indentLevel = 0;
        
//         chunks.push({
//           content: currentImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName
//           }
//         });
        
//         currentChunk = line + '\n';
//         currentChunkName = '';
//       } else {
//         currentChunk += line + '\n';
//       }
//     } 
//     else {
//       currentChunk += line + '\n';
//     }
    
    
//     if (estimateTokens(currentChunk) > maxTokens && !inFunction && !inClass) {
//       chunks.push({
//         content: currentImports + currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: currentChunkName || 'Unnamed section'
//         }
//       });
//       currentChunk = '';
//     }
//   }
  
  
//   if (currentChunk.trim()) {
//     chunks.push({
//       content: currentImports + currentChunk,
//       metadata: {
//         ...fileMetadata,
//         chunkType: 'code',
//         name: currentChunkName || 'Unnamed section'
//       }
//     });
//   }
  
//   return chunks;
// }


// function chunkJava(content, fileMetadata, maxTokens) {
//   const chunks = [];
//   const lines = content.split('\n');
  
//   let currentChunk = '';
//   let currentChunkName = '';
//   let blockDepth = 0;
//   let inMethod = false;
//   let inClass = false;
//   let packageAndImports = '';
  
 
//   let i = 0;
//   while (i < lines.length) {
//     const line = lines[i];
//     if (line.trim().startsWith('package ') || line.trim().startsWith('import ')) {
//       packageAndImports += line + '\n';
//       i++;
//     } else if (line.trim() === '') {
//       packageAndImports += line + '\n';
//       i++;
//     } else {
//       break;
//     }
//   }
  
  
//   for (; i < lines.length; i++) {
//     const line = lines[i];
    
   
//     if (blockDepth === 1 && 
//         (line.includes('public ') || line.includes('private ') || line.includes('protected ') || line.includes('void ')) && 
//         line.includes('(') && !line.includes(';')) {
      
//       if (currentChunk.trim() && inMethod) {
//         chunks.push({
//           content: packageAndImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed method'
//           }
//         });
//       }
      
//       const methodMatch = line.match(/\s+(\w+)\s*\(/);
//       currentChunkName = methodMatch ? methodMatch[1] : 'Unnamed method';
//       currentChunk = line + '\n';
//       inMethod = true;
//     } 
    
//     else if (blockDepth === 0 && line.match(/\s*((public|private|protected)\s+)?(class|interface|enum)\s+(\w+)/)) {
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: packageAndImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
      
//       const classMatch = line.match(/\s*(?:(?:public|private|protected)\s+)?(?:class|interface|enum)\s+(\w+)/);
//       currentChunkName = classMatch ? classMatch[1] : 'Unnamed class';
//       currentChunk = line + '\n';
//       inClass = true;
//     } 
//     else {
//       currentChunk += line + '\n';
//     }
    
    
//     const openBraces = (line.match(/\{/g) || []).length;
//     const closeBraces = (line.match(/\}/g) || []).length;
//     blockDepth += openBraces - closeBraces;
    
    
//     if (inMethod && estimateTokens(currentChunk) > maxTokens && blockDepth === 1) {
//       chunks.push({
//         content: packageAndImports + currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: currentChunkName || 'Unnamed method'
//         }
//       });
//       currentChunk = '';
//       inMethod = false;
//     }
    
    
//     if (inMethod && blockDepth === 1 && line.trim() === '}') {
//       chunks.push({
//         content: packageAndImports + currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: currentChunkName || 'Unnamed method'
//         }
//       });
//       currentChunk = '';
//       inMethod = false;
//     }
    
    
//     if (inClass && blockDepth === 0 && line.trim() === '}') {
      
//       if (!inMethod && currentChunk.trim()) {
//         chunks.push({
//           content: packageAndImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed class'
//           }
//         });
//       }
//       currentChunk = '';
//       inClass = false;
//       currentChunkName = '';
//     }
//   }
  

//   if (currentChunk.trim()) {
//     chunks.push({
//       content: packageAndImports + currentChunk,
//       metadata: {
//         ...fileMetadata,
//         chunkType: 'code',
//         name: currentChunkName || 'Unnamed section'
//       }
//     });
//   }
  
//   return chunks;
// }


// function chunkGo(content, fileMetadata, maxTokens) {
//   const chunks = [];
//   const lines = content.split('\n');
  
//   let currentChunk = '';
//   let currentChunkName = '';
//   let blockDepth = 0;
//   let packageAndImports = '';
  
  
//   let i = 0;
//   while (i < lines.length) {
//     const line = lines[i];
//     if (line.trim().startsWith('package ') || line.trim().startsWith('import ')) {
//       packageAndImports += line + '\n';
//       i++;
//     } else if (line.trim() === '' || line.trim().startsWith('//')) {
//       packageAndImports += line + '\n';
//       i++;
//     } else {
//       break;
//     }
//   }
  
  
//   for (; i < lines.length; i++) {
//     const line = lines[i];
    
  
//     if (blockDepth === 0 && line.trim().startsWith('func ')) {
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: packageAndImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
      
      
//       const funcMatch = line.match(/func\s+(?:\([^)]+\)\s+)?(\w+)/);
//       currentChunkName = funcMatch ? funcMatch[1] : 'Unnamed function';
//       currentChunk = line + '\n';
//     } 
    
//     else if (blockDepth === 0 && line.trim().startsWith('type ') && line.includes('struct')) {
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: packageAndImports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
      
//       const structMatch = line.match(/type\s+(\w+)/);
//       currentChunkName = structMatch ? structMatch[1] : 'Unnamed struct';
//       currentChunk = line + '\n';
//     } 
//     else {
//       currentChunk += line + '\n';
//     }
    
   
//     const openBraces = (line.match(/\{/g) || []).length;
//     const closeBraces = (line.match(/\}/g) || []).length;
//     blockDepth += openBraces - closeBraces;
    
    
//     if (blockDepth === 0 && currentChunk.trim() && (line.trim() === '}' || estimateTokens(currentChunk) > maxTokens)) {
//       chunks.push({
//         content: packageAndImports + currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: currentChunkName || 'Unnamed section'
//         }
//       });
//       currentChunk = '';
//       currentChunkName = '';
//     }
//   }
  
  
//   if (currentChunk.trim()) {
//     chunks.push({
//       content: packageAndImports + currentChunk,
//       metadata: {
//         ...fileMetadata,
//         chunkType: 'code',
//         name: currentChunkName || 'Unnamed section'
//       }
//     });
//   }
  
//   return chunks;
// }


// function chunkCCpp(content, fileMetadata, maxTokens) {
//   const chunks = [];
//   const lines = content.split('\n');
  
//   let currentChunk = '';
//   let currentChunkName = '';
//   let blockDepth = 0;
//   let includes = '';
  
  
//   let i = 0;
//   while (i < lines.length) {
//     const line = lines[i];
//     if (line.trim().startsWith('#include') || line.trim().startsWith('#define') || line.trim().startsWith('#pragma')) {
//       includes += line + '\n';
//       i++;
//     } else if (line.trim() === '' || line.trim().startsWith('//')) {
//       includes += line + '\n';
//       i++;
//     } else {
//       break;
//     }
//   }
  

//   for (; i < lines.length; i++) {
//     const line = lines[i];
    
   
//     if (blockDepth === 0 && 
//         line.match(/^\s*\w+(?:[\s*]+\w+)*\s+\w+\s*\(/) && 
//         !line.includes(';')) {
      
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: includes + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
    
//       const funcMatch = line.match(/\s(\w+)\s*\(/);
//       currentChunkName = funcMatch ? funcMatch[1] : 'Unnamed function';
//       currentChunk = line + '\n';
//     } 
  
//     else if (blockDepth === 0 && 
//              (line.match(/^\s*(?:class|struct|enum|union)\s+\w+/) || 
//               line.match(/^\s*typedef\s+(?:struct|enum|union)\s+\w+/))) {
      
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: includes + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
      
//       const typeMatch = line.match(/(?:class|struct|enum|union|typedef)\s+(?:struct|enum|union)?\s*(\w+)/);
//       currentChunkName = typeMatch ? typeMatch[1] : 'Unnamed type';
//       currentChunk = line + '\n';
//     } 
//     else {
//       currentChunk += line + '\n';
//     }
    
   
//     const openBraces = (line.match(/\{/g) || []).length;
//     const closeBraces = (line.match(/\}/g) || []).length;
//     blockDepth += openBraces - closeBraces;
    
  
//     if (blockDepth === 0 && currentChunk.trim() && 
//         (line.includes('}') || estimateTokens(currentChunk) > maxTokens)) {
//       chunks.push({
//         content: includes + currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: currentChunkName || 'Unnamed section'
//         }
//       });
//       currentChunk = '';
//       currentChunkName = '';
//     }
//   }
  
  
//   if (currentChunk.trim()) {
//     chunks.push({
//       content: includes + currentChunk,
//       metadata: {
//         ...fileMetadata,
//         chunkType: 'code',
//         name: currentChunkName || 'Unnamed section'
//       }
//     });
//   }
  
//   return chunks;
// }


// function chunkRust(content, fileMetadata, maxTokens) {
//   const chunks = [];
//   const lines = content.split('\n');
  
//   let currentChunk = '';
//   let currentChunkName = '';
//   let blockDepth = 0;
//   let imports = '';
  
 
//   let i = 0;
//   while (i < lines.length) {
//     const line = lines[i];
//     if (line.trim().startsWith('use ') || line.trim().startsWith('extern crate')) {
//       imports += line + '\n';
//       i++;
//     } else if (line.trim() === '' || line.trim().startsWith('//')) {
//       imports += line + '\n';
//       i++;
//     } else {
//       break;
//     }
//   }
  
 
//   for (; i < lines.length; i++) {
//     const line = lines[i];
    
    
//     if (blockDepth === 0 && line.match(/\s*(?:pub\s+)?fn\s+\w+/)) {
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: imports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
      
//       const funcMatch = line.match(/fn\s+(\w+)/);
//       currentChunkName = funcMatch ? funcMatch[1] : 'Unnamed function';
//       currentChunk = line + '\n';
//     } 
    
//     else if (blockDepth === 0 && 
//              line.match(/\s*(?:pub\s+)?(?:struct|enum|trait|impl|type|mod)\s+\w+/)) {
      
//       if (currentChunk.trim()) {
//         chunks.push({
//           content: imports + currentChunk,
//           metadata: {
//             ...fileMetadata,
//             chunkType: 'code',
//             name: currentChunkName || 'Unnamed section'
//           }
//         });
//       }
      
//       const typeMatch = line.match(/(?:struct|enum|trait|impl|type|mod)\s+(\w+)/);
//       currentChunkName = typeMatch ? typeMatch[1] : 'Unnamed type';
//       currentChunk = line + '\n';
//     } 
//     else {
//       currentChunk += line + '\n';
//     }
    
    
//     const openBraces = (line.match(/\{/g) || []).length;
//     const closeBraces = (line.match(/\}/g) || []).length;
//     blockDepth += openBraces - closeBraces;
    
    
//     if (blockDepth === 0 && currentChunk.trim() && 
//         (line.trim() === '}' || estimateTokens(currentChunk) > maxTokens)) {
//       chunks.push({
//         content: imports + currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: currentChunkName || 'Unnamed section'
//         }
//       });
//       currentChunk = '';
//       currentChunkName = '';
//     }
//   }
  
  
//   if (currentChunk.trim()) {
//     chunks.push({
//       content: imports + currentChunk,
//       metadata: {
//         ...fileMetadata,
//         chunkType: 'code',
//         name: currentChunkName || 'Unnamed section'
//       }
//     });
//   }
  
//   return chunks;
// }


// function chunkBySize(content, fileMetadata, maxTokens) {
//   const chunks = [];
//   const lines = content.split('\n');
  
//   let currentChunk = '';
//   let chunkNumber = 1;
  
//   for (let i = 0; i < lines.length; i++) {
//     const line = lines[i];
//     currentChunk += line + '\n';
    
    
//     if (estimateTokens(currentChunk) > maxTokens) {
//       chunks.push({
//         content: currentChunk,
//         metadata: {
//           ...fileMetadata,
//           chunkType: 'code',
//           name: `Chunk ${chunkNumber}`
//         }
//       });
//       currentChunk = '';
//       chunkNumber++;
//     }
//   }
  
 
//   if (currentChunk.trim()) {
//     chunks.push({
//       content: currentChunk,
//       metadata: {
//         ...fileMetadata,
//         chunkType: 'code',
//         name: `Chunk ${chunkNumber}`
//       }
//     });
//   }
  
//   return chunks;
// }

function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

export function chunkCodeFile(content, filePath, maxTokens = 400) {
  const extension = filePath.split('.').pop().toLowerCase();
  const language = getLanguageFromExtension(extension);
  
  const fileMetadata = {
    path: filePath,
    language: language,
    extension: extension
  };
  
  if (content.length < 1000) {
    return [{
      content: content,
      metadata: {
        ...fileMetadata,
        chunkType: 'complete',
        name: 'Complete file'
      }
    }];
  }
  
  switch(language) {
    case 'javascript':
    case 'typescript':
      return chunkJavaScriptFast(content, fileMetadata, maxTokens);
    case 'python':
      return chunkPythonFast(content, fileMetadata, maxTokens);
    default:
      return chunkBySizeFast(content, fileMetadata, maxTokens);
  }
}

function getLanguageFromExtension(extension) {
  const map = {
    'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
    'py': 'python', 'java': 'java', 'go': 'go', 'c': 'c', 'h': 'c',
    'cpp': 'cpp', 'hpp': 'cpp', 'rs': 'rust', 'html': 'html', 'css': 'css'
  };
  return map[extension] || 'text';
}

function chunkJavaScriptFast(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let imports = '';
  let currentChunk = '';
  let chunkName = '';
  let braceDepth = 0;
  let inFunction = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (i < 20 && (line.includes('import ') || line.includes('require('))) {
      imports += line + '\n';
      continue;
    }
    
    const openBraces = (line.match(/\{/g) || []).length;
    const closeBraces = (line.match(/\}/g) || []).length;
    braceDepth += openBraces - closeBraces;
    
    if (braceDepth === 0 && line.match(/(?:function|class|const\s+\w+\s*=)/)) {
      if (currentChunk.trim()) {
        chunks.push({
          content: imports + currentChunk,
          metadata: { ...fileMetadata, chunkType: 'code', name: chunkName || 'Code block' }
        });
      }
      
      const match = line.match(/(?:function\s+(\w+)|class\s+(\w+)|const\s+(\w+))/);
      chunkName = match ? (match[1] || match[2] || match[3]) : 'Anonymous';
      currentChunk = line + '\n';
      inFunction = true;
    } else {
      currentChunk += line + '\n';
    }
    
    if (estimateTokens(currentChunk) > maxTokens && braceDepth === 0) {
      chunks.push({
        content: imports + currentChunk,
        metadata: { ...fileMetadata, chunkType: 'code', name: chunkName || 'Code block' }
      });
      currentChunk = '';
      inFunction = false;
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      content: imports + currentChunk,
      metadata: { ...fileMetadata, chunkType: 'code', name: chunkName || 'Code block' }
    });
  }
  
  return chunks.length > 0 ? chunks : [{
    content: content,
    metadata: { ...fileMetadata, chunkType: 'complete', name: 'Complete file' }
  }];
}

function chunkPythonFast(content, fileMetadata, maxTokens) {
  const chunks = [];
  const lines = content.split('\n');
  
  let imports = '';
  let currentChunk = '';
  let chunkName = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (i < 20 && (line.startsWith('import ') || line.startsWith('from '))) {
      imports += line + '\n';
      continue;
    }
    
    if (!line.startsWith(' ') && !line.startsWith('\t') && line.trim()) {
      if (line.startsWith('def ') || line.startsWith('class ')) {
        if (currentChunk.trim()) {
          chunks.push({
            content: imports + currentChunk,
            metadata: { ...fileMetadata, chunkType: 'code', name: chunkName || 'Code block' }
          });
        }
        
        const match = line.match(/(?:def\s+(\w+)|class\s+(\w+))/);
        chunkName = match ? (match[1] || match[2]) : 'Anonymous';
        currentChunk = line + '\n';
      } else {
        currentChunk += line + '\n';
      }
    } else {
      currentChunk += line + '\n';
    }
    
    if (estimateTokens(currentChunk) > maxTokens) {
      chunks.push({
        content: imports + currentChunk,
        metadata: { ...fileMetadata, chunkType: 'code', name: chunkName || 'Code block' }
      });
      currentChunk = '';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      content: imports + currentChunk,
      metadata: { ...fileMetadata, chunkType: 'code', name: chunkName || 'Code block' }
    });
  }
  
  return chunks.length > 0 ? chunks : [{
    content: content,
    metadata: { ...fileMetadata, chunkType: 'complete', name: 'Complete file' }
  }];
}

function chunkBySizeFast(content, fileMetadata, maxTokens) {
  const targetSize = maxTokens * 4;
  const chunks = [];
  
  for (let i = 0; i < content.length; i += targetSize) {
    const chunk = content.slice(i, i + targetSize);
    chunks.push({
      content: chunk,
      metadata: {
        ...fileMetadata,
        chunkType: 'chunk',
        name: `Chunk ${Math.floor(i / targetSize) + 1}`
      }
    });
  }
  
  return chunks;
}