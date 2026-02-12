// Test improved extraction accuracy
const axios = require('axios');
const fs = require('fs');

const BASE_API = 'http://localhost:5000';

// Test OCR extracted text (from real Aadhar document)
const testOCRText = `S|, SERRE yi
b 4 — Eo ONIGUEIDENTIFICATIONWUTHORYPY OF INDIA
3 ~ Govemmentofindia NAGHAAR
wh art gre Address: wife of lakhan a; ad aie
Sakhi bai kushwah kushwah vilage barai ed dee awd def
er fl 00B 101011989 post barai tehsil badarwas  waxarw fore Rag
Female / fer RIER ES district shivpuri arses
SE`;

console.log(`
════════════════════════════════════════════════════════
  Testing IMPROVED Extraction with Better Regex Parser
════════════════════════════════════════════════════════
`);

console.log('\n📄 Original OCR Text:');
console.log('─'.repeat(60));
console.log(testOCRText);
console.log('─'.repeat(60));

// Simulate the improved parser locally for demonstration
function parseAadharDataFallback(text) {
  const data = {
    name: '',
    fatherName: '',
    dateOfBirth: '',
    aadharNumber: '',
    address: '',
    gender: ''
  }

  if (!text) return data

  // Preserve line breaks for better parsing
  const lines = text.split(/[\n\r]+/).map(l => l.trim()).filter(l => l.length > 0)
  const cleanText = text.replace(/\s+/g, ' ').trim()

  // 1. Extract Aadhar Number (12 digits in various formats)
  const aadharPatterns = [
    /\b(\d{4}\s\d{4}\s\d{4})\b/,           // XXX XXXX XXXX with spaces
    /\b(\d{4}-\d{4}-\d{4})\b/,             // XXXX-XXXX-XXXX
    /\b(\d{12})\b/,                        // XXXXXXXXXXXX
    /(?:Aadhaar|AADHAAR|Aadhar)[\s:]*(\d{4}\s?\d{4}\s?\d{4})/i
  ]
  for (const pattern of aadharPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      data.aadharNumber = match[1].replace(/[\s\-]/g, ' ').trim()
      break
    }
  }

  // 2. Extract Gender (Male/Female/M/F) - more flexible
  const genderMatch = cleanText.match(/\b(Male|Female|MALE|FEMALE|M\/F|MALE\/FEMALE|male|female)\b.*?\b(M|F|Male|Female)\b/i) || 
                      cleanText.match(/\b(Male|Female|MALE|FEMALE|M|F)(?:\s|\/|\||;|,)/i)
  if (genderMatch) {
    const genderText = genderMatch[1]
    if (genderText.toUpperCase().includes('F')) {
      data.gender = 'Female'
    } else if (genderText.toUpperCase().includes('M')) {
      data.gender = 'Male'
    }
  }

  // 3. Extract Date of Birth - more flexible patterns
  const dobPatterns = [
    /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/,                     // DD/MM/YYYY or DD-MM-YYYY
    /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})\b/,                 // D/M/YYYY format
    /(?:DOB|Date of Birth|born)[\s:]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/i,
    /(\d{2})\/(\d{2})\/(\d{4})/                              // Match any date-like pattern
  ]
  for (const pattern of dobPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      if (match[3]) {  // If it matched the separators
        data.dateOfBirth = `${match[1]}/${match[2]}/${match[3]}`
      } else {
        data.dateOfBirth = match[1]
      }
      break
    }
  }

  // 4. Extract Name - improved patterns for OCR errors
  const namePatterns = [
    /(?:^|\s)(?:Name|NAME|नाम)[\s:]*([A-Z][A-Za-z\s]{8,50}?)(?=\s+(?:S\/O|D\/O|W\/O|F\/O|Father|Mother|Husband|Wife)|$)/im,
    /(?:IDENTIFICATION|AUTHORITY)[\s\S]{0,100}?([A-Z][A-Za-z\s]{8,50}?)(?=\s+(?:S\/O|D\/O|W\/O|F\/O))/i,
    /^([A-Z][A-Za-z\s]{8,50}?)[\s]+(?:S\/O|D\/O|W\/O|F\/O|Father|Mother|Husband|Wife)/im,
    /(?:INDIA|AADHAR)[\s\S]{20,150}?([A-Z][A-Za-z\s]{8,50}?)[\s]+(?:S\/O|D\/O|W\/O|Address)/i
  ]
  
  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      let name = match[1].trim()
      name = name.replace(/[\|\/\\]/g, ' ')
      name = name.replace(/\s+/g, ' ')
      if (name.length > 5 && !name.includes('GOVERNMENT') && !name.includes('INDIA')) {
        data.name = name
        break
      }
    }
  }

  // If name not found, try to extract from lines
  if (!data.name) {
    for (const line of lines) {
      if (line.includes('IDENTIFICATION') || line.includes('INDIA') || line.includes('Government')) continue
      if (/^[A-Z][A-Za-z\s]{8,50}$/.test(line) || /^[A-Z][A-Za-z]+[\s]+[A-Z][A-Za-z]+/.test(line)) {
        data.name = line
        break
      }
    }
  }

  // 5. Extract Father's/Husband's Name
  const fatherPatterns = [
    /(?:S\/O|D\/O|W\/O|F\/O)[\s]*([A-Z][A-Za-z\s]{8,50}?)(?=\s+(?:Address|Post|Tehsil|District|Village)|,|$)/i,
    /(?:Father|FATHER|Husband|HUSBAND|Mother|MOTHER)[\s:]*([A-Z][A-Za-z\s]{8,50}?)(?=\s+(?:Address|Post|Village)|$|,)/i
  ]

  for (const pattern of fatherPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      let parentName = match[1].trim().replace(/[\|\/\\]/g, ' ').replace(/\s+/g, ' ')
      if (parentName.length > 3 && !parentName.includes('GOVERNMENT')) {
        data.fatherName = parentName
        break
      }
    }
  }

  // 6. Extract Address - improved version
  const addressPatterns = [
    /(?:Address|ADDRESS|पता)[\s:]*([A-Za-z0-9\s,.\-]{20,200}?)(?=\s*(?:Pin|ZIP|Postal|POST|Phone)|$|District|Tehsil)/i,
    /(?:Address|ADDRESS)[\s:]*([A-Za-z0-9\s,.\-]{15,200}?)(?=\s*\d{6}|$)/i,
    /(?:Address)[\s:]*([A-Za-z0-9\s,.\-]+(?:\n[A-Za-z0-9\s,.\-]+)*)/i
  ]

  for (const pattern of addressPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      let address = match[1].trim().replace(/\s+/g, ' ')
      address = address.replace(/[^\w\s,.\-]/g, '')
      if (address.length > 10) {
        data.address = address
        break
      }
    }
  }

  if (!data.address && lines.length > 3) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.toLowerCase().includes('address') && i + 1 < lines.length) {
        let addressLines = []
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          if (!lines[j].includes('GOVERNMENT') && !lines[j].includes('INDIA') && lines[j].length > 3) {
            addressLines.push(lines[j])
          }
        }
        if (addressLines.length > 0) {
          data.address = addressLines.join(' ')
          break
        }
      }
    }
  }

  return data
}

