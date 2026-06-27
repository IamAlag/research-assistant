const fs = require('fs');
const path = require('path');

async function testUpload() {
  const filePath = path.join(__dirname, '..', 'test.txt');
  const fileBuffer = fs.readFileSync(filePath);
  
  const formData = new FormData();
  // Create a Blob from the file buffer
  const blob = new Blob([fileBuffer], { type: 'text/plain' });
  formData.append('files', blob, 'test.txt');

  console.log('Sending upload request to http://localhost:3000/api/upload...');
  const start = Date.now();
  
  try {
    const response = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    });
    
    const duration = Date.now() - start;
    console.log(`Response status: ${response.status} (${duration}ms)`);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Upload request failed with error:', error);
  }
}

testUpload();
