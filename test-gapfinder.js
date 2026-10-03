// Real interaction test using jsdom — simulates actual clicks, DOM events, and state
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
// Append bridge to expose internal state to the test
const scriptCode = scriptMatch[1] + '\n;window.__S=()=>S;window.__C=C;window.__IDS=IDS;window.__goHome=goHome;window.__start=start;\n';

function makeDOM(html, scriptCode, storeObj) {
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://localhost/'
  });
  const win = dom.window;
  const doc = win.document;

  win.scrollTo = () => {};
  win.HTMLElement.prototype.scrollIntoView = () => {};

  // Override click to call onclick handler
  win.HTMLButtonElement.prototype.click = function() {
    if (this.onclick) this.onclick({ target: this, preventDefault() {} });
  };
  // Also override for div.brand which has onclick
  win.HTMLDivElement.prototype.click = function() {
    if (this.onclick) this.onclick({ target: this, preventDefault() {} });
  };

  Object.defineProperty(win, 'localStorage', {
    value: {
      getItem: k => storeObj[k] ?? null,
      setItem: (k, v) => { storeObj[k] = String(v); },
      removeItem: k => { delete storeObj[k]; },
      clear: () => { for (const k in storeObj) delete storeObj[k]; }
    }
  });

  win.eval(scriptCode);
  return { dom, win, doc };
}

const store = {};
const { win, doc } = makeDOM(html, scriptCode, store);

// State accessors
const S = () => win.__S();
const C = win.__C;
const IDS = win.__IDS;

const failures = [];
function assert(cond, msg) {
  if (cond) console.log('  PASS:', msg);
  else { console.log('  FAIL:', msg); failures.push(msg); }
}

function getVisibleView(d) {
  for (const v of d.querySelectorAll('.view'))
    if (!v.classList.contains('hidden')) return v.id;
  return null;
}
function clickOption(d, text) {
  for (const o of d.querySelectorAll('#opts .opt')) {
    const t = o.firstChild ? o.firstChild.textContent : o.textContent;
    if (t === text) { o.click(); return true; }
  }
  return false;
}
function getCorrect() {
  const s = S();
  const q = C[s.cur].qs[s.qi];
  const c = q.o.find(o => o.ok); return c ? c.t : null;
}
function getWrong() {
  const s = S();
  const q = C[s.cur].qs[s.qi];
  const c = q.o.find(o => !o.ok); return c ? c.t : null;
}
function answerCorrect(d) {
  const c = getCorrect();
  if (!c) return false;
  if (!clickOption(d, c)) return false;
  d.querySelector('#next').click();
  return true;
}
function answerWrong(d) {
  const c = getWrong();
  if (!c) return false;
  if (!clickOption(d, c)) return false;
  d.querySelector('#next').click();
  return true;
}

// ===== TEST 1: Home page loads =====
console.log('\n=== TEST 1: Home page loads ===');
assert(getVisibleView(doc) === 'home', 'Home view visible');
assert(doc.querySelector('#homeMap svg') !== null, 'Map SVG rendered');
assert(doc.querySelectorAll('#picks .topic-card').length === 13, '13 topic cards (topics with prereqs)');
assert(doc.querySelector('#welcomeBack .welcome-back') === null, 'No welcome-back on first visit');

// ===== TEST 2: Choose topic, answer all correctly =====
console.log('\n=== TEST 2: Answer all correctly (exponents) ===');
const expCard = Array.from(doc.querySelectorAll('#picks .topic-card'))
  .find(b => b.getAttribute('aria-label') === 'Diagnose Exponents');
expCard.click();
assert(getVisibleView(doc) === 'quiz', 'Quiz view shown');
assert(S().target === 'exponents', 'Target is exponents');

const c1 = getCorrect();
console.log('  Q1:', doc.querySelector('#qText').textContent, '->', c1);
assert(clickOption(doc, c1), 'Clicked correct Q1');
assert(S().n === 1, 'n=1');
assert(doc.querySelector('#fb').classList.contains('good'), 'Green feedback');
assert(!doc.querySelector('#next').classList.contains('hidden'), 'Next visible');
doc.querySelector('#next').click();
assert(S().qi === 1, 'Advanced to Q2');

