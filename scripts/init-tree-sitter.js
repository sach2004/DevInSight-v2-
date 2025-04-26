const fs = require('fs');
const path = require('path');
const https = require('https');

const WASM_DIR = path.join(process.cwd(), 'public', 'tree-sitter-wasm');


if (!fs.existsSync(WASM_DIR)) {
  fs.mkdirSync(WASM_DIR, { recursive: true });
  console.log(`Created directory: ${WASM_DIR}`);
}


function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      } else {
        file.close();
        fs.unlink(dest, () => {});
        console.error(`Failed to download ${url}: Status code ${response.statusCode}`);
        resolve(); 
      }
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      console.error(`Error downloading ${url}:`, err.message);
      resolve(); 
    });
  });
}


const LANGUAGES = [
  { name: 'javascript' },
  { name: 'typescript' },
  { name: 'python' },
  { name: 'java' },
  { name: 'go' },
  { name: 'cpp' },
  { name: 'c' },
  { name: 'rust' }
];


async function setupTreeSitter() {
  try {
    console.log('Setting up Tree-sitter WASM files...');
    
    
    const mainWasmPath = path.join(WASM_DIR, 'tree-sitter.wasm');
    if (!fs.existsSync(mainWasmPath)) {
      console.log('Creating placeholder for tree-sitter.wasm');
      fs.writeFileSync(mainWasmPath, '');
    }
    
    
    for (const lang of LANGUAGES) {
      const langWasmPath = path.join(WASM_DIR, `tree-sitter-${lang.name}.wasm`);
      if (!fs.existsSync(langWasmPath)) {
        console.log(`Creating placeholder for tree-sitter-${lang.name}.wasm`);
        fs.writeFileSync(langWasmPath, '');
      }
    }
    
    console.log('Tree-sitter setup completed.');
    console.log('NOTE: These are placeholder files. The application will fall back to regex-based parsing.');
    
  } catch (error) {
    console.error('Error during Tree-sitter setup:', error);
    console.log('The application will fall back to regex-based parsing.');
  }
}


setupTreeSitter();