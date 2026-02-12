# API Documentation - Jan Sahayak with Tesseract OCR

## Overview

Jan Sahayak backend provides REST APIs for document extraction and health monitoring. All document processing uses local Tesseract OCR (no external OCR API required).

**Base URL**: `http://localhost:5000`

---

## Endpoints

### 1. Health Check Endpoint

**Request:**
```http
GET /api/health
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "message": "Jan Sahayak Server is running"
}
```

**Usage:**
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# PowerShell
Invoke-WebRequest http://localhost:5000/api/health | Select-Object StatusCode
```

---

### 2. Aadhar Extraction Endpoint (Tesseract OCR)

**Request:**
```http
POST /api/extract-aadhar
Content-Type: multipart/form-data

file: [image_file]
```

**Parameters:**
| Name | Type | Required | Description |
|------|------|----------|-------------|
| file | File | Yes | Image file (PNG, JPG, or PDF) |

**Supported Formats:**
- PNG (.png)
- JPEG (.jpg, .jpeg)
- PDF (.pdf)

**File Size Limit:**
- Maximum 10MB

**Response (200 OK - Success):**
```json
{
  "success": true,
  "extractedData": {
    "name": "JOHN DOE",
    "fatherName": "JANE DOE",
    "dateOfBirth": "01/01/1990",
    "aadharNumber": "1234 5678 9012",
    "gender": "Male",
    "address": "123 Main Street, City, State 12345"
  },
  "rawText": "[full OCR extracted text from image]",
  "message": "Data extracted successfully using Tesseract OCR!"
}
```

**Response (200 OK - Partial Success):**
```json
{
  "success": false,
  "extractedData": {
    "name": "JOHN DOE",
    "fatherName": "",
    "dateOfBirth": "01/01/1990",
    "aadharNumber": "",
    "gender": "",
    "address": ""
  },
  "rawText": "[full OCR extracted text]",
  "message": "Could not automatically extract information. Please enter details manually."
}
```

**Response (400 Bad Request):**
```json
{
  "error": "Image processing failed: [specific error]. Please ensure the file is a valid image (PNG, JPG, or PDF).",
  "extractedData": {},
  "success": false,
  "message": "Please submit a clear, valid image file."
}
```

**Response (500 Server Error):**
```json
{
  "success": false,
  "error": "Gemini API Key not configured",
  "extractedData": {}
}
```

---

## Implementation Examples

### cURL (Command Line)

**Basic Request:**
```bash
curl -X POST http://localhost:5000/api/extract-aadhar \
  -F "file=@/path/to/aadhar.png"
```

**With Output Formatting:**
```bash
curl -X POST http://localhost:5000/api/extract-aadhar \
  -F "file=@aadhar.jpg" \
  -H "Accept: application/json" | jq .
```

---

### JavaScript/Node.js

**Fetch API (Frontend):**
```javascript
const fileInput = document.querySelector('input[type="file"]');
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:5000/api/extract-aadhar', {
  method: 'POST',
  body: formData
  // Note: Don't set Content-Type header, browser sets it with boundary
});

const result = await response.json();
console.log('Extracted Data:', result.extractedData);
console.log('Raw Text:', result.rawText);
console.log('Success:', result.success);
```

**Axios (Backend/Node.js):**
```javascript
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const formData = new FormData();
formData.append('file', fs.createReadStream('/path/to/aadhar.png'));

const response = await axios.post(
  'http://localhost:5000/api/extract-aadhar',
  formData,
  {
    headers: formData.getHeaders(),
    timeout: 60000 // OCR can take time
  }
);

console.log(response.data);
```

---

### Python

**Using requests library:**
```python
import requests

with open('aadhar.png', 'rb') as f:
    files = {'file': f}
    response = requests.post(
        'http://localhost:5000/api/extract-aadhar',
        files=files,
        timeout=60
    )

data = response.json()
print(f"Name: {data['extractedData']['name']}")
print(f"DOB: {data['extractedData']['dateOfBirth']}")
```

---

### PowerShell

**Simple Upload:**
```powershell
$filePath = "C:\Users\YourName\Documents\aadhar.jpg"
$uri = "http://localhost:5000/api/extract-aadhar"

$response = Invoke-WebRequest -Uri $uri `
  -Method Post `
  -InFile $filePath `
  -ContentType "image/jpeg"

$data = $response.Content | ConvertFrom-Json
Write-Host "Name: $($data.extractedData.name)"
Write-Host "Aadhar: $($data.extractedData.aadharNumber)"
```

---

## Response Fields Explanation

| Field | Type | Description |
|-------|------|-------------|
| success | Boolean | Whether data was successfully extracted |
| extractedData | Object | Structured data extracted from document |
| extractedData.name | String | Full name of the person |
| extractedData.fatherName | String | Father's or parent's name |
| extractedData.dateOfBirth | String | DOB in DD/MM/YYYY format |
| extractedData.aadharNumber | String | 12-digit Aadhar number with spaces |
| extractedData.gender | String | Male, Female, or empty |
| extractedData.address | String | Complete residential address |
| rawText | String | Full text extracted by Tesseract OCR |
| message | String | Human-readable status message |
| error | String | Error description (if applicable) |

