// Test the fixed Gemini API with the correct model
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyCzByX-J2AIbGMAGQK4sn-bWqiyVIXt-5c';

console.log('Testing Gemini 2.0 Flash Model...\n');

(async () => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    console.log('URL:', url.split('?')[0] + '?key=[API_KEY]');
    console.log('');
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{
          text: 'Say "Gemini API is working correctly" in 5 words or less.'
        }]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 50
      }
    }, {
      timeout: 15000
    });
    
    if (response.data.candidates && response.data.candidates[0]) {
      const text = response.data.candidates[0].content.parts[0].text;
      console.log('✅ SUCCESS! Gemini API is working\n');
      console.log('Response:', text);
      process.exit(0);
    }
  } catch (error) {
    console.log('❌ ERROR:');
    console.log('Status:', error.response?.status);
    console.log('Message:', error.response?.statusText);
    if (error.response?.data?.error) {
      console.log('Error:', error.response.data.error.message);
    }
    process.exit(1);
  }
})();
