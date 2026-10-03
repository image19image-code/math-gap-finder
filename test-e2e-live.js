// Direct live HTTP test verifying the rendered UI from http://localhost:3000
const http = require('http');
const { JSDOM } = require('jsdom');

function fetchLiveHtml() {
  return new Promise((resolve, reject) => {
    http.get('http://localhost:3000/', (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ headers: res.headers, html: data }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== LIVE E2E DATE LOCALIZATION AUDIT ===');
  const { headers, html } = await fetchLiveHtml();
  console.log('1. Verifying HTTP headers from live server:');
  console.log('   Cache-Control:', headers['cache-control']);
  if (!headers['cache-control'] || !headers['cache-control'].includes('no-cache')) {
    throw new Error('Cache-control header missing no-cache');
  }

  console.log('2. Mounting live HTML with aggressive Arabic browser locale mocks:');
  const storage = {};
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://localhost/',
    beforeParse(window) {
      // Force window to simulate Arabic user environment
      Object.defineProperty(window.navigator, 'language', { value: 'ar-EG', configurable: true });
      Object.defineProperty(window.navigator, 'languages', { value: ['ar-EG', 'ar', 'en'], configurable: true });
      window.Date.prototype.toLocaleDateString = function() {
        return 'السبت، ٣ أكتوبر';
      };
      window.Date.prototype.toLocaleString = function() {
        return 'السبت، ٣ أكتوبر ٢٠٢٦';
      };
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: k => storage[k] ?? null,
          setItem: (k, v) => { storage[k] = String(v); },
          removeItem: k => { delete storage[k]; },
          clear: () => { for (const k in storage) delete storage[k]; }
        }
      });
      window.scrollTo = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
    }
  });

  const { window } = dom;
  const { document } = window;

  console.log('3. Triggering diagnosis to generate review plan:');
  const targetCard = Array.from(document.querySelectorAll('#picks .topic-card'))
    .find(c => c.getAttribute('aria-label') === 'Diagnose Exponents');
  if (!targetCard) throw new Error('Topic card not found');
  targetCard.click();

  // Fail 2 questions to trigger prereq check, then fail 2 more to complete quiz
  for (let round = 0; round < 4; round++) {
    const opts = document.querySelectorAll('#opts .opt');
    if (!opts.length) break;
    // Click wrong option
    opts[opts.length - 1].click();
    const nextBtn = document.querySelector('#next');
    if (nextBtn) nextBtn.click();
  }

  // Verify we reached results
  const resultDiv = document.querySelector('#result');
  if (resultDiv.classList.contains('hidden')) {
    throw new Error('Result view was not reached');
  }

  console.log('4. Auditing Review Plan timeline dates in rendered DOM:');
  const planItems = document.querySelectorAll('#timeline .tl-item');
  console.log(`   Found ${planItems.length} review plan items`);
  if (planItems.length !== 4) throw new Error(`Expected 4 plan items, got ${planItems.length}`);

  const expectedRels = ['Today', 'Tomorrow', '3 days', 'Next week'];
  const arabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const englishDateRegex = /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat), (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2}$/;

  planItems.forEach((item, idx) => {
    const dayEl = item.querySelector('.tl-d-day');
    const relEl = item.querySelector('.tl-d-rel');
    const dayText = dayEl ? dayEl.textContent.trim() : '';
    const relText = relEl ? relEl.textContent.trim() : '';

    console.log(`   Step ${idx + 1}: Date = "${dayText}", Relative = "${relText}"`);

    if (!englishDateRegex.test(dayText)) {
      throw new Error(`Step ${idx + 1} date "${dayText}" does NOT match expected English format "Sat, Oct 3"!`);
    }
    if (relText !== expectedRels[idx]) {
      throw new Error(`Step ${idx + 1} rel "${relText}" does NOT match expected "${expectedRels[idx]}"!`);
    }
    if (arabicRegex.test(dayText) || arabicRegex.test(relText)) {
      throw new Error(`Step ${idx + 1} contains Arabic characters!`);
    }
  });

  console.log('5. Auditing Returning-User "Next review" date on Home view:');
  // Return home to trigger renderHome() which reads localStorage and renders welcomeBack
  document.querySelector('#quit').click();
  const wbDiv = document.querySelector('#welcomeBack');
  const wbDate = wbDiv.querySelector('.wb-date');
  if (!wbDate) throw new Error('Welcome back card with wb-date not found');
  const wbDateText = wbDate.textContent.trim();
  console.log(`   Welcome Back Date = "${wbDateText}"`);

  if (!englishDateRegex.test(wbDateText)) {
    throw new Error(`Welcome back date "${wbDateText}" does NOT match expected English format "Sat, Oct 3"!`);
  }
  if (arabicRegex.test(wbDateText)) {
    throw new Error(`Welcome back date "${wbDateText}" contains Arabic characters!`);
  }

  console.log('\n=== ALL AUDITS PASSED: 100% DETERMINISTIC ENGLISH DATES CONFIRMED ===');
}

run().catch(err => {
  console.error('\nFAILED AUDIT:', err);
  process.exit(1);
});