---

## Processing Flow

```
1. User uploads file
   ↓
2. Validation:
   - File exists?
   - File type allowed?
   - File size < 10MB?
   ↓
3. Tesseract OCR:
   - Extract text from image (LOCAL)
   - Progress: 0% → 100%
   ↓
4. Gemini Parsing (if available):
   - Attempt to structure extracted text
   - If fails or quota exceeded → use fallback
   ↓
5. Fallback Regex Parsing:
   - Extract data using regex patterns
   - Returns whatever possible
   ↓
6. Response:
   - success: true if any data extracted
   - extractedData: populated fields
   - rawText: full OCR text
```

---

## Error Scenarios

### Scenario 1: Invalid File Format

**Request:**
```bash
curl -X POST http://localhost:5000/api/extract-aadhar -F "file=@document.docx"
```

**Response (400):**
```json
{
  "error": "Invalid file type. Only PNG, JPG, and PDF are allowed.",
  "extractedData": {}
}
```

### Scenario 2: Corrupted Image File

**Request:**
```bash
curl -X POST http://localhost:5000/api/extract-aadhar -F "file=@corrupted.png"
```

**Response (400):**
```json
{
  "error": "Image processing failed: Error attempting to read image. Please ensure the file is a valid image (PNG, JPG, or PDF).",
  "extractedData": {},
  "message": "Please submit a clear, valid image file."
}
```

### Scenario 3: No Gemini API Key

**Response (500):**
```json
{
  "success": false,
  "error": "Gemini API Key not configured",
  "extractedData": {}
}
```

### Scenario 4: Gemini Quota Exceeded

**Response (200 - Still Works!):**
```json
{
  "success": true,
  "extractedData": {
    "name": "JOHN DOE",
    "fatherName": "",
    "dateOfBirth": "01/01/1990",
    "aadharNumber": "",
    "gender": "",
    "address": ""
  },
  "rawText": "[OCR text]",
  "message": "Data extracted with fallback method"
}
```

*OCR still works; Gemini parsing falls back to regex*

---

## Performance Metrics

| Operation | Time | Notes |
|-----------|------|-------|
| File validation | <100ms | Quick checks |
| Tesseract OCR | 5-15s | Depends on image complexity |
| Gemini parsing | 2-5s | API call |
| Fallback parsing | <100ms | Local regex |
| **Total** | **7-20s** | Usually 10-15s |

---

## Rate Limiting

**Backend:** No rate limiting implemented

**Gemini API:** 
- Free tier: ~1500 daily quota
- Paid tier: Higher limits
- Rate: 15 requests/minute typical

---

## Security Considerations

✅ **What's Secure:**
- Images processed locally (Tesseract.js)
- No image storage on server
- No external OCR API calls
- Images never leave your system for OCR

⚠️ **What Uses External API:**
- Gemini parsing (text sent to Google)
- Only extracted text, not images

🔐 **Recommendations:**
- Use HTTPS in production
- Implement auth for file uploads
- Validate API keys
- Monitor Gemini API usage
- Use request size limits (10MB default)

---

## Debugging

### Enable Detailed Logging

**Check Backend Console:**
```
📤 Starting extraction process with Tesseract OCR...
File info: { name: 'aadhar.png', size: 192377, type: 'image/png' }
🔍 Step 1: Running Tesseract OCR on image...
  OCR Progress: 0%
  OCR Progress: 25%
  OCR Progress: 50%
  OCR Progress: 75%
  OCR Progress: 100%
✅ Tesseract OCR completed
📝 Extracted text length: 372
🤖 Step 2: Using Gemini to parse and structure the extracted data...
✅ Gemini API Response received
✅ Parsed data: {...}
```

### Test with Different Files

```bash
# Test with high-quality image
curl -X POST http://localhost:5000/api/extract-aadhar \
  -F "file=@clear_aadhar.jpg"

# Test with noisy image  
curl -X POST http://localhost:5000/api/extract-aadhar \
  -F "file=@grainy_aadhar.png"

# Check raw OCR output
# Look at "rawText" field in response
```

---

## FAQ

**Q: Why does OCR take 10+ seconds?**
A: Tesseract uses machine learning. First run downloads model (~100MB), subsequent runs are faster.

**Q: Can I process offline?**
A: Yes! OCR works completely offline. Parsing is optional (fallback works).

**Q: What if Gemini fails?**
A: Fallback regex parser extracts basic fields automatically. User can enter missing data.

**Q: How accurate is the OCR?**
A: Depends on image quality. Clear documents: 95%+. Blurry: 60-80%.

**Q: Can I add more languages?**
A: Yes, modify Tesseract config: `'eng'` → `'eng+hin+hin'` etc.

**Q: Why no image storage?**
A: Privacy & security. Images processed in memory, never persisted.

---

## Support

**Backend Running?**
```bash
curl http://localhost:5000/api/health
```

**Need More Info?**
- Check `server/server.js` for implementation
- Review console logs for details
- Test with `test-tesseract.js` script

---

*API Documentation v1.0*  
*Last Updated: Today*  
*Framework: Express.js*  
*OCR Engine: Tesseract.js (Local)*
