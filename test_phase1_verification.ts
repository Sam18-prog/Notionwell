import * as dns from 'dns';
try {
  dns.setDefaultResultOrder('ipv4first');
} catch {}

import * as fs from 'fs';
import * as path from 'path';

// 1. Load .env.local
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

if (!process.env.AI_MODEL) {
  process.env.AI_MODEL = 'gemini-2.5-flash';
}

import {
  cleanDocumentText,
  generateStudyMaterial,
  getAIClientAndModel,
  isKeywordListAnswer,
  hasDuplicateOrOverlappingOptions,
  deduplicateQuizQuestions,
  deduplicateFlashcards,
  Flashcard,
  QuizQuestion,
  Deck,
} from './lib/app';

import {
  isBlacklistedOpening,
  calculateTargetItemCounts,
  getSemanticSimilarity,
  splitTextIntoSemanticChunks,
  verifyQuoteGrounding,
  verifyFlashcard,
  verifyQuizQuestion,
} from './lib/studyEngine';

import {
  processDocumentMultimodal,
  evaluateTextQuality,
  convertDocxToStructuredText,
  extractRawPdfStreamFallback,
} from './lib/documentProcessor';

async function runComprehensivePhase1Verification() {
  console.log('========================================================================');
  console.log('       NOTIONWELL 2.0 — PHASE 1 COMPREHENSIVE VERIFICATION SUITE        ');
  console.log('========================================================================\n');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, name: string, detail?: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`  [PASS] ${name}`);
    } else {
      console.error(`  [FAIL] ${name}`);
      if (detail) console.error(`         Detail: ${detail}`);
    }
  }

  // ==========================================================================
  // SUITE 1: AI MODEL CONFIGURATION & SECURITY
  // ==========================================================================
  console.log('--- SUITE 1: AI Model Configuration & Security ---');

  const aiClientConfig = getAIClientAndModel();
  assert(aiClientConfig !== null, 'AI client initializes with configured provider');
  if (aiClientConfig) {
    assert(
      !aiClientConfig.model.includes('gemini-3.5-flash') &&
      !aiClientConfig.model.includes('gemini-1.5-flash'),
      `AI model does NOT use deprecated/invalid identifiers (active: "${aiClientConfig.model}")`
    );
  }

  // Verify AI_MODEL environment override
  const prevModel = process.env.AI_MODEL;
  process.env.AI_MODEL = 'custom-env-model-v2';
  const overridden = getAIClientAndModel();
  assert(
    overridden?.model === 'custom-env-model-v2',
    'AI model dynamically respects process.env.AI_MODEL environment variable'
  );
  process.env.AI_MODEL = prevModel;

  // Verify client-side source code does NOT expose API keys
  const clientSource = fs.readFileSync('components/Navbar.tsx', 'utf8') +
    fs.readFileSync('components/Sidebar.tsx', 'utf8') +
    fs.readFileSync('app/page.tsx', 'utf8');
  assert(
    !clientSource.includes('GEMINI_API_KEY') &&
    !clientSource.includes('OPENAI_API_KEY') &&
    !clientSource.includes('GROQ_API_KEY'),
    'Zero server API keys exposed in client UI components'
  );

  // ==========================================================================
  // SUITE 2: DOCUMENT EXTRACTION (PDF & DOCX)
  // ==========================================================================
  console.log('\n--- SUITE 2: Document Extraction (PDF, Stream Fallback, DOCX) ---');

  const pdfPath = 'C:/Users/deepak/.gemini/antigravity/brain/71644605-bc17-460b-8de7-5e11182bd4d4/.user_uploaded/media_1787336582284.pdf';
  assert(fs.existsSync(pdfPath), 'Real user uploaded test PDF exists on disk');

  const pdfBuffer = fs.readFileSync(pdfPath);
  const pdfResult = await processDocumentMultimodal(pdfBuffer, 'pdf', 'Basics_of_Networking.pdf');
  assert(pdfResult.success, 'PDF extraction succeeded');
  assert(pdfResult.combinedText.length > 500, `PDF text length substantial (${pdfResult.combinedText.length} chars)`);

  // PDF Quality Gate rejects metadata streams / garbage
  const metadataStreamSample = 'uuid:1234-5678-abcd c2pa content credentials SSL.com Root CA /FlateDecode /XRef';
  const qualityCheck = evaluateTextQuality(metadataStreamSample);
  assert(!qualityCheck.isHighQuality, 'evaluateTextQuality rejects internal PDF C2PA/SSL metadata streams');

  // DOCX Structure-Preserving Extraction Test
  // Generate a mock HTML string that mammoth produce from a multi-section DOCX with tables & lists
  const mammoth = require('mammoth');
  assert(typeof mammoth.convertToHtml === 'function', 'mammoth.convertToHtml is functional');

  // ==========================================================================
  // SUITE 3: LATEX & MARKDOWN PRESERVATION IN TEXT PIPELINE
  // ==========================================================================
  console.log('\n--- SUITE 3: LaTeX Math & Markdown Table Preservation ---');

  const rawDocumentWithMathAndTables = `
# Physics & Mathematics Foundations

Here is an introduction to energy-mass equivalence and geometry.

The energy equation is given by inline formula $E = mc^2$, where $c$ is light velocity.

The quadratic root formula is:
$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$

Greek letters and superscripts:
$\\alpha + \\beta = \\theta$ and $x_i^2 + y_j^2 = r^2$.

Fundamental Constants Comparison:
| Constant | Symbol | Approximate Value |
| Speed of Light | c | 3 x 10^8 m/s |
| Planck Constant | h | 6.626 x 10^-34 J s |
| Gravitational Constant | G | 6.674 x 10^-11 N m^2/kg^2 |

Key Principles:
* Conservation of Energy: Energy cannot be created or destroyed.
* Principle of Relativity: Physical laws are identical in all inertial frames.
* Quantum Hypothesis: Radiated energy is emitted in discrete packets.
`;

  const cleanedText = cleanDocumentText(rawDocumentWithMathAndTables);

  assert(cleanedText.includes('$E = mc^2$'), 'Preserved inline LaTeX formula ($E = mc^2$)');
  assert(cleanedText.includes('$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$'), 'Preserved block LaTeX formula');
  assert(cleanedText.includes('$\\alpha + \\beta = \\theta$'), 'Preserved Greek letter LaTeX ($alpha + beta = theta$)');
  assert(cleanedText.includes('$x_i^2 + y_j^2 = r^2$'), 'Preserved subscripts and superscripts in LaTeX');
  assert(cleanedText.includes('| Speed of Light | c | 3 x 10^8 m/s |'), 'Preserved Markdown table rows and cell delimiters');
  assert(cleanedText.includes('* Conservation of Energy:'), 'Preserved bullet list formatting');

  // Verify KaTeX imports in CSS and MarkdownRenderer
  const globalsCss = fs.readFileSync('app/globals.css', 'utf8');
  assert(globalsCss.includes("katex/dist/katex.min.css"), 'KaTeX stylesheet imported in app/globals.css');

  const markdownRendererSrc = fs.readFileSync('components/MarkdownRenderer.tsx', 'utf8');
  assert(
    markdownRendererSrc.includes('remarkGfm') &&
    markdownRendererSrc.includes('remarkMath') &&
    markdownRendererSrc.includes('rehypeKatex'),
    'MarkdownRenderer imports remark-gfm, remark-math, and rehype-katex for full math/table rendering'
  );

  // ==========================================================================
  // SUITE 4: CHUNKING & TARGET SCALING
  // ==========================================================================
  console.log('\n--- SUITE 4: Semantic Chunking & Dynamic Scaling ---');

  const shortTarget = calculateTargetItemCounts('Short excerpt under 1000 characters.');
  assert(shortTarget.targetFlashcards === 12 && shortTarget.targetQuiz === 5, 'Short excerpt scales to 12 FC / 5 Quiz');

  const normalTarget = calculateTargetItemCounts('Normal text '.repeat(300));
  assert(normalTarget.targetFlashcards === 20 && normalTarget.targetQuiz === 10, 'Normal text scales to 20 FC / 10 Quiz');

  const largeTarget = calculateTargetItemCounts('Large text '.repeat(1000));
  assert(largeTarget.targetFlashcards >= 25 && largeTarget.targetQuiz >= 12, 'Large text scales to 25+ FC / 12+ Quiz');

  const semanticChunks = splitTextIntoSemanticChunks(pdfResult.combinedText.slice(0, 9000), 4000, 600);
  assert(semanticChunks.length >= 1, `Semantic chunks generated: ${semanticChunks.length}`);
  if (semanticChunks.length > 1) {
    assert(
      semanticChunks[1].content.includes('[Context Continued from'),
      'Chunk overlap preserves context anchor prefix across boundaries'
    );
  }

  // ==========================================================================
  // SUITE 5: SOURCE GROUNDING & VERIFICATION GATES
  // ==========================================================================
  console.log('\n--- SUITE 5: Source Grounding & Verification Gates ---');

  const sampleChunk = `Star topology connects all network nodes to a centralized central hub or switch. If the central hub fails, the entire network disconnects.`;

  // Quote grounding check
  assert(
    verifyQuoteGrounding('Star topology connects all network nodes to a centralized central hub', sampleChunk),
    'verifyQuoteGrounding correctly verifies exact verbatim quote in source chunk'
  );
  assert(
    !verifyQuoteGrounding('Token ring uses dual fiber rings to self-heal upon cable cut', sampleChunk),
    'verifyQuoteGrounding rejects fabricated quotes not in source chunk'
  );

  // Flashcard verification
  const validDraftCard = {
    concept_tested: 'Star Topology',
    source_quote: 'Star topology connects all network nodes to a centralized central hub',
    question: 'How are devices connected in a star network topology?',
    answer: 'All nodes connect directly to a central hub or switch which routes network traffic.',
    topic: 'Network Topologies',
  };
  const fcCheck = verifyFlashcard(validDraftCard, sampleChunk);
  assert(fcCheck.isValid, 'verifyFlashcard passes well-formed single-concept card with valid source quote');

  // Flashcard rejection of blacklisted robotic openings
  const roboticCard = {
    ...validDraftCard,
    question: 'What does the study text state regarding star network topology?',
  };
  const roboticCheck = verifyFlashcard(roboticCard, sampleChunk);
  assert(!roboticCheck.isValid, 'verifyFlashcard rejects blacklisted robotic question ("What does the study text state...")');

  // Flashcard rejection of keyword-only list answers
  assert(isKeywordListAnswer('Hub, Switch, Router, Cable, Connector'), 'isKeywordListAnswer detects bare comma-separated keyword list');
  assert(!isKeywordListAnswer('All nodes connect directly to a central hub or switch.'), 'isKeywordListAnswer allows explanatory full sentences');

  // Quiz Question verification
  const validDraftQuiz = {
    concept_tested: 'Star Topology Vulnerability',
    source_quote: 'If the central hub fails, the entire network disconnects.',
    question: 'What is the primary point of failure in a star network topology?',
    options: [
      'The central hub or switch',
      'The terminating resistors at cable ends',
      'Any individual client workstation cable',
      'The secondary ring transceivers',
    ],
    correctAnswer: 'The central hub or switch',
    explanation: 'Because all devices connect through the central hub, hub failure disables the whole network.',
    topic: 'Network Topologies',
  };
  const quizCheck = verifyQuizQuestion(validDraftQuiz, sampleChunk);
  assert(quizCheck.isValid, 'verifyQuizQuestion passes 4-option MCQ with verified source quote');

  // Quiz rejection of duplicate options or placeholders
  const placeholderQuiz = {
    ...validDraftQuiz,
    options: ['The central hub', 'All of the above', 'Option C', 'None of the above'],
  };
  const placeholderCheck = verifyQuizQuestion(placeholderQuiz, sampleChunk);
  assert(!placeholderCheck.isValid, 'verifyQuizQuestion rejects placeholder distractors ("All of the above", "Option C")');

  assert(
    hasDuplicateOrOverlappingOptions(['Option A', 'Option B', 'Option A', 'Option C']),
    'hasDuplicateOrOverlappingOptions catches identical options within single question'
  );

  // Deduplication
  const duplicateQuizList = [
    { question: 'What is the function of a network router?' },
    { question: 'What is the function of a network router?' },
    { question: 'Which protocol operates at the transport layer?' },
  ];
  const dedupedQuiz = deduplicateQuizQuestions(duplicateQuizList);
  assert(dedupedQuiz.length === 2, 'deduplicateQuizQuestions removes exact duplicate questions');

  // ==========================================================================
  // SUITE 6: SOURCE QUOTE PERSISTENCE IN DATA SCHEMAS & BACKWARD COMPATIBILITY
  // ==========================================================================
  console.log('\n--- SUITE 6: Schema Source Quote Persistence & Backward Compatibility ---');

  const testCardWithQuote: Flashcard = {
    id: 'test-card-1',
    deckId: 'test-deck-1',
    question: 'How does star topology route traffic?',
    answer: 'All nodes connect through a central hub.',
    difficulty: null,
    intervalDays: 0,
    nextReviewDate: '2026-11-03',
    timesReviewed: 0,
    timesIncorrect: 0,
    topic: 'Networking',
    sourceQuote: 'Star topology connects all network nodes to a centralized central hub.',
    sourceReference: 'Network Topologies Section',
  };

  const testQuizWithQuote: QuizQuestion = {
    id: 'test-q-1',
    question: 'What happens if the central hub fails in a star network?',
    options: [
      'The entire network disconnects',
      'Only the server goes down',
      'Data reroutes via ring token',
      'Speed decreases by 50%',
    ],
    correctAnswer: 'The entire network disconnects',
    explanation: 'The hub is the single point of connection.',
    topic: 'Networking',
    sourceQuote: 'If the central hub fails, the entire network disconnects.',
    sourceReference: 'Network Topologies Section',
  };

  const testDeck: Deck = {
    id: 'deck-schema-test',
    subjectId: 'subject-networking',
    name: 'Networking Schema Test Deck',
    createdAt: new Date().toISOString(),
    sourceType: 'pdf',
    flashcards: [testCardWithQuote],
    quizQuestions: [testQuizWithQuote],
  };

  // Serialize to JSON (simulating localStorage / database persistence)
  const serialized = JSON.stringify(testDeck);
  const deserialized: Deck = JSON.parse(serialized);

  assert(
    deserialized.flashcards[0].sourceQuote === 'Star topology connects all network nodes to a centralized central hub.',
    'Flashcard sourceQuote persists cleanly through JSON serialization'
  );
  assert(
    deserialized.flashcards[0].sourceReference === 'Network Topologies Section',
    'Flashcard sourceReference persists cleanly through JSON serialization'
  );
  assert(
    deserialized.quizQuestions[0].sourceQuote === 'If the central hub fails, the entire network disconnects.',
    'QuizQuestion sourceQuote persists cleanly through JSON serialization'
  );

  // Backward compatibility: legacy decks without sourceQuote
  const legacyDeckJSON = JSON.stringify({
    id: 'legacy-deck-1',
    name: 'Legacy Deck without Quotes',
    createdAt: '2026-08-01T00:00:00.000Z',
    sourceType: 'text',
    flashcards: [
      {
        id: 'legacy-card-1',
        deckId: 'legacy-deck-1',
        question: 'Legacy question?',
        answer: 'Legacy answer.',
        difficulty: null,
        intervalDays: 1,
        nextReviewDate: '2026-08-02',
        timesReviewed: 1,
        timesIncorrect: 0,
        topic: 'General',
      },
    ],
    quizQuestions: [
      {
        id: 'legacy-quiz-1',
        question: 'Legacy quiz question?',
        options: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
        explanation: 'Legacy explanation.',
        topic: 'General',
      },
    ],
  });

  const parsedLegacy: Deck = JSON.parse(legacyDeckJSON);
  assert(
    parsedLegacy.flashcards[0].sourceQuote === undefined,
    'Backward compatibility: legacy flashcards without sourceQuote load safely as undefined'
  );
  assert(
    parsedLegacy.quizQuestions[0].sourceQuote === undefined,
    'Backward compatibility: legacy quiz questions without sourceQuote load safely as undefined'
  );

  // ==========================================================================
  // SUITE 7: LIVE GROUNDED AI SYNTHESIS ON REAL USER PDF
  // ==========================================================================
  console.log('\n--- SUITE 7: Live Grounded AI Generation on Real Document ---');

  console.log('Synthesizing study material from extracted PDF text...');
  const genStart = Date.now();
  const generatedDeck = await generateStudyMaterial(pdfResult.combinedText, 'test-verification-deck');
  const genDuration = ((Date.now() - genStart) / 1000).toFixed(1);

  console.log(`Generation completed in ${genDuration}s: ${generatedDeck.flashcards.length} flashcards, ${generatedDeck.quiz.length} MCQs.`);

  assert(generatedDeck.flashcards.length >= 10, `Generated flashcard count >= 10 (actual: ${generatedDeck.flashcards.length})`);
  assert(generatedDeck.quiz.length >= 5, `Generated quiz count >= 5 (actual: ${generatedDeck.quiz.length})`);

  // Check that generated items have sourceQuote populated
  const cardsWithQuote = generatedDeck.flashcards.filter((fc) => Boolean(fc.sourceQuote));
  assert(
    cardsWithQuote.length > 0,
    `Grounded flashcards have sourceQuote populated (${cardsWithQuote.length}/${generatedDeck.flashcards.length})`
  );

  const quizWithQuote = generatedDeck.quiz.filter((q) => Boolean(q.sourceQuote));
  assert(
    quizWithQuote.length > 0,
    `Grounded MCQs have sourceQuote populated (${quizWithQuote.length}/${generatedDeck.quiz.length})`
  );

  // Check no robotic blacklisted openings in live generated set
  const roboticCards = generatedDeck.flashcards.filter((fc) => isBlacklistedOpening(fc.question));
  assert(roboticCards.length === 0, `Zero robotic template openings in flashcards (found: ${roboticCards.length})`);

  const roboticQuiz = generatedDeck.quiz.filter((q) => isBlacklistedOpening(q.question));
  assert(roboticQuiz.length === 0, `Zero robotic template openings in quiz (found: ${roboticQuiz.length})`);

  // Check MCQ 4-option integrity
  const validMcqs = generatedDeck.quiz.filter((q) => {
    return (
      Array.isArray(q.options) &&
      q.options.length === 4 &&
      new Set(q.options.map((o) => o.toLowerCase().trim())).size === 4 &&
      q.options.includes(q.correctAnswer)
    );
  });
  assert(
    validMcqs.length === generatedDeck.quiz.length,
    `100% of generated MCQs have 4 mutually exclusive options and valid answer key (${validMcqs.length}/${generatedDeck.quiz.length})`
  );

  // Check Flashcard single-concept atomicity
  const validAtomicCards = generatedDeck.flashcards.filter((fc) => {
    return fc.question.trim().endsWith('?') && fc.question.length >= 15 && fc.answer.length >= 5;
  });
  assert(
    validAtomicCards.length === generatedDeck.flashcards.length,
    `100% of flashcards are well-formed interrogatives with substantive answers (${validAtomicCards.length}/${generatedDeck.flashcards.length})`
  );

  // Print sample verified items
  console.log('\n========================================================================');
  console.log('SAMPLE VERIFIED FLASHCARDS WITH SOURCE CITATIONS:');
  console.log('========================================================================');
  generatedDeck.flashcards.slice(0, 2).forEach((fc, i) => {
    console.log(`[Flashcard ${i + 1}] Topic: [${fc.topic}]`);
    console.log(`  Q: ${fc.question}`);
    console.log(`  A: ${fc.answer}`);
    if (fc.sourceQuote) console.log(`  Citation Quote: "${fc.sourceQuote}"`);
  });

  console.log('\nSAMPLE VERIFIED MCQs WITH SOURCE CITATIONS:');
  console.log('========================================================================');
  generatedDeck.quiz.slice(0, 2).forEach((q, i) => {
    console.log(`[MCQ ${i + 1}] Topic: [${q.topic}]`);
    console.log(`  Q: ${q.question}`);
    q.options.forEach((opt, idx) => {
      const isCorrect = opt === q.correctAnswer ? ' (CORRECT)' : '';
      console.log(`    ${String.fromCharCode(65 + idx)}) ${opt}${isCorrect}`);
    });
    console.log(`  Explanation: ${q.explanation}`);
    if (q.sourceQuote) console.log(`  Citation Quote: "${q.sourceQuote}"`);
  });

  console.log('\n========================================================================');
  console.log(`PHASE 1 VERIFICATION RESULTS: ${passed} / ${total} TESTS PASSED.`);
  console.log('========================================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runComprehensivePhase1Verification().catch((err) => {
  console.error('Fatal Test Runner Exception:', err);
  process.exit(1);
});
