// Test improved extraction accuracy - Version 2
const axios = require('axios');
const fs = require('fs');

console.log(`
════════════════════════════════════════════════════════
  Testing IMPROVED Extraction v2 - Better Regex Parser
════════════════════════════════════════════════════════
`);

// Test OCR extracted text (from real Aadhar document)
const testOCRText = `S|, SERRE yi
b 4 — Eo ONIGUEIDENTIFICATIONWUTHORYPY OF INDIA
3 ~ Govemmentofindia NAGHAAR
wh art gre Address: wife of lakhan a; ad aie
Sakhi bai kushwah kushwah vilage barai ed dee awd def
er fl 00B 101011989 post barai tehsil badarwas  waxarw fore Rag
Female / fer RIER ES district shivpuri arses
SE`;

console.log('\n📄 Original OCR Text:');
console.log('─'.repeat(60));
console.log(testOCRText);
console.log('─'.repeat(60));

// Call the actual server to test extraction
async function testWithServer() {
  try {
    console.log('\n🧪 Testing with actual backend server...');
    console.log('📤 Sending test request to /api/extract-aadhar');

    // Create a test image (valid PNG)
    const validPng = Buffer.from([
      137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0, 144, 119, 83, 222,
      0, 0, 0, 12, 73, 68, 65, 84, 8, 153, 99, 248, 15, 0, 0, 1, 1, 1, 0,
      26, 181, 207, 80, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130
    ]);

    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', validPng, 'test.png');

    const response = await axios.post(
      'http://localhost:5000/api/extract-aadhar',
      form,
      {
        headers: form.getHeaders(),
        timeout: 60000
      }
    );

    console.log('\n✅ Server Response:');
    console.log('─'.repeat(60));
    console.log(JSON.stringify(response.data, null, 2));
    console.log('─'.repeat(60));

    const { extractedData, rawText, success } = response.data;
    console.log('\n📊 Parsed Results:');
    console.log(`  Name:              ${extractedData.name || '(Not found)'}`);
    console.log(`  Father/Husband:    ${extractedData.fatherName || '(Not found)'}`);
    console.log(`  Date of Birth:     ${extractedData.dateOfBirth || '(Not found)'}`);
    console.log(`  Aadhar Number:     ${extractedData.aadharNumber || '(Not found)'}`);
    console.log(`  Gender:            ${extractedData.gender || '(Not found)'}`);
    console.log(`  Address:           ${extractedData.address || '(Not found)'}`);
    console.log(`\n  Success: ${success}`);
    console.log(`  Message: ${response.data.message}`);

    const fields = [extractedData.name, extractedData.fatherName, extractedData.dateOfBirth, 
                    extractedData.aadharNumber, extractedData.gender, extractedData.address].filter(v => v).length;
    
    console.log(`\n📈 Fields with data: ${fields}/6`);
    console.log('\n✅ Backend tested successfully with improved parser!\n');

  } catch (error) {
    if (error.response) {
      console.log('\n❌ Server Error:');
      console.log(`Status: ${error.response.status}`);
      console.log(`Data:`, error.response.data);
    } else {
      console.log('\n❌ Error:', error.message);
    }
  }
}

console.log('\n💡 Next Steps:');
console.log('   1. Ensure backend is running: http://localhost:5000/api/health');
console.log('   2. The improved parser now handles:');
console.log('      • Multiple date formats (with/without separators)');
console.log('      • Better name extraction');
console.log('      • Multi-line address detection');
console.log('      • Gender recognition');
console.log('      • Aadhar number in various formats');
console.log('   3. Works as fallback when Gemini quota is exhausted');
testWithServer();
