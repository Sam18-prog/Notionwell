/**
 * Notionwell — End-to-End Test Suite for AI Viva Voce Repair & Homepage Sign Up Button
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runTests() {
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING NOTIONWELL AI VIVA & SIGNUP E2E VERIFICATION`);
  console.log(`Target URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  let passed = 0;
  let failed = 0;

  function assert(condition, testName, detail = '') {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}${detail ? ` -> ${detail}` : ''}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Homepage Navigation & Hero CTA Verification
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Homepage Navigation & Hero CTA Verification ---');
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, 'GET / landing page returns HTTP 200 OK');
    const html = await res.text();

    assert(html.includes('Start Learning'), 'Hero section contains central "Start Learning" CTA button');
    assert(html.includes('href="/auth"'), 'Start Learning button navigates to /auth');
    assert(!html.includes('aria-label="Toggle Theme"') === false, 'Header preserves theme toggle button');
    assert(!html.includes('href="/create"'), 'Dashboard preview "+ New Course" button is non-interactive (no /create link)');
    assert(!html.includes('placeholder="Personal email"'), 'Personal email input field is completely removed');
    assert(!html.includes('Enrol for free'), '"Enrol for free" button inside hero form is completely removed');
    assert(!html.includes('Enrol now') && !html.includes('Enrol Now'), '"Enrol now" button in header is completely removed');
    assert(!html.includes('By submitting this form, you agree to the Notionwell'), 'Email form legal microcopy is removed');
  } catch (err) {
    assert(false, 'Homepage Navigation check', err.message);
  }

  const demoCookie = 'notionwell_demo_session=1';

  // --------------------------------------------------------------------------
  // TEST 2: AI Viva Session Initiation with Source Grounding
  // --------------------------------------------------------------------------
  console.log('\n--- 2. AI Viva Voce Session Creation & Grounding ---');
  let activeSessionId = null;
  let firstQuestion = null;

  try {
    const res = await fetch(`${BASE_URL}/api/study/viva/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': demoCookie,
      },
      body: JSON.stringify({
        topicTitle: 'Computer Networks: OSI and TCP/IP Architecture',
        vivaMode: 'comprehensive',
        difficulty: 'intermediate',
        totalQuestions: 3,
        sourceType: 'deck',
        sourceTitle: 'Computer Networks Deck',
      }),
    });

    assert(res.status === 200, `POST /api/study/viva/session returns HTTP 200 OK (got ${res.status})`);
    const data = await res.json();
    assert(data.success === true, 'Session initiation returns success: true');
    assert(Boolean(data.session?.id), `Valid session ID generated (${data.session?.id})`);
    assert(Boolean(data.firstQuestion), `Opening oral question formulated: "${data.firstQuestion?.slice(0, 70)}..."`);
    assert(data.session?.sourceType === 'deck', 'Session recorded sourceType as "deck"');
    assert(data.session?.sourceTitle === 'Computer Networks Deck', 'Session recorded sourceTitle');

    activeSessionId = data.session?.id;
    firstQuestion = data.firstQuestion;
  } catch (err) {
    assert(false, 'Viva session creation', err.message);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Question 1 Evaluation with Substantive Answer
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Question 1 Student Answer Evaluation ---');
  let followUpQ = null;

  if (activeSessionId) {
    try {
      const studentAnswer = 'The OSI reference model defines 7 distinct abstraction layers: Physical, Data Link, Network, Transport, Session, Presentation, and Application. The Transport layer provides end-to-end communication and error recovery via TCP or UDP, while the Network layer handles packet forwarding and IP routing.';
      const res = await fetch(`${BASE_URL}/api/study/viva/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': demoCookie,
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          questionIndex: 1,
          questionText: firstQuestion || 'Explain the layers of the OSI model.',
          studentResponse: studentAnswer,
          isVoice: false,
        }),
      });

      assert(res.status === 200, `POST /api/study/viva/respond returns HTTP 200 OK (got ${res.status})`);
      const data = await res.json();
      assert(data.success === true, 'Evaluation returned success: true');
      assert(typeof data.evaluation?.score === 'number' && data.evaluation.score >= 0 && data.evaluation.score <= 10, `Numeric score returned: ${data.evaluation?.score} / 10`);
      assert(['correct', 'partially_correct', 'incorrect'].includes(data.evaluation?.evaluationStatus), `Valid evaluationStatus returned: "${data.evaluation?.evaluationStatus}"`);
      assert(Boolean(data.evaluation?.feedback), `Examiner feedback present: "${data.evaluation?.feedback?.slice(0, 60)}..."`);
      assert(Array.isArray(data.evaluation?.strengths) && data.evaluation.strengths.length > 0, `Rubric strengths identified (${data.evaluation?.strengths?.length} points)`);
      assert(Array.isArray(data.evaluation?.missingPoints), 'Rubric missingPoints array returned');
      assert(Boolean(data.evaluation?.idealAnswer), `Ideal model answer provided: "${data.evaluation?.idealAnswer?.slice(0, 60)}..."`);
      assert(Boolean(data.evaluation?.followUpQuestion), `Follow-up question formulated: "${data.evaluation?.followUpQuestion?.slice(0, 60)}..."`);

      followUpQ = data.evaluation?.followUpQuestion;
    } catch (err) {
      assert(false, 'Question 1 evaluation', err.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 4: Question 2 "I Don't Know" Answer Handling
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Question 2 "I Don\'t Know" Handling ---');
  if (activeSessionId) {
    try {
      const res = await fetch(`${BASE_URL}/api/study/viva/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': demoCookie,
        },
        body: JSON.stringify({
          sessionId: activeSessionId,
          questionIndex: 2,
          questionText: followUpQ || 'Explain how TCP sliding window operates.',
          studentResponse: "I don't know the answer to this question.",
          isVoice: false,
        }),
      });

      assert(res.status === 200, `POST /api/study/viva/respond handles "I don't know" with HTTP 200 (got ${res.status})`);
      const data = await res.json();
      assert(data.success === true, 'Response evaluation succeeded without error');
      assert(data.evaluation?.score === 0, `Correctly awarded 0.0 for "I don't know" (got ${data.evaluation?.score})`);
      assert(data.evaluation?.evaluationStatus === 'incorrect', `Status is "incorrect" (got ${data.evaluation?.evaluationStatus})`);
      assert(Boolean(data.evaluation?.idealAnswer), `Model academic answer provided despite missing student answer`);
      assert(Boolean(data.evaluation?.feedback), 'Constructive examiner commentary returned');
    } catch (err) {
      assert(false, 'Question 2 "I don\'t know" test', err.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 5: Session Details Retrieval & Persistence (No Unauthorized Error)
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Session State Persistence & History Retrieval ---');
  if (activeSessionId) {
    try {
      const res = await fetch(`${BASE_URL}/api/study/viva/session/${activeSessionId}`, {
        headers: { Cookie: demoCookie },
      });
      assert(res.status === 200, `GET /api/study/viva/session/${activeSessionId} returns HTTP 200 (No "session not found or unauthorized")`);
      const data = await res.json();
      assert(data.success === true, 'Session details retrieved successfully');
      assert(data.session?.id === activeSessionId, 'Retrieved matching session ID');
      assert(Array.isArray(data.responses) && data.responses.length === 2, `Session persists both turns (${data.responses?.length} turns recorded)`);
    } catch (err) {
      assert(false, 'Session retrieval test', err.message);
    }
  }

  // --------------------------------------------------------------------------
  // TEST 6: User Viva History Endpoint
  // --------------------------------------------------------------------------
  console.log('\n--- 6. User Viva History Endpoint ---');
  try {
    const res = await fetch(`${BASE_URL}/api/study/viva/session`, {
      headers: { Cookie: demoCookie },
    });
    assert(res.status === 200, `GET /api/study/viva/session returns HTTP 200 OK (got ${res.status})`);
    const data = await res.json();
    assert(data.success === true, 'History returns success: true');
    assert(Array.isArray(data.history), `History array returned (${data.history?.length} sessions found)`);
  } catch (err) {
    assert(false, 'User history endpoint test', err.message);
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log(`\n======================================================`);
  console.log(`🏁 TEST EXECUTION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`======================================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite failed with unexpected error:', err);
  process.exit(1);
});
