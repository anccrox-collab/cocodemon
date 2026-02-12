// Test Gemini Chat API
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyDjCQF-X4YdN9z3BQRtkd5c5HzDMYA7cQs';

async function testGeminiChat() {
  console.log(`
═══════════════════════════════════════════════════════════
  Testing Gemini Chat API
═══════════════════════════════════════════════════════════
`);

  try {
    console.log('📤 Testing with simple message: "Hello"');
    
    const payload = {
      contents: [{
        parts: [{
          text: 'Hello! Can you help me with government services?'
        }]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 256
      }
    };

    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('\n✅ API Response Status: Success');
    
    if (response.data.candidates && response.data.candidates[0]) {
      const answer = response.data.candidates[0].content.parts[0].text;
      console.log('\n📝 Response:');
      console.log('─'.repeat(60));
      console.log(answer);
      console.log('─'.repeat(60));
      
      console.log('\n🎉 Chat API is working!\n');
    }
  } catch (error) {
    console.error('\n❌ Error Details:');
    console.error('─'.repeat(60));
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Status Text:', error.response.statusText);
      console.error('Error Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Message:', error.message);
    }
    console.error('─'.repeat(60));
    
    if (error.response?.status === 429) {
      console.error('\n⚠️  Quota Exhausted! (429 error)');
      console.error('   - Free tier limit reached');
      console.error('   - Wait 24 hours, or');
      console.error('   - Enable billing at: https://console.cloud.google.com/');
    }
  }
}

testGeminiChat();
