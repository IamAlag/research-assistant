// Quick test to verify the chat SSE endpoint works end-to-end
const http = require('http');

const postData = JSON.stringify({ message: 'Summarize the document', sessionId: 'test-session' });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  },
  timeout: 30000,
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  let data = '';
  res.on('data', (chunk) => {
    data += chunk.toString();
    // Print each SSE event as it arrives
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'thinking') {
            console.log(`[${event.data.status}] ${event.data.title}: ${event.data.description}`);
          } else if (event.type === 'content') {
            process.stdout.write('.');
          } else if (event.type === 'done') {
            console.log('\n✓ Done');
          } else if (event.type === 'error') {
            console.log(`\n✗ Error: ${event.data.message}`);
          } else {
            console.log(`[${event.type}]`);
          }
        } catch {}
      }
    }
  });
  res.on('end', () => {
    console.log('\nStream ended successfully');
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error(`Request error: ${e.message}`);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Request timed out');
  req.destroy();
  process.exit(1);
});

req.write(postData);
req.end();
