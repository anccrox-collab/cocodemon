// Detailed API debugging script
const axios = require('axios');

const GEMINI_API_KEY = 'AIzaSyCzByX-J2AIbGMAGQK4sn-bWqiyVIXt-5c';
const VISION_API_KEY = 'AIzaSyDSVCXOfuOcAAygfZFDIMw7dvLWl5yf1-U';

console.log('\n╔═══════════════════════════════════════════════════════════╗');
console.log('║  API DEBUG - Detailed Error Analysis                     ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// Test 1: Gemini API  
console.log('test 1: Testing Gemini API');
console.log('-'.repeat(60));

(async () => {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`;
    console.log(`URL: ${url.substring(0, 100)}...`);
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: 'Hello' }]
      }]
    }, {
      timeout: 10000
    });
    
    console.log('✓ Gemini API Response:', response.status);
  } catch (error) {
    console.log('✗ Gemini API Error:');
    console.log(`  Status: ${error.response?.status}`);
    console.log(`  Message: ${error.response?.statusText}`);
    console.log(`  Data:`, JSON.stringify(error.response?.data, null, 2));
  }
})();

// Test 2: Cloud Vision API
setTimeout(async () => {
  console.log('\n\nTest 2: Testing Cloud Vision API');
  console.log('-'.repeat(60));
  
  try {
    const url = `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`;
    console.log(`URL: ${url.substring(0, 100)}...`);
    
    const response = await axios.post(url, {
      requests: [{
        image: { content: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==' },
        features: [{ type: 'TEXT_DETECTION' }]
      }]
    }, {
      timeout: 10000
    });
    
    console.log('✓ Vision API Response:', response.status);
  } catch (error) {
    console.log('✗ Vision API Error:');
    console.log(`  Status: ${error.response?.status}`);
    console.log(`  Message: ${error.response?.statusText}`);
    console.log(`  Error Details:`);
    if (error.response?.data?.error) {
      console.log(`    Code: ${error.response.data.error.code}`);
      console.log(`    Message: ${error.response.data.error.message}`);
      console.log(`    Status: ${error.response.data.error.status}`);
    }
  }
}, 1000);

// Test 3: Extract endpoint with error details
setTimeout(async () => {
  console.log('\n\nTest 3: Testing Extract Aadhar Endpoint');
  console.log('-'.repeat(60));
  
  try {
    const FormData = require('form-data');
    const form = new FormData();
    
    const pngBuffer = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
      0, 0, 0, 12, 73, 68, 65, 84, 8, 153, 99, 248, 15, 0, 0, 1, 1, 1, 0,
      26, 181, 207, 80, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);
    
    form.append('file', pngBuffer, 'test.png');
    
    const response = await axios.post('http://localhost:5000/api/extract-aadhar', form, {
      headers: form.getHeaders(),
      timeout: 30000
    });
    
    console.log('✓ Endpoint Response:', response.status);
    console.log(`  Success: ${response.data.success}`);
    console.log(`  Message: ${response.data.message}`);
  } catch (error) {
    console.log('✗ Endpoint Error:');
    console.log(`  Status: ${error.response?.status}`);
    console.log(`  Error: ${error.response?.data?.error}`);
  }
}, 2000);

console.log('\n⏳ Testing APIs... (may take a few seconds)\n');
