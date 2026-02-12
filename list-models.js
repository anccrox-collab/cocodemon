// List available Gemini models
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyCzByX-J2AIbGMAGQK4sn-bWqiyVIXt-5c';

console.log('Fetching available Gemini models...\n');

(async () => {
  try {
    const response = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`,
      { timeout: 10000 }
    );
    
    console.log('Available Models:');
    console.log('='.repeat(60));
    
    if (response.data.models && response.data.models.length > 0) {
      response.data.models.forEach((model, i) => {
        console.log(`${i + 1}. ${model.name}`);
        if (model.displayName) console.log(`   Display: ${model.displayName}`);
        if (model.description) console.log(`   Desc: ${model.description.substring(0, 60)}...`);
        console.log('');
      });
    } else {
      console.log('No models found');
    }
  } catch (error) {
    console.log('Error fetching models:');
    console.log(`  Status: ${error.response?.status}`);
    console.log(`  Message: ${error.response?.data?.error?.message || error.message}`);
  }
})();
