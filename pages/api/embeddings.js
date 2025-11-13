import { generateEmbedding } from '../../lib/embeddings';


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  const { text } = req.body;
  
  if (!text) {
    return res.status(400).json({ error: 'Text is required' });
  }
  
  try {
    const embedding = await generateEmbedding(text);
    
    return res.status(200).json({
      success: true,
      embedding,
    });
  } catch (error) {
    console.error('Error generating embedding:', error);
    
    return res.status(500).json({
      error: 'Failed to generate embedding',
      message: error.message,
    });
  }
}