const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

execSync('npx tsc -p tsconfig.supercharge-checks.json', { stdio: 'inherit' });

const tempDir = path.resolve('.tmp-supercharge-checks');
try {
    if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
    }

    fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify({ type: 'commonjs' }, null, 2)
    );

    require(path.join(tempDir, 'scripts', 'supercharge_checks.js'));
} finally {
    if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}