const c2 = getCorrect();
console.log('  Q2:', doc.querySelector('#qText').textContent, '->', c2);
assert(clickOption(doc, c2), 'Clicked correct Q2');
assert(S().n === 2, 'n=2');
doc.querySelector('#next').click();
assert(getVisibleView(doc) === 'result', 'Result view shown');
assert(doc.querySelector('.result-no-gap') !== null, 'No-gap result shown');
console.log('  Result:', doc.querySelector('.result-no-gap h2').textContent);

// ===== TEST 3: Answer incorrectly, verify prereq traversal =====
console.log('\n=== TEST 3: Answer wrong, verify prereq traversal ===');
win.__goHome();
assert(getVisibleView(doc) === 'home', 'Back home');

expCard.click();
assert(S().target === 'exponents', 'Target is exponents again');

const w1 = getWrong();
console.log('  Q1 wrong:', doc.querySelector('#qText').textContent, '->', w1);
assert(clickOption(doc, w1), 'Clicked wrong Q1');
assert(S().w === 1, 'w=1');
assert(S().miss.length === 1, 'Miss recorded');
assert(doc.querySelector('#fb').classList.contains('wrong'), 'Red feedback');
const fbText = doc.querySelector('#fb .fb-body').textContent;
assert(fbText.length > 0, 'Misconception feedback non-empty');
console.log('  Feedback:', fbText.substring(0, 70));
doc.querySelector('#next').click();

const wrongAns2 = getWrong();
console.log('  Q2 wrong:', doc.querySelector('#qText').textContent, '->', wrongAns2);
assert(clickOption(doc, wrongAns2), 'Clicked wrong Q2');
assert(S().w === 2, 'w=2');
doc.querySelector('#next').click();

assert(S().results.exponents.passed === false, 'exponents failed');
assert(S().cur === 'integers', 'integers pushed to stack then popped (cur=integers)');
assert(getVisibleView(doc) === 'quiz', 'Still in quiz checking prereq');
assert(S().cur === 'integers', 'Now checking integers');
console.log('  Prereq traversal: exponents -> integers');

// Fail integers too
const w3 = getWrong();
assert(clickOption(doc, w3), 'Wrong integers Q1');
doc.querySelector('#next').click();
const w4 = getWrong();
assert(clickOption(doc, w4), 'Wrong integers Q2');
doc.querySelector('#next').click();
assert(getVisibleView(doc) === 'result', 'Result after failing both');

// ===== TEST 4: ROOT GAP detection =====
console.log('\n=== TEST 4: ROOT GAP detection ===');
const rv = doc.querySelector('#result');
assert(rv.querySelector('.result-hero') !== null, 'Gap Found hero shown');
const rootChip = rv.querySelector('.root-chip');
assert(rootChip !== null, 'Root chip exists');
assert(rootChip.textContent === 'Negative numbers', 'Root is Negative numbers');
console.log('  Root:', rootChip.textContent);

// Trace path
const tn = rv.querySelectorAll('.trace-node');
assert(tn.length === 2, '2 trace nodes');
const rootN = rv.querySelector('.trace-node.root');
assert(rootN && rootN.querySelector('.tn-name').textContent === 'Negative numbers', 'Root trace = Negative numbers');
const tgtN = rv.querySelector('.trace-node.target');
assert(tgtN && tgtN.querySelector('.tn-name').textContent === 'Exponents', 'Target trace = Exponents');
tn.forEach(n => console.log('   ', n.querySelector('.tn-tag').textContent, ':', n.querySelector('.tn-name').textContent));

// ===== TEST 5: Misconception feedback in result =====
console.log('\n=== TEST 5: Misconception feedback ===');
const mis = rv.querySelectorAll('.mis-item');
assert(mis.length >= 2, '>=2 misconception items');
mis.forEach((m, i) => {
  const t = m.querySelector('.mis-topic').textContent;
  const q = m.querySelector('.mis-q').textContent;
  const w = m.querySelector('.mis-why').textContent;
  assert(t && q && w, `Miss ${i+1} has topic, question, explanation`);
  console.log(`  Miss ${i+1}: [${t}] ${q.substring(0,30)}...`);
});

