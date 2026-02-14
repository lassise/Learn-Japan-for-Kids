const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT_URL = 'http://127.0.0.1:4173';
const EMAIL = 'andrewlassise@gmail.com';
const CHILD_ID = 'ac98cf54-6f14-4f83-a6e3-c62270dbf7f8';
const BRANCH_ID = '6c95a2bc-c8c2-4bf8-bced-4a48c696e172';
const LESSON_ID = '3d670ba5-0ff4-4154-8e16-413d14b5745e';
const LESSON_URL = `${ROOT_URL}/lesson/${CHILD_ID}/${BRANCH_ID}/${LESSON_ID}`;
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'playtest');
const SUMMARY_PATH = path.join(ARTIFACT_DIR, 'focused-playtest-natural-wonders.json');

const parseEnv = () => {
  const env = {};
  const text = fs.readFileSync('.env.local', 'utf8');
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx > 0) env[line.slice(0, idx)] = line.slice(idx + 1);
  }
  return env;
};

const normalize = (text) => {
  if (!text) return '';
  const parts = String(text).split('\n\n');
  const mainText = parts[parts.length - 1];
  return mainText.toLowerCase().replace(/\s+/g, ' ').replace(/[?.!]$/, '').trim();
};

const waitForServer = (url, timeoutMs = 90000) => new Promise((resolve, reject) => {
  const start = Date.now();
  const ping = () => {
    const req = http.get(url, (res) => {
      res.resume();
      if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting for ${url}`));
      setTimeout(ping, 1000);
    });
    req.on('error', () => {
      if (Date.now() - start > timeoutMs) return reject(new Error(`Timed out waiting for ${url}`));
      setTimeout(ping, 1000);
    });
  };
  ping();
});

const getChildPoints = async (env, childId) => {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/child_profiles?select=id,total_points&id=eq.${childId}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
  });
  const rows = await res.json();
  return Number(rows?.[0]?.total_points || 0);
};

const getAnswerKey = async (env, lessonId) => {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/activities?select=question_text,options,type&lesson_id=eq.${lessonId}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` }
  });
  const rows = await res.json();
  const map = new Map();
  for (const row of rows || []) {
    if (!['multiple_choice', 'image_choice', 'scenario'].includes(row.type)) continue;
    const correct = (row.options || []).find((o) => o && o.is_correct);
    if (correct?.text) map.set(normalize(row.question_text), String(correct.text));
  }
  return map;
};

const generateMagicLink = async (env, email) => {
  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ type: 'magiclink', email, redirect_to: `${ROOT_URL}/` })
  });
  const payload = await res.json();
  if (!payload.action_link) throw new Error(`Missing action link: ${JSON.stringify(payload)}`);
  return payload.action_link;
};

const clickVisible = async (locator, timeout = 1200) => {
  try {
    const t = locator.first();
    await t.waitFor({ state: 'visible', timeout });
    await t.click({ timeout });
    return true;
  } catch {
    return false;
  }
};

const clickCheckAnswerForce = async (page) => {
  const btn = page.getByRole('button', { name: /Check Answer/i }).last();
  for (let i = 0; i < 10; i += 1) {
    try {
      if (await btn.isVisible({ timeout: 200 })) {
        await btn.click({ force: true });
        return true;
      }
    } catch {}
    await page.waitForTimeout(120);
  }
  return false;
};

const clickContinueLike = async (page) => {
  const names = [/Continue ->/i, /Next Activity ->/i, /Finish Lesson/i];
  for (const pattern of names) {
    if (await clickVisible(page.getByRole('button', { name: pattern }), 700)) return true;
  }
  return false;
};

const maxConsecutiveInfo = (seq) => {
  let max = 0, cur = 0;
  for (const s of seq) {
    if (s === 'info') { cur += 1; if (cur > max) max = cur; }
    else cur = 0;
  }
  return max;
};

