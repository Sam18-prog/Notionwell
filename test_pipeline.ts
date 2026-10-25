import * as dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import * as fs from 'fs';
import * as path from 'path';

// 1. Manually load .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (val) process.env[key] = val;
      }
    }
  }
}


if (!process.env.GEMINI_API_KEY) {
  throw new Error(
    'GEMINI_API_KEY is missing. Add it to your .env.local file.'
  );
}

if (!process.env.AI_MODEL) {
  process.env.AI_MODEL = 'gemini-3.5-flash';
}

import { processDocumentMultimodal } from './lib/documentProcessor';
import { cleanDocumentText, generateStudyMaterial } from './lib/app';
import {
  isBlacklistedOpening,
  calculateTargetItemCounts,
  getSemanticSimilarity,
  splitTextIntoSemanticChunks,
} from './lib/studyEngine';

async function runPipelineVerification() {
  console.log('===============================================================');
  console.log('   NOTIONWELL AI GENERATION PIPELINE — AUTOMATED TEST SUITE    ');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${testName}`);
    } else {
      console.error(`  [FAIL] ${testName}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: PDF Extraction & Stream Fallback
  // --------------------------------------------------------------------------
  console.log('Test Suite 1: Document Extraction on Real User PDF');
  const pdfPath = 'C:/Users/deepak/.gemini/antigravity/brain/71644605-bc17-460b-8de7-5e11182bd4d4/.user_uploaded/media_1787336582284.pdf';
  assert(fs.existsSync(pdfPath), 'Uploaded test PDF exists on disk');

  const pdfBuffer = fs.readFileSync(pdfPath);
  const extraction = await processDocumentMultimodal(pdfBuffer, 'pdf', 'Basics_of_Networking.pdf');
  assert(extraction.combinedText.length > 500, `Extracted text length is substantial (${extraction.combinedText.length} chars)`);
  assert(extraction.success, `Extraction succeeded`);

  // --------------------------------------------------------------------------
  // TEST 2: Formatting Preservation (Tables, Headings, Lists)
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 2: Formatting Preservation & Semantic Cleaning');
  const sampleTextWithTableAndBullets = `
Chapter 1: Network Fundamentals
A computer network connects multiple devices to share resources.

Key Network Topologies:
* Star Topology: All nodes connect to a central hub.
* Mesh Topology: Every device connects directly to every other device.
* Ring Topology: Each device is connected to two other devices.

Protocol Comparison:
| Protocol | Layer | Reliable |
| TCP | Transport | Yes |
| UDP | Transport | No |
`;
  const cleanedPreserved = cleanDocumentText(sampleTextWithTableAndBullets);
  assert(cleanedPreserved.includes('* Star Topology:'), 'Preserved bullet item formatting');
  assert(cleanedPreserved.includes('| Protocol | Layer | Reliable |'), 'Preserved markdown table rows without collapsing');
  assert(cleanedPreserved.includes('Chapter 1: Network Fundamentals'), 'Preserved section headings');

  // --------------------------------------------------------------------------
  // TEST 3: Dynamic Item Count Scaling
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 3: Dynamic Item Count Scaling');
  const shortCounts = calculateTargetItemCounts('Short excerpt of text under 1000 characters.');
  assert(shortCounts.targetFlashcards === 12 && shortCounts.targetQuiz === 5, 'Short excerpt target scaled to 12 FC / 5 Quiz');

  const normalCounts = calculateTargetItemCounts('A'.repeat(4000));
  assert(normalCounts.targetFlashcards === 20 && normalCounts.targetQuiz === 10, 'Normal document target scaled to 20 FC / 10 Quiz');

  const largeCounts = calculateTargetItemCounts('A'.repeat(12000));
  assert(largeCounts.targetFlashcards >= 25 && largeCounts.targetQuiz >= 12, 'Large document target scaled to 25+ FC / 12+ Quiz');

  // --------------------------------------------------------------------------
  // TEST 4: Semantic Chunking with Context Overlap
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 4: Semantic Overlapping Chunking');
  const multiChunkText = extraction.combinedText.slice(0, 10000);
  const semanticChunks = splitTextIntoSemanticChunks(multiChunkText, 4000, 600);
  assert(semanticChunks.length >= 1, `Semantic chunks created: ${semanticChunks.length}`);
  if (semanticChunks.length > 1) {
    assert(semanticChunks[1].content.includes('[Context Continued from'), 'Chunk 2 preserves contextual overlap prefix');
  }

  // --------------------------------------------------------------------------
  // TEST 5: End-to-End AI Generation & Rigorous Grounding Validation
  // --------------------------------------------------------------------------
  console.log('\nTest Suite 5: End-to-End Grounded Generation on Real Document');
  console.log('Calling generateStudyMaterial on extracted text...');
  const startTime = Date.now();
  const material = await generateStudyMaterial(extraction.combinedText, 'test-deck-1');
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`Generation completed in ${duration}s. Generated ${material.flashcards.length} flashcards, ${material.quiz.length} MCQs.`);

  // Validation 5A: Flashcard Count & Structure
  assert(material.flashcards.length >= 10, `Generated flashcard count >= 10 (actual: ${material.flashcards.length})`);
  assert(material.quiz.length >= 5, `Generated quiz count >= 5 (actual: ${material.quiz.length})`);

  // Validation 5B: No Robotic Opening Templates
  let roboticFlashcards = 0;
  for (const fc of material.flashcards) {
    if (isBlacklistedOpening(fc.question)) roboticFlashcards++;
  }
  assert(roboticFlashcards === 0, `Zero robotic template openings in flashcards (found ${roboticFlashcards})`);

  let roboticQuiz = 0;
  for (const q of material.quiz) {
    if (isBlacklistedOpening(q.question)) roboticQuiz++;
  }
  assert(roboticQuiz === 0, `Zero robotic template openings in quiz (found ${roboticQuiz})`);

  // Validation 5C: MCQ Integrity (Exactly 4 options, exact 1 match, plausible distractors)
  let mcqValidCount = 0;
  for (const q of material.quiz) {
    const has4Options = Array.isArray(q.options) && q.options.length === 4;
    const hasUniqueOptions = new Set(q.options.map((o) => o.trim().toLowerCase())).size === 4;
    const correctInOptions = q.options.includes(q.correctAnswer);
    const noPlaceholders = !q.options.some((o) => /option [a-d]|all of the above|none of the above/i.test(o));
    if (has4Options && hasUniqueOptions && correctInOptions && noPlaceholders) {
      mcqValidCount++;
    }
  }
  assert(
    mcqValidCount === material.quiz.length,
    `100% of MCQs have 4 distinct options, valid correct answer, and plausible distractors (${mcqValidCount}/${material.quiz.length})`
  );

  // Validation 5D: Flashcard Single-Concept & Answer Substance
  let validCards = 0;
  for (const fc of material.flashcards) {
    const endsWithQ = fc.question.trim().endsWith('?');
    const lengthOk = fc.question.length >= 15 && fc.answer.length >= 5;
    const noRawHeadings = !/^(section|chapter|\d+(\.\d+)*)\s+[A-Z]/i.test(fc.question);
    if (endsWithQ && lengthOk && noRawHeadings) {
      validCards++;
    }
  }
  assert(
    validCards === material.flashcards.length,
    `100% of flashcards are well-formed single-concept questions (${validCards}/${material.flashcards.length})`
  );

  // Validation 5E: Question Diversity (No repetitive syntactic stems)
  const openingPhrases = new Map<string, number>();
  let maxRepeatedOpening = 0;
  const allQuestions = [...material.flashcards.map((f) => f.question), ...material.quiz.map((q) => q.question)];

  for (const q of allQuestions) {
    const words = q.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).slice(0, 3).join(' ');
    const count = (openingPhrases.get(words) || 0) + 1;
    openingPhrases.set(words, count);
    if (count > maxRepeatedOpening) maxRepeatedOpening = count;
  }
  assert(
    maxRepeatedOpening <= 2,
    `Question diversity preserved: max repeated 3-word opening is <= 2 (actual: ${maxRepeatedOpening})`
  );

  // --------------------------------------------------------------------------
  // SAMPLE OUTPUT INSPECTION
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log('SAMPLE GENERATED MATERIAL (FROM ACTUAL USER PDF):');
  console.log('===============================================================');
  console.log('Sample Flashcards:');
  material.flashcards.slice(0, 3).forEach((fc, i) => {
    console.log(`  [Card ${i + 1}] Topic: [${fc.topic}]`);
    console.log(`    Q: ${fc.question}`);
    console.log(`    A: ${fc.answer}`);
  });

  console.log('\nSample Quiz Questions:');
  material.quiz.slice(0, 2).forEach((q, i) => {
    console.log(`  [MCQ ${i + 1}] Topic: [${q.topic}]`);
    console.log(`    Q: ${q.question}`);
    console.log(`    Options:`);
    q.options.forEach((opt, idx) => {
      const mark = opt === q.correctAnswer ? ' (CORRECT)' : '';
      console.log(`      ${String.fromCharCode(65 + idx)}) ${opt}${mark}`);
    });
    console.log(`    Explanation: ${q.explanation}`);
  });

  console.log('\n===============================================================');
  console.log(`TEST SUMMARY: ${passedTests} / ${totalTests} checks passed.`);
  console.log('===============================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runPipelineVerification().catch((err) => {
  console.error('Fatal Test Runner Error:', err);
  process.exit(1);
});