// ===== TEST 6: Lesson for root =====
console.log('\n=== TEST 6: Lesson ===');
const lc = rv.querySelectorAll('.lesson-card');
assert(lc.length === 1, '1 lesson card');
assert(lc[0].querySelector('h3').textContent === 'Negative numbers', 'Lesson = Negative numbers');
assert(lc[0].querySelector('.lc-body').textContent.length > 50, 'Lesson has body');
const rc = rv.querySelector('.recheck');
assert(rc && rc.dataset.id === 'integers', 'Recheck button targets integers');

// ===== TEST 7: Review plan =====
console.log('\n=== TEST 7: Review plan ===');
const tl = rv.querySelectorAll('.tl-item');
assert(tl.length === 4, '4 plan items');
const expectedRels = ['Today', 'Tomorrow', '3 days', 'Next week'];
tl.forEach((t, i) => {
  const day = t.querySelector('.tl-d-day').textContent;
  const rel = t.querySelector('.tl-d-rel').textContent;
  const label = t.querySelector('.tl-label').textContent;
  assert(day && label, `Plan ${i+1} has date and label`);
  assert(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test(day), `Plan ${i+1} date is strictly English format (e.g. "Sat, Oct 3"): "${day}"`);
  assert(rel === expectedRels[i], `Plan ${i+1} rel is "${expectedRels[i]}": "${rel}"`);
  console.log(`  Plan ${i+1}: ${day} (${rel}) - ${label.substring(0,40)}...`);
});

// ===== TEST 8: Timeline toggle =====
console.log('\n=== TEST 8: Timeline toggle ===');
const chk = rv.querySelectorAll('.tl-check');
assert(chk.length === 4, '4 checkboxes');
chk[0].click();
assert(chk[0].classList.contains('done'), 'Checked after click');
chk[0].click();
assert(!chk[0].classList.contains('done'), 'Unchecked after 2nd click');

// ===== TEST 9: localStorage + returning user after refresh =====
console.log('\n=== TEST 9: localStorage + refresh ===');
const saved = JSON.parse(store['gapfinder_v2']);
assert(saved !== null, 'localStorage has data');
assert(saved.target === 'exponents', 'Saved target = exponents');
assert(saved.roots.includes('integers'), 'Saved roots include integers');
assert(saved.plan.length === 4, 'Saved plan has 4 items');
console.log('  Saved roots:', saved.roots.map(r => C[r].name));

// Go home and check welcome-back
win.__goHome();
assert(doc.querySelector('#welcomeBack .welcome-back') !== null, 'Welcome-back card on home');
assert(doc.querySelector('#welcomeBack .welcome-back').textContent.includes('Negative numbers'), 'Welcome-back mentions root');
const wbDate = doc.querySelector('#welcomeBack .wb-date');
assert(wbDate !== null, 'Welcome-back has next review date');
assert(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test(wbDate.textContent), 'Welcome-back next review date is English format: ' + wbDate.textContent);

// Simulate refresh: new DOM, same store
console.log('\n=== TEST 9b: Full page refresh ===');
const refreshed = makeDOM(html, scriptCode, store);
const win2 = refreshed.win, d2 = refreshed.doc;
assert(getVisibleView(d2) === 'home', 'Home visible after refresh');
const wb2 = d2.querySelector('#welcomeBack .welcome-back');
assert(wb2 !== null, 'Welcome-back after refresh');
assert(wb2.textContent.includes('Negative numbers'), 'Welcome-back mentions root after refresh');

// Topic cards show prior status
let foundGap = false;
d2.querySelectorAll('#picks .topic-card').forEach(c => {
  const s = c.querySelector('.tc-status');
  if (s && s.classList.contains('gap')) foundGap = true;
});
assert(foundGap, 'Topic card shows "Gap found" after refresh');

