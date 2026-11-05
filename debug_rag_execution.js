const fs = require('fs');
const pdfParse = require('pdf-parse');

// Load environment variables manually
const env = fs.readFileSync('.env.local', 'utf8');
env.split(/\r?\n/).forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

async function runDiagnosis() {
  console.log('=== STEP 1: PDF EXTRACTION ===');
  const buf = fs.readFileSync('test-docs/sample pdf a smaller.pdf');
  const pdfData = await pdfParse(buf);
  console.log('PDF text length:', pdfData.text.length);
  const hasML = pdfData.text.includes('Machine Learning');
  console.log('Has "Machine Learning" in raw text?:', hasML);

  console.log('\n=== STEP 2: CHUNKING ===');
  // Import chunker from ts
  // We can require transpiled or use the chunker logic
  const { chunkDocumentText } = require('./lib/rag/chunker.ts');
}

// Since chunker.ts is TypeScript, let's use next/dist or write a ts-node/runner
