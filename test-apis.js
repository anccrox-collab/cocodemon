// Test script for Jan Sahayak - Gemini and Cloud Vision API integration
// Tests all critical APIs and features

const axios = require('axios');
const fs = require('fs');

// Configuration
const BASE_API = 'http://localhost:5000';
const FRONTEND_URL = 'http://localhost:3000';
const GEMINI_API_KEY = 'AIzaSyCzByX-J2AIbGMAGQK4sn-bWqiyVIXt-5c';
const VISION_API_KEY = 'AIzaSyDSVCXOfuOcAAygfZFDIMw7dvLWl5yf1-U';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

async function log(message, status = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  let color = colors.blue;
  
  if (status === 'success') color = colors.green;
  if (status === 'error') color = colors.red;
  if (status === 'warning') color = colors.yellow;
  
  console.log(`${color}[${timestamp}]${colors.reset} ${message}`);
}

// Test 1: Health Check
async function testHealthCheck() {
  console.log('\n=== Test 1: Backend Health Check ===');
  try {
    const response = await axios.get(`${BASE_API}/api/health`);
    log('✓ Backend server is running', 'success');
    log(`  Status: ${response.data.status}`, 'success');
    return true;
  } catch (error) {
    log(`✗ Backend health check failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 2: Gemini API Connection
async function testGeminiAPI() {
  console.log('\n=== Test 2: Gemini API Connection ===');
  try {
    const response = await axios.post(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + GEMINI_API_KEY,
      {
        contents: [{
          parts: [{
            text: 'Hello! Say "Gemini API is working" in 10 words or less.'
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 50
        }
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    if (response.data.candidates && response.data.candidates[0]) {
      log('✓ Gemini API is working', 'success');
      const text = response.data.candidates[0].content.parts[0].text;
      log(`  Response: ${text}`, 'success');
      return true;
    }
  } catch (error) {
    log(`✗ Gemini API test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 3: Cloud Vision API Connection
async function testVisionAPI() {
  console.log('\n=== Test 3: Cloud Vision API Connection ===');
  try {
    // Create a simple test image (1x1 white pixel PNG)
    const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';
    
    const response = await axios.post(
      `https://vision.googleapis.com/v1/images:annotate?key=${VISION_API_KEY}`,
      {
        requests: [{
          image: { content: testImageBase64 },
          features: [{ type: 'TEXT_DETECTION' }]
        }]
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      }
    );
    
    if (response.data.responses) {
      log('✓ Cloud Vision API is working', 'success');
      return true;
    }
  } catch (error) {
    log(`✗ Cloud Vision API test failed: ${error.message}`, 'error');
    return false;
  }
}

// Test 4: Extract Aadhar Endpoint (with mock file)
async function testExtractAadharEndpoint() {
  console.log('\n=== Test 4: Extract Aadhar Endpoint ===');
  try {
    // Create a simple test image
    const FormData = require('form-data');
    const fs = require('fs');
    
    // Create a simple PNG buffer (1x1 white pixel)
    const pngBuffer = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
      0, 0, 0, 12, 73, 68, 65, 84, 8, 153, 99, 248, 15, 0, 0, 1, 1, 1, 0,
      26, 181, 207, 80, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);
    
    const form = new FormData();
    form.append('file', pngBuffer, 'test.png');
    
    const response = await axios.post(
      `${BASE_API}/api/extract-aadhar`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 30000
      }
    );
    
    log('✓ Extract Aadhar endpoint is responding', 'success');
    log(`  Success: ${response.data.success}`, 'success');
    log(`  Message: ${response.data.message}`, 'success');
    return true;
  } catch (error) {
    log(`✗ Extract Aadhar endpoint test failed: ${error.message}`, 'error');
    if (error.response?.data) {
      log(`  Error: ${JSON.stringify(error.response.data)}`, 'error');
    }
    return false;
  }
}

// Test 5: Frontend Accessibility
async function testFrontendAccessibility() {
  console.log('\n=== Test 5: Frontend Accessibility ===');
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 5000 });
    if (response.status === 200) {
      log('✓ Frontend is accessible', 'success');
      return true;
    }
  } catch (error) {
    log(`✗ Frontend not accessible: ${error.message}`, 'error');
    return false;
  }
}

// Test 6: Feature Verification
async function testFeatures() {
  console.log('\n=== Test 6: Feature Verification ===');
  
  const features = [
    { name: 'GeminiClient.js', path: './src/services/GeminiClient.js' },
    { name: 'Chatbot Component', path: './src/pages/Chatbot.jsx' },
    { name: 'Environment Config', path: './.env' }
  ];
  
  const fs = require('fs');
  let allExist = true;
  
  for (const feature of features) {
    try {
      const fullPath = `c:\\Users\\Tigps\\Downloads\\Jan_Sahayak-main\\Jan_Sahayak-main${feature.path.replace(/\.\//g, '\\')}`;
      if (fs.existsSync(fullPath)) {
        log(`✓ ${feature.name} is configured`, 'success');
      } else {
        log(`✗ ${feature.name} not found`, 'error');
        allExist = false;
      }
    } catch (error) {
      log(`✗ Error checking ${feature.name}: ${error.message}`, 'error');
      allExist = false;
    }
  }
  
  return allExist;
}

// Run all tests
async function runAllTests() {
  console.log(`${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Jan Sahayak - API & Feature Testing Suite              ║${colors.reset}`);
  console.log(`${colors.blue}║  Testing Gemini + Cloud Vision Integration              ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);
  
  const results = {
    'Health Check': await testHealthCheck(),
    'Gemini API': await testGeminiAPI(),
    'Cloud Vision API': await testVisionAPI(),
    'Extract Aadhar Endpoint': await testExtractAadharEndpoint(),
    'Frontend Accessibility': await testFrontendAccessibility(),
    'Feature Verification': await testFeatures()
  };
  
  // Summary
  console.log(`\n${colors.blue}╔════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.blue}║  Test Summary                                            ║${colors.reset}`);
  console.log(`${colors.blue}╚════════════════════════════════════════════════════════╝${colors.reset}`);
  
  let passed = 0;
  for (const [test, result] of Object.entries(results)) {
    const status = result ? '✓ PASS' : '✗ FAIL';
    const color = result ? colors.green : colors.red;
    console.log(`${color}${status}${colors.reset} - ${test}`);
    if (result) passed++;
  }
  
  console.log(`\n${colors.yellow}Total: ${passed}/${Object.keys(results).length} tests passed${colors.reset}\n`);
  
  if (passed === Object.keys(results).length) {
    log('🎉 All tests passed! Your application is ready to use.', 'success');
  } else {
    log('⚠️ Some tests failed. Please check the errors above.', 'warning');
  }
}

// Run tests
runAllTests().catch(error => {
  log(`Fatal error: ${error.message}`, 'error');
  process.exit(1);
});