function getCorrect2() {
  const s = win2.__S();
  const q = win2.__C[s.cur].qs[s.qi];
  const c = q.o.find(o => o.ok); return c ? c.t : null;
}
function getWrong2() {
  const s = win2.__S();
  const q = win2.__C[s.cur].qs[s.qi];
  const c = q.o.find(o => !o.ok); return c ? c.t : null;
}
function answerCorrect2(d) {
  const c = getCorrect2();
  if (!c) return false;
  if (!clickOption(d, c)) return false;
  d.querySelector('#next').click();
  return true;
}
function answerWrong2(d) {
  const c = getWrong2();
  if (!c) return false;
  if (!clickOption(d, c)) return false;
  d.querySelector('#next').click();
  return true;
}

// ===== TEST 10: Deep traversal (target -> twoStep -> oneStep, pass integers) =====
console.log('\n=== TEST 10: Deep prerequisite traversal ===');
win2.__goHome();
const tgtCard = Array.from(d2.querySelectorAll('#picks .topic-card'))
  .find(b => b.getAttribute('aria-label') === 'Diagnose Multi-step equations');
tgtCard.click();

// Override S/C for win2 context
const S2 = () => win2.__S();
const C2 = win2.__C;

assert(S2().target === 'target', 'Started target');

// Fail target
answerWrong2(d2);
answerWrong2(d2);
assert(S2().results.target.passed === false, 'target failed');
console.log('  Stack:', S2().stack.map(s => C2[s].name));

const passThese = new Set(['distribute', 'liketerms', 'fractions', 'integers']);
const failThese = new Set(['twoStep', 'oneStep']);

let guard = 0;
while (S2() && S2().cur && getVisibleView(d2) === 'quiz' && guard < 40) {
  guard++;
  const id = S2().cur;
  console.log(`  [${guard}] Checking: ${C2[id].name}`);
  if (failThese.has(id)) {
    answerWrong2(d2);
    if (S2() && S2().cur === id) answerWrong2(d2);
  } else {
    answerCorrect2(d2);
    if (S2() && S2().cur === id) answerCorrect2(d2);
  }
}
assert(getVisibleView(d2) === 'result', 'Reached result');
const rv2 = d2.querySelector('#result');
const chips2 = rv2.querySelectorAll('.root-chip');
console.log('  Roots:', Array.from(chips2).map(c => c.textContent));
const hasOneStep = Array.from(chips2).some(c => c.textContent === 'One-step equations');
assert(hasOneStep, 'Root gap = One-step equations');

const tn2 = rv2.querySelectorAll('.trace-node');
console.log('  Trace:');
tn2.forEach(n => console.log('   ', n.querySelector('.tn-tag').textContent, ':', n.querySelector('.tn-name').textContent));
assert(tn2.length >= 3, '>=3 trace nodes in deep traversal');

// ===== TEST 11: No-gap eyebrow styling =====
console.log('\n=== TEST 11: No-gap eyebrow ===');
win2.__goHome();
const ratioCard = Array.from(d2.querySelectorAll('#picks .topic-card'))
  .find(b => b.getAttribute('aria-label') === 'Diagnose Ratios');
ratioCard.click();
answerCorrect2(d2);
answerCorrect2(d2);
assert(getVisibleView(d2) === 'result', 'Result after correct answers');
const ng = d2.querySelector('.result-no-gap');
assert(ng !== null, 'No-gap shown');
const eb = ng.querySelector('.rh-eyebrow');
assert(eb !== null, 'Eyebrow element exists');
assert(eb.textContent === 'All clear', 'Eyebrow text = "All clear"');
const cs = win2.getComputedStyle(eb);
assert(cs.textTransform === 'uppercase', 'Eyebrow is uppercase (rh-eyebrow not scoped to .result-hero)');

// ===== TEST 12: .muted class exists =====
console.log('\n=== TEST 12: .muted class ===');
let foundMuted = false;
for (const ss of d2.styleSheets) {
  try {
    for (const rule of ss.cssRules) {
      if (rule.cssText && rule.cssText.includes('.muted')) { foundMuted = true; break; }
    }
  } catch(e) {}
}
assert(foundMuted, '.muted CSS class defined');

// ===== TEST 13: Recheck button works =====
console.log('\n=== TEST 13: Recheck button ===');
// Go back to the deep-traversal result
win2.__goHome();
// Re-run the exponents fail scenario to get a result with recheck
let expCardCopy = Array.from(d2.querySelectorAll('#picks .topic-card'))
  .find(b => b.getAttribute('aria-label') === 'Diagnose Exponents');
