import express from 'express'
import cors from 'cors'
import multer from 'multer'
import axios from 'axios'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import Tesseract from 'tesseract.js'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 5000

// Global error handlers to prevent crashes
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message)
  // Don't exit, just log it
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason)
  // Don't exit, just log it
})
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Configure multer for file uploads
const storage = multer.memoryStorage()
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Only PNG, JPG, and PDF are allowed.'), false)
    }
  }
})

// Parse Aadhar card data from extracted text (improved fallback method - v2)
const parseAadharDataFallback = (text) => {
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
    /\b(\d{4}\s\d{4}\s\d{4})\b/,           // XXXX XXXX XXXX
    /\b(\d{4}-\d{4}-\d{4})\b/,             // XXXX-XXXX-XXXX
    /\b(\d{12})\b/,                        // XXXXXXXXXXXX (no separators)
    /\b(\d{4})\s(\d{4})\s(\d{4})\b/,       // Capture each group
    /(?:Aadhaar|AADHAAR|Aadhar)[\s:]*(\d+[\s\-]*\d+[\s\-]*\d+)/i
  ]
  for (const pattern of aadharPatterns) {
    const match = cleanText.match(pattern)
    if (match) {
      const aadhar = match[1] || (match[1] + match[2] + match[3])
      data.aadharNumber = aadhar.replace(/[\s\-]/g, ' ').trim()
      if (data.aadharNumber.length >= 11) break
    }
  }

  // 2. Extract Gender (Male/Female/M/F) - more flexible
  let genderMatch = cleanText.match(/(?:Male|Female|M\/F|MALE|FEMALE)\b.*?(?:Male|Female|M|F)\b/i)
  if (!genderMatch) genderMatch = cleanText.match(/\b(Male|Female|MALE|FEMALE|M|F)(?:\s|\/|\||;|,|$)/i)
  
  if (genderMatch) {
    const genderText = genderMatch[0] || genderMatch[1]
    if (/\bF(emale)?\b/i.test(genderText)) {
      data.gender = 'Female'
    } else if (/\bM(ale)?\b/i.test(genderText)) {
      data.gender = 'Male'
    }
  }

  // 3. Extract Date of Birth - handle different formats including no separators
  const dobPatterns = [
    /\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/,                  // DD/MM/YYYY
    /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/,               // D/M/YYYY
    /(\d{2})(\d{2})(\d{4})/,                                   // DDMMYYYY without separators
    /(?:DOB|Date of Birth|born)[\s:]*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i,
    /[^\d](\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[^\d]|$)/    // With context
  ]
  
  for (const pattern of dobPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[3]) {
      const day = match[1]
      const month = match[2]
      const year = match[3]
      // Validate it looks like a real date
      const dayNum = parseInt(day)
      const monthNum = parseInt(month)
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        data.dateOfBirth = `${String(dayNum).padStart(2, '0')}/${String(monthNum).padStart(2, '0')}/${year}`
        break
      }
    }
  }

  // 4. Extract Name - improved patterns
  const namePatterns = [
    // Pattern 1: After "Name:" label
    /(?:^|\s)(?:Name|NAME)[\s:]*([A-Z][A-Za-z\s]{8,50}?)(?=\s+(?:S\/O|D\/O|W\/O|F\/O|Father|Mother|Husband|Wife)|$)/im,
    // Pattern 2: All caps word(s) after IDENTIFICATION/INDIA, before relationship
    /(?:IDENTIFICATION|INDIA)[\s\S]{0,80}?([A-Z][A-Za-z\s]{8,50}?)(?=\s+(?:S\/O|D\/O|W\/O|F\/O|Address)|$)/i,
    // Pattern 3: Capitalized words followed by relationship
    /^(?!.*(?:IDENTIFICATION|INDIA|GOVERNMENT))([A-Z][A-Za-z\s]{8,50}?)[\s]+(?:S\/O|D\/O|W\/O|F\/O|Father|Mother)[\s:]/im
  ]
  
  for (const pattern of namePatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      let name = match[1].trim()
      // Skip if it's a header or known non-name text
      if (name.includes('GOVERNMENT') || name.includes('INDIA') || name.includes('IDENTIFICATION')) continue
      // Clean OCR noise
      name = name.replace(/[\|\/\\]/g, ' ').replace(/\s+/g, ' ')
      if (name.length > 5) {
        data.name = name
        break
      }
    }
  }

  // If name not found, look through lines
  if (!data.name) {
    for (const line of lines) {
      const isHeader = line.includes('IDENTIFICATION') || line.includes('INDIA') || line.includes('Government')
      if (isHeader) continue
      // Lines that might be names
      if (/^[A-Z][A-Za-z\s]{8,50}$/.test(line)) {
        data.name = line
        break
      }
    }
  }

  // 5. Extract Father's/Husband's Name - improved
  const fatherPatterns = [
    /(?:S\/O|D\/O|W\/O|F\/O)\s+([A-Z][A-Za-z\s]{5,50}?)(?=\s+(?:Address|Post|Tehsil|District|Village|Postal)|,|$)/i,
    /(?:Father|FATHER|Husband|HUSBAND|Mother|MOTHER)[\s:]*([A-Z][A-Za-z\s]{5,50}?)(?=\s+(?:Address|Post|Village)|$|,)/i
  ]

  for (const pattern of fatherPatterns) {
    const match = cleanText.match(pattern)
    if (match && match[1]) {
      let parentName = match[1].trim().replace(/[\|\/\\]/g, ' ').replace(/\s+/g, ' ')
      if (parentName.length > 3) {
        data.fatherName = parentName
        break
      }
    }
  }

  // 6. Extract Address - improved multi-line detection
  // Look for "Address:" followed by content
  const addressMatch = cleanText.match(/(?:Address|ADDRESS)[\s:]*([^;,]*?)(?=\s+(?:District|Tehsil|Village|Pin|ZIP|Postal|Phone)|$)/i)
  if (addressMatch && addressMatch[1]) {
    let address = addressMatch[1].trim().replace(/\s+/g, ' ')
    // Allow alphanumeric, spaces, common separators, remove other OCR noise
    address = address.replace(/[^\w\s,.\-\/]/g, '')
    if (address.length > 10) {
      data.address = address
    }
  }

  // If no address found, try to capture multiple lines after "Address"
  if (!data.address) {
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].toLowerCase().includes('address')) {
        let addressLines = []
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const line = lines[j].trim()
          if (!line.includes('GOVERNMENT') && !line.includes('INDIA') && line.length > 2) {
            addressLines.push(line)
          }
          // Stop if we hit another field marker
          if (line.includes('District') || line.includes('Postal') || line.includes('PIN')) break
        }
        if (addressLines.length > 0) {
          data.address = addressLines.join(' ').replace(/\s+/g, ' ')
          break
        }
      }
    }
  }

  return data
}

