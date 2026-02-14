const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const SMOKE_URL = 'http://127.0.0.1:4173/supercharge-smoke';
const SMOKE_BROWSER = process.env.SMOKE_BROWSER || 'chromium';
const SMOKE_ARTIFACT_DIR = process.env.SMOKE_ARTIFACT_DIR || '';

const waitForServer = (url, timeoutMs = 60000) => new Promise((resolve, reject) => {
    const start = Date.now();

    const ping = () => {
        const request = http.get(url, (response) => {
            response.resume();
            if (response.statusCode && response.statusCode >= 200 && response.statusCode < 500) {
                resolve(undefined);
            } else if (Date.now() - start > timeoutMs) {
                reject(new Error(`Timed out waiting for ${url}`));
            } else {
                setTimeout(ping, 1000);
            }
        });

        request.on('error', () => {
            if (Date.now() - start > timeoutMs) {
                reject(new Error(`Timed out waiting for ${url}`));
                return;
            }
            setTimeout(ping, 1000);
        });
    };

    ping();
});

const run = async () => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const preview = spawn(npmCommand, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', '4173'], {
        stdio: 'inherit',
        cwd: process.cwd(),
        shell: process.platform === 'win32'
    });

    try {
        await waitForServer(SMOKE_URL, 90000);

        await new Promise((resolve, reject) => {
            const smoke = spawn(process.execPath, [path.join('scripts', 'browser_offline_online_smoke.cjs')], {
                stdio: 'inherit',
                cwd: process.cwd(),
                env: { ...process.env, SMOKE_URL, SMOKE_BROWSER, SMOKE_ARTIFACT_DIR }
            });

            smoke.on('exit', (code) => {
                if (code === 0) {
                    resolve(undefined);
                    return;
                }
                reject(new Error(`Browser smoke exited with code ${code}`));
            });
        });
    } finally {
        if (!preview.killed) {
            preview.kill('SIGTERM');
        }
    }
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