// Actually use the existing result from test 10 - go back
// We need to be on a result page. Let's just verify recheck from test 3's result.
// Instead, start exponents, fail it, fail integers, get result, click recheck
expCardCopy.click();
answerWrong2(d2);
answerWrong2(d2);
// Now checking integers
answerWrong2(d2);
answerWrong2(d2);
assert(getVisibleView(d2) === 'result', 'Result for recheck test');
const recheckBtn = d2.querySelector('.recheck');
assert(recheckBtn !== null, 'Recheck button exists');
const recheckTarget = recheckBtn.dataset.id;
recheckBtn.click();
assert(getVisibleView(d2) === 'quiz', 'Recheck switches to quiz');
assert(S2().target === recheckTarget, 'Recheck target matches button data-id');
console.log('  Recheck started for:', C2[recheckTarget].name);

// ===== TEST 14: Strict locale independence (Arabic environment simulation) =====
console.log('\n=== TEST 14: Strict locale independence ===');
const arabicStore = {};
const makeArabicDOM = (h, sCode, storeObj) => {
  const dom = new JSDOM(h, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'https://localhost/'
  });
  const win = dom.window;
  const doc = win.document;
  win.scrollTo = () => {};
  win.HTMLElement.prototype.scrollIntoView = () => {};
  win.HTMLButtonElement.prototype.click = function() {
    if (this.onclick) this.onclick({ target: this, preventDefault() {} });
  };
  Object.defineProperty(win.navigator, 'language', { value: 'ar-SA' });
  Object.defineProperty(win.navigator, 'languages', { value: ['ar-SA', 'ar'] });
  // Mock toLocaleDateString to return Arabic if called anywhere
  win.Date.prototype.toLocaleDateString = () => 'السبت، ٣ أكتوبر';
  Object.defineProperty(win, 'localStorage', {
    value: {
      getItem: k => storeObj[k] ?? null,
      setItem: (k, v) => { storeObj[k] = String(v); },
      removeItem: k => { delete storeObj[k]; },
      clear: () => { for (const k in storeObj) delete storeObj[k]; }
    }
  });
  win.eval(sCode);
  return { win, doc };
};

const arContext = makeArabicDOM(html, scriptCode, arabicStore);
const arExpCard = Array.from(arContext.doc.querySelectorAll('#picks .topic-card'))
  .find(b => b.getAttribute('aria-label') === 'Diagnose Exponents');
arExpCard.click();
const getArWrong = () => {
  const s = arContext.win.__S();
  const q = arContext.win.__C[s.cur].qs[s.qi];
  const c = q.o.find(o => !o.ok); return c ? c.t : null;
};
const answerArWrong = (d) => {
  const c = getArWrong();
  clickOption(d, c);
  d.querySelector('#next').click();
};
answerArWrong(arContext.doc);
answerArWrong(arContext.doc);
answerArWrong(arContext.doc);
answerArWrong(arContext.doc);
assert(getVisibleView(arContext.doc) === 'result', 'Result reached in Arabic env');

const arPlanItems = arContext.doc.querySelectorAll('.tl-item');
assert(arPlanItems.length === 4, '4 plan items in Arabic env');
arPlanItems.forEach((t, i) => {
  const day = t.querySelector('.tl-d-day').textContent;
  const rel = t.querySelector('.tl-d-rel').textContent;
  assert(/^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test(day), `Arabic env day ${i+1} is strictly English: "${day}"`);
  assert(!/[\u0600-\u06FF]/.test(day), `Arabic env day ${i+1} has no Arabic chars`);
  assert(!/[\u0600-\u06FF]/.test(rel), `Arabic env rel ${i+1} has no Arabic chars: "${rel}"`);
});

// ===== SUMMARY =====
console.log('\n=== SUMMARY ===');
if (failures.length === 0) console.log('ALL TESTS PASSED');
else { console.log(failures.length + ' FAILURES:'); failures.forEach(f => console.log('  -', f)); }
process.exit(failures.length > 0 ? 1 : 0);