const runTest = async ({ magicLink, answerKey }) => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  const sequence = [];
  const warnings = [];
  const consoleErrors = [];
  let hintShown = false;
  let hintNoSkipConfirmed = false;
  let firstQuestionPrompt = '';
  let answeredQuestions = 0;

  page.on('console', (msg) => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  try {
    await page.goto(magicLink, { waitUntil: 'networkidle', timeout: 120000 });
    await page.evaluate(() => localStorage.setItem('triplearn_onboarding_done', 'true'));
    await page.goto(LESSON_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await clickVisible(page.getByRole('button', { name: 'Rookie' }), 5000);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'focused-lesson-start.png'), fullPage: true });

    let lastPrompt = '';
    let stagnation = 0;

    for (let step = 0; step < 20; step += 1) {
      const completed = await page.getByText(/Mission Complete!|Lesson Complete!/i).first().isVisible().catch(() => false);
      if (completed) break;

      const prompt = ((await page.locator('h2').first().textContent().catch(() => '')) || '').trim();
      const options = page.locator('div.space-y-4 > button');
      const optionCount = await options.count();
      const isQuestion = optionCount >= 2 || (await page.locator('button[aria-label^="Map pin"]').count()) > 0 || (await page.locator('button[aria-label^="Reorder card"]').count()) > 0;

      if (isQuestion) {
        sequence.push('question');

        if (!hintShown) {
          firstQuestionPrompt = prompt;
          const hintBtn = page.getByRole('button', { name: /Need help\? Show hint|Hint shown/i });
          await hintBtn.first().waitFor({ timeout: 14000 }).catch(() => undefined);
          if (await hintBtn.first().isVisible().catch(() => false)) {
            await hintBtn.first().click();
            hintShown = true;
            await page.waitForTimeout(300);
            const hintVisible = await page.locator('text=/Hint:/').first().isVisible().catch(() => false);
            const afterHintPrompt = ((await page.locator('h2').first().textContent().catch(() => '')) || '').trim();
            hintNoSkipConfirmed = hintVisible && afterHintPrompt === firstQuestionPrompt;
          }
        }

        if (optionCount >= 2) {
          const expected = answerKey.get(normalize(prompt)) || '';
          let selected = false;
          for (let i = 0; i < optionCount; i += 1) {
            const btn = options.nth(i);
            const text = ((await btn.textContent().catch(() => '')) || '').trim();
            if (expected && text.toLowerCase().includes(expected.toLowerCase())) {
              await btn.click();
              selected = true;
              break;
            }
          }
          if (!selected) {
            warnings.push(`No answer match for: ${prompt}`);
            await options.first().click();
          }

          const submitted = await clickCheckAnswerForce(page);
          if (!submitted) warnings.push(`Could not click Check Answer for: ${prompt}`);
          else answeredQuestions += 1;

          await page.waitForTimeout(2200);
          await clickContinueLike(page);
          await page.waitForTimeout(500);
        }
      } else {
        sequence.push('info');
        const moved = await clickContinueLike(page);
        if (!moved) warnings.push('Info activity did not continue in time');
        await page.waitForTimeout(500);
      }

      const newPrompt = ((await page.locator('h2').first().textContent().catch(() => '')) || '').trim();
      if (newPrompt && newPrompt === lastPrompt) stagnation += 1;
      else { stagnation = 0; lastPrompt = newPrompt; }
      if (stagnation >= 4) {
        warnings.push(`Prompt stalled at: ${newPrompt}`);
        break;
      }
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'focused-lesson-end.png'), fullPage: true });
    const completedLesson = await page.getByText(/Mission Complete!|Lesson Complete!/i).first().isVisible().catch(() => false);

    return {
      completedLesson,
      sequence,
      maxConsecutiveInfo: maxConsecutiveInfo(sequence),
      questionCountSeen: sequence.filter((s) => s === 'question').length,
      infoCountSeen: sequence.filter((s) => s === 'info').length,
      answeredQuestions,
      hintShown,
      hintNoSkipConfirmed,
      firstQuestionPrompt,
      warnings,
      consoleErrors,
      finalUrl: page.url()
    };
  } finally {
    await context.close();
    await browser.close();
  }
};

(async () => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const env = parseEnv();
  const beforePoints = await getChildPoints(env, CHILD_ID);
  const answerKey = await getAnswerKey(env, LESSON_ID);
  const magicLink = await generateMagicLink(env, EMAIL);

  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const preview = spawn(npmCmd, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  try {
    await waitForServer(ROOT_URL);
    const result = await runTest({ magicLink, answerKey });
    const afterPoints = await getChildPoints(env, CHILD_ID);

    const summary = {
      timestamp: new Date().toISOString(),
      lesson: "Japan's Natural Wonders",
      childId: CHILD_ID,
      beforePoints,
      afterPoints,
      xpDelta: afterPoints - beforePoints,
      expectedPerfectEasyDelta: 110,
      ...result
    };

    fs.writeFileSync(SUMMARY_PATH, JSON.stringify(summary, null, 2), 'utf8');
    console.log(`FOCUSED_PLAYTEST_SUMMARY=${SUMMARY_PATH}`);
    console.log(JSON.stringify(summary, null, 2));
  } finally {
    if (!preview.killed) preview.kill('SIGTERM');
  }
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