// --- Removed: OnDemand-specific functions (no longer needed)
// - createSession
// - fetchExtractedText  
// - generateSessionId

// API endpoint to extract Aadhar data
app.post('/api/extract-aadhar', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'Gemini API Key not configured',
        extractedData: {}
      })
    }

    console.log('📤 Starting extraction process with Tesseract OCR...')
    console.log('File info:', {
      name: req.file.originalname,
      size: req.file.size,
      type: req.file.mimetype
    })

    // Step 1: Use Tesseract to extract text from image
    console.log('🔍 Step 1: Running Tesseract OCR on image...')
    
    let extractedText = ''
    try {
      // Validate that the buffer is a proper image
      if (!Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
        throw new Error('Invalid file buffer')
      }

      const result = await Tesseract.recognize(
        req.file.buffer,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.log(`  OCR Progress: ${Math.round(m.progress * 100)}%`)
            }
          }
        }
      ).catch(err => {
        // Catch any promise rejection from Tesseract worker
        console.error('Tesseract worker error:', err)
        throw new Error(`OCR processing failed: ${err.message}`)
      })
      
      extractedText = result.data.text
      console.log('✅ Tesseract OCR completed')
      console.log('📝 Extracted text length:', extractedText.length)
      if (extractedText) {
        console.log('📄 First 300 chars:', extractedText.substring(0, 300))
      }
    } catch (ocrError) {
      console.error('❌ Tesseract OCR Error:', ocrError.message)
      return res.status(400).json({
        success: false,
        error: `Image processing failed: ${ocrError.message}. Please ensure the file is a valid image (PNG, JPG, or PDF).`,
        extractedData: {},
        message: 'Please submit a clear, valid image file.'
      })
    }

    // If no text extracted, return early
    if (!extractedText || extractedText.trim().length === 0) {
      return res.json({
        success: false,
        extractedData: {
          name: '',
          fatherName: '',
          dateOfBirth: '',
          aadharNumber: '',
          address: '',
          gender: ''
        },
        rawText: '',
        message: 'No text could be extracted from the image. Please check if the image is clear and readable.'
      })
    }

    // Step 2: Use Gemini to parse and structure the extracted text
    console.log('🤖 Step 2: Using Gemini to parse and structure the extracted data...')

    const parsingPrompt = `You are an expert document parser. Extract the following information from the provided Aadhar card text and return ONLY valid JSON with no additional text or formatting. If a field cannot be found, use an empty string.

Fields to extract:
- name: Full name of the person
- fatherName: Father's name or parent's name
- dateOfBirth: Date of birth in DD/MM/YYYY format
- aadharNumber: 12-digit Aadhar number with spaces
- address: Complete address
- gender: Male or Female

Document Text:
${extractedText}

Return ONLY valid JSON in this exact format:
{
  "name": "",
  "fatherName": "",
  "dateOfBirth": "",
  "aadharNumber": "",
  "address": "",
  "gender": ""
}`

    try {
      const geminiResponse = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          contents: [
            {
              parts: [
                {
                  text: parsingPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 0.95,
            maxOutputTokens: 500
          }
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      )

      console.log('✅ Gemini API Response received')

      let parsedData = {
        name: '',
        fatherName: '',
        dateOfBirth: '',
        aadharNumber: '',
        address: '',
        gender: ''
      }

      if (geminiResponse.data.candidates && geminiResponse.data.candidates[0]) {
        const candidate = geminiResponse.data.candidates[0]
        if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
          const responseText = candidate.content.parts[0].text

          // Extract JSON from response (in case there's extra text)
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            try {
              parsedData = JSON.parse(jsonMatch[0])
            } catch (jsonError) {
              console.warn('⚠️ Could not parse Gemini response as JSON:', responseText)
              parsedData = parseAadharDataFallback(extractedText)
            }
          } else {
            parsedData = parseAadharDataFallback(extractedText)
          }
        }
      }

      console.log('✅ Parsed data:', parsedData)

      // Check if we extracted any meaningful data
      const hasData = Object.values(parsedData).some(value => value && value.trim() !== '')

      return res.json({
        success: hasData,
        extractedData: parsedData,
        rawText: extractedText || '',
        message: hasData
          ? 'Data extracted successfully using Tesseract OCR!'
          : 'Could not automatically extract information. Please enter details manually.'
      })
    } catch (geminiError) {
      console.error('❌ Gemini API Error:', geminiError.response?.data || geminiError.message)

      // Fallback to local parsing if Gemini fails
      const fallbackData = parseAadharDataFallback(extractedText)
      const hasData = Object.values(fallbackData).some(value => value && value.trim() !== '')

      return res.json({
        success: hasData,
        extractedData: fallbackData,
        rawText: extractedText || '',
        message: hasData
          ? 'Data extracted with fallback method'
          : 'Could not automatically extract information. Please enter details manually.'
      })
    }
  } catch (error) {
    console.error('Extraction error:', error)

    let errorMessage = 'An error occurred during data extraction.'

    if (error.response) {
      const status = error.response.status
      const errorData = error.response.data

      errorMessage = `API Error (${status}): ${errorData?.message || error.response.statusText}`

      return res.status(status).json({
        success: false,
        error: errorMessage,
        extractedData: {},
        details: errorData
      })
    } else if (error.request) {
      errorMessage = 'Network error: Could not connect to the service.'
      return res.status(503).json({
        success: false,
        error: errorMessage,
        extractedData: {}
      })
    } else {
      errorMessage = error.message || 'Unknown error occurred'
      return res.status(500).json({
        success: false,
        error: errorMessage,
        extractedData: {}
      })
    }
  }
})

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Jan Sahayak Server is running' })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Jan Sahayak Server running on http://localhost:${PORT}`)
  console.log(`📝 API endpoint: http://localhost:${PORT}/api/extract-aadhar`)
})
