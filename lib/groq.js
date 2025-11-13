import { Groq } from 'groq-sdk';


const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});


const MODEL = 'llama-3.1-8b-instant';  
const MAX_TOKENS = 4096;

/**
 * @param {Array<Object>} chunks 
 * @returns {string} 
 */
function formatContextFromChunks(chunks) {
  let context = '';
  
  chunks.forEach((chunk, index) => {
    const { content, metadata } = chunk;
    const filePath = metadata.path;
    const chunkName = metadata.name || 'Unnamed section';
    
    context += `\n\n--- FILE: ${filePath} ---\n`;
    context += `--- SECTION: ${chunkName} ---\n`;
    context += `${content}\n`;
  });
  
  return context;
}

/**
 * @param {Object} repoInfo 
 * @returns {string} 
 */
function generateSystemPrompt(repoInfo) {
  return `You are a helpful and knowledgeable code assistant specialized in analyzing and improving codebases. You're currently looking at a GitHub repository called '${repoInfo.name}' by ${repoInfo.owner.name}. The repository is written primarily in ${repoInfo.language || 'multiple languages'}.

Repository description: ${repoInfo.description || 'No description provided'}

Your goal is to help the user understand and enhance this codebase. You should:
1. Analyze and explain code when requested, focusing on key components and patterns
2. Generate high-quality, working code solutions when asked
3. Suggest improvements or fix issues if requested
4. Write complete, well-documented code samples that could be directly implemented
5. When referencing files or functions, be specific about their location and purpose
6. If you don't know something, say so rather than guessing

When explaining code:
- Focus on the high-level purpose first, then dive into details if needed
- Highlight important patterns, architectural choices, and design decisions
- Explain how different components interact
- Use clear and concise language

When writing new code:
- Write complete, functional code that could be directly implemented
- Include detailed comments explaining key parts
- Follow best practices and patterns established in the existing codebase
- Ensure proper error handling and edge cases are addressed
- Format your code snippets using markdown code blocks with the appropriate language for syntax highlighting

The user will ask you questions, and I'll provide relevant code from the repository to help you answer them.`;
}

/**
 * @param {string} question 
 * @param {Array<Object>} relevantChunks 
 * @param {Object} repoInfo 
 * @returns {Promise<string>} 
 */
export async function queryGroq(question, relevantChunks, repoInfo) {
  try {
    
    const context = formatContextFromChunks(relevantChunks);
    
    
    const systemPrompt = generateSystemPrompt(repoInfo);
    
 
    const userPrompt = `Here is my question about the codebase: "${question}"

Below are the most relevant parts of the codebase to answer this question:
${context}

Please help me understand this code and provide a complete, well-structured answer. If I'm asking for code generation, please provide complete, working code solutions that follow the patterns and practices of the existing codebase.`;
    
    
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,  
      max_tokens: MAX_TOKENS,
      top_p: 0.95,
    });
    
    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  } catch (error) {
    console.error('Error querying Groq:', error);
    throw new Error(`Failed to get a response from Groq: ${error.message}`);
  }
}