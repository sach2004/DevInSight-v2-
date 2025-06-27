// test-hf.js
require('dotenv').config({ path: '.env' });

async function testHuggingFace() {
  console.log('Testing Hugging Face API connection...');
  
  // Check if API key exists
  if (!process.env.HUGGINGFACE_API_KEY) {
    console.error('❌ HUGGINGFACE_API_KEY not found in environment');
    return;
  }
  
  console.log('✓ API key found:', process.env.HUGGINGFACE_API_KEY.substring(0, 10) + '...');
  
  try {
    const { testHuggingFaceConnection } = require('./lib/embeddings');
    
    const isWorking = await testHuggingFaceConnection();
    
    if (isWorking) {
      console.log('✅ Hugging Face API is working correctly!');
    } else {
      console.log('❌ Hugging Face API test failed');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testHuggingFace();