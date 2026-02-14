const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT_URL = 'http://127.0.0.1:4173';
const EMAIL = 'andrewlassise@gmail.com';
const CHILD_ID = 'ac98cf54-6f14-4f83-a6e3-c62270dbf7f8'; // Testing
const BRANCH_ID = '6c95a2bc-c8c2-4bf8-bced-4a48c696e172'; // Nature & Landmarks
const LESSON_ID = '3d670ba5-0ff4-4154-8e16-413d14b5745e'; // Japan's Natural Wonders
const LESSON_URL = `${ROOT_URL}/lesson/${CHILD_ID}/${BRANCH_ID}/${LESSON_ID}`;
const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts', 'playtest');
const SUMMARY_PATH = path.join(ARTIFACT_DIR, 'focused-playtest-natural-wonders.json');

const parseEnv = () => {
  const text = fs.readFileSync('.env.local', 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return env;
};

const normalize = (text) => {
  if (!text) return '';
  const parts = String(text).split('\n\n');
  const mainText = parts[parts.length - 1];
  return mainText
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[?.!]$/, '')
    .trim();
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
  const url = `${env.SUPABASE_URL}/rest/v1/child_profiles?select=id,total_points&id=eq.${childId}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const data = await res.json();
  return Number(data?.[0]?.total_points || 0);
};

const getAnswerKeyForLesson = async (env, lessonId) => {
  const url = `${env.SUPABASE_URL}/rest/v1/activities?select=question_text,options,type&lesson_id=eq.${lessonId}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  const rows = await res.json();
  const key = new Map();
  for (const row of rows || []) {
    if (row.type !== 'multiple_choice' && row.type !== 'image_choice' && row.type !== 'scenario') continue;
    const options = Array.isArray(row.options) ? row.options : [];
    const correct = options.find((opt) => opt && opt.is_correct);
    if (correct?.text) {
      key.set(normalize(row.question_text), String(correct.text));
    }
  }
  return key;
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
  if (!res.ok) throw new Error(await res.text());
  const payload = await res.json();
  if (!payload.action_link) throw new Error('Missing action_link');
  return payload.action_link;
};

const clickIfVisible = async (locator, timeout = 1200) => {
  try {
    const target = locator.first();
    await target.waitFor({ state: 'visible', timeout });
    if (await target.isEnabled()) {
      await target.click({ timeout });
      return true;
    }
  } catch {}
  return false;
};

const countConsecutiveInfo = (sequence) => {
  let max = 0;
  let current = 0;
  for (const s of sequence) {
    if (s === 'info') {
      current += 1;
      max = Math.max(max, current);
    } else {
      current = 0;
    }
  }
  return max;
};