// Test the parser
const result = parseAadharDataFallback(testOCRText);

console.log('\n📊 Extracted Data:');
console.log('─'.repeat(60));
console.log(`
  Name:              ${result.name || '(Not found)'}
  Father/Husband:    ${result.fatherName || '(Not found)'}
  Date of Birth:     ${result.dateOfBirth || '(Not found)'}
  Aadhar Number:     ${result.aadharNumber || '(Not found)'}
  Gender:            ${result.gender || '(Not found)'}
  Address:           ${result.address || '(Not found)'}
`);
console.log('─'.repeat(60));

// Check results
const hasAadhar = result.aadharNumber && result.aadharNumber.length > 0;
const hasGender = result.gender && result.gender.length > 0;
const hasDOB = result.dateOfBirth && result.dateOfBirth.length > 0;

console.log('\n✅ Extraction Quality:');
if (hasAadhar) console.log('  ✓ Aadhar Number extracted');
if (hasGender) console.log('  ✓ Gender extracted');
if (hasDOB) console.log('  ✓ Date of Birth extracted');
if (result.address) console.log('  ✓ Address extracted');
if (result.name) console.log('  ✓ Name extracted');
if (result.fatherName) console.log('  ✓ Father/Husband Name extracted');

const extractedFields = [hasAadhar, hasGender, hasDOB, result.address, result.name, result.fatherName].filter(v => v).length;
console.log(`\n📈 Fields Extracted: ${extractedFields}/6`);

if (extractedFields >= 4) {
  console.log('\n🎉 Improved parser is working well!');
  console.log('   Now works even when Gemini quota is exhausted.');
} else {
  console.log('\n⚠️  Some fields still missing. Try with different OCR text.');
}

console.log('\n💡 How to test with real documents:');
console.log('   1. Visit: http://localhost:3000');
console.log('   2. Upload a government ID document (Aadhar, PAN, etc.)');
console.log('   3. Click "Extract Information"');
console.log('   4. Watch as Tesseract OCR extracts text');
console.log('   5. Improved parser structures the data');
console.log('   6. Results appear even if Gemini quota is exhausted!\n');
