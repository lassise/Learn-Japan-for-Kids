const { chromium, webkit } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const targetUrl = process.env.SMOKE_URL || 'http://127.0.0.1:4173/supercharge-smoke';
const browserName = process.env.SMOKE_BROWSER || 'chromium';
const artifactDir = process.env.SMOKE_ARTIFACT_DIR || '';

const getBrowserType = () => {
    if (browserName === 'webkit') return webkit;
    return chromium;
};

const ensureArtifactDir = () => {
    if (!artifactDir) return;
    fs.mkdirSync(artifactDir, { recursive: true });
};

const writeArtifact = (name, content) => {
    if (!artifactDir) return;
    fs.writeFileSync(path.join(artifactDir, name), content, 'utf8');
};

async function run() {
    ensureArtifactDir();
    const browserType = getBrowserType();
    const browser = await browserType.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 60000 });
        await page.waitForSelector('#smoke-status[data-status=\"passed\"]', { timeout: 30000 });
        const details = await page.textContent('#smoke-status');
        if (artifactDir) {
            await page.screenshot({
                path: path.join(artifactDir, `${browserName}-status-pass.png`),
                fullPage: true
            });
            writeArtifact(`${browserName}-summary.json`, JSON.stringify({
                status: 'passed',
                browser: browserName,
                details: details ? details.trim() : '',
                targetUrl
            }, null, 2));
        }
        console.log(`Browser smoke passed (${browserName}).`);
        if (details) {
            console.log(details.trim());
        }
    } catch (error) {
        const status = await page.getAttribute('#smoke-status', 'data-status').catch(() => null);
        const details = await page.textContent('#smoke-status').catch(() => null);
        if (artifactDir) {
            await page.screenshot({
                path: path.join(artifactDir, `${browserName}-status-fail.png`),
                fullPage: true
            }).catch(() => undefined);
            writeArtifact(`${browserName}-summary.json`, JSON.stringify({
                status: 'failed',
                browser: browserName,
                details: details ? details.trim() : '',
                smokeStatus: status,
                targetUrl,
                error: error instanceof Error ? error.message : String(error)
            }, null, 2));
        }
        console.error(`Browser smoke failed (${browserName}).`);
        console.error('Status:', status);
        console.error('Details:', details);
        throw error;
    } finally {
        await context.close();
        await browser.close();
    }
}

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