const runPlaytest = async ({ env, magicLink, answerKey }) => {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();

  const consoleErrors = [];
  const sequence = [];
  let hintShown = false;
  let hintNoSkipConfirmed = false;
  let firstQuestionPrompt = '';
  let answeredQuestions = 0;

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  try {
    await page.goto(magicLink, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(1200);

    await page.evaluate(() => {
      localStorage.setItem('triplearn_onboarding_done', 'true');
    });

    await page.goto(LESSON_URL, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(1000);

    await clickIfVisible(page.getByRole('button', { name: 'Rookie' }), 5000);
    await page.waitForTimeout(1300);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'focused-lesson-start.png'), fullPage: true });

    for (let step = 0; step < 20; step += 1) {
      const completionVisible = await page.getByText(/Mission Complete!|Lesson Complete!|Quest Run Complete!/).first().isVisible().catch(() => false);
      if (completionVisible) break;

      const optionButtons = page.locator('div.space-y-4 > button');
      const optionCount = await optionButtons.count();
      const mapPinCount = await page.locator('button[aria-label^="Map pin"]').count();
      const reorderCount = await page.locator('button[aria-label^="Reorder card"]').count();
      const isQuestion = optionCount >= 2 || mapPinCount > 0 || reorderCount > 0;

      if (isQuestion) {
        sequence.push('question');
        const promptText = (await page.locator('h2').first().textContent().catch(() => '') || '').trim();
        const promptKey = normalize(promptText);

        if (!hintShown) {
          firstQuestionPrompt = promptText;
          const hintButton = page.getByRole('button', { name: /Need help\? Show hint|Hint shown/ });
          await hintButton.first().waitFor({ timeout: 14000 }).catch(() => undefined);
          if (await hintButton.first().isVisible().catch(() => false)) {
            await hintButton.first().click();
            hintShown = true;
            await page.waitForTimeout(500);
            const hintTextVisible = await page.locator('text=/Hint:/').first().isVisible().catch(() => false);
            const afterPromptText = (await page.locator('h2').first().textContent().catch(() => '') || '').trim();
            hintNoSkipConfirmed = hintTextVisible && afterPromptText === firstQuestionPrompt;
          }
        }

        if (optionCount >= 2) {
          let selected = false;
          const expectedAnswer = answerKey.get(promptKey) || '';

          for (let i = 0; i < optionCount; i += 1) {
            const button = optionButtons.nth(i);
            const text = (await button.textContent().catch(() => '') || '').trim();
            if (expectedAnswer && text.toLowerCase().includes(expectedAnswer.toLowerCase())) {
              await button.click();
              selected = true;
              break;
            }
          }

          if (!selected) {
            await optionButtons.first().click();
          }

          await clickIfVisible(page.getByRole('button', { name: 'Check Answer' }), 2500);
          answeredQuestions += 1;
          await page.waitForTimeout(2200);

          await clickIfVisible(page.getByRole('button', { name: /Next Activity ->|Finish Lesson/ }), 500);
        } else if (mapPinCount > 0) {
          await page.locator('button[aria-label^="Map pin"]').first().click();
          await clickIfVisible(page.getByRole('button', { name: 'Check Answer' }), 2000);
          await page.waitForTimeout(2200);
        } else if (reorderCount > 0) {
          await clickIfVisible(page.getByRole('button', { name: 'Check Answer' }), 2000);
          await page.waitForTimeout(2200);
        }
      } else {
        sequence.push('info');
        await clickIfVisible(page.getByRole('button', { name: /Continue ->|Next Activity ->|Finish Lesson/ }), 3000);
        await page.waitForTimeout(700);
      }
    }

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'focused-lesson-end.png'), fullPage: true });

    const xpEarnedText = (await page.locator('text=/XP Earned/i').first().locator('xpath=following-sibling::*').first().textContent().catch(() => '') || '').trim();

    return {
      sequence,
      maxConsecutiveInfo: countConsecutiveInfo(sequence),
      questionCountSeen: sequence.filter((s) => s === 'question').length,
      infoCountSeen: sequence.filter((s) => s === 'info').length,
      answeredQuestions,
      hintShown,
      hintNoSkipConfirmed,
      firstQuestionPrompt,
      xpEarnedText,
      consoleErrors,
      finalUrl: page.url()
    };
  } finally {
    await context.close();
    await browser.close();
  }
};

const run = async () => {
  const env = parseEnv();
  const beforePoints = await getChildPoints(env, CHILD_ID);
  const answerKey = await getAnswerKeyForLesson(env, LESSON_ID);
  const magicLink = await generateMagicLink(env, EMAIL);

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const preview = spawn(npmCommand, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
    cwd: process.cwd(),
    stdio: 'inherit',
    shell: process.platform === 'win32'
  });

  try {
    await waitForServer(ROOT_URL);
    const result = await runPlaytest({ env, magicLink, answerKey });
    const afterPoints = await getChildPoints(env, CHILD_ID);

    const summary = {
      timestamp: new Date().toISOString(),
      lesson: 'Japan\'s Natural Wonders',
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
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
