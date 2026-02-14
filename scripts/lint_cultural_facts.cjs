const fs = require('node:fs');
const path = require('node:path');

const FACT_FILES = [
    'public/data/supercharge_facts.json',
    'public/data/supercharge_facts.v1.json',
    'public/data/supercharge_facts.review.json'
];

const PHONETIC_RULES = [
    /\bKonnichiwa\b(?!\s*\()/i,
    /\bArigato\b(?!\s*\()/i,
    /\bOhayo\b(?!\s*\()/i,
    /\bSumimasen\b(?!\s*\()/i,
    /\bItadakimasu\b(?!\s*\()/i,
    /\bonigiri\b(?!\s*\()/i,
    /\bmiso\b(?!\s*\()/i,
    /\bramen\b(?!\s*\()/i,
    /\btorii\b(?!\s*\()/i,
    /\bshinkansen\b(?!\s*\()/i,
    /\bmatsuri\b(?!\s*\()/i,
    /\bema\b(?!\s*\()/i,
    /\bomikuji\b(?!\s*\()/i,
    /\bhatsumode\b(?!\s*\()/i
];

const BLOCKED_TERMS = [/dark pattern/i, /\bgamble\b/i, /\bbet\b/i, /\bshame\b/i, /\bviolence\b/i];

const toSentenceCount = (text) => text
    .split(/[.!?]/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .length;

const lintFile = (filePath) => {
    const raw = fs.readFileSync(filePath, 'utf8');
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) {
        throw new Error(`${filePath}: expected JSON array`);
    }

    const issues = [];
    rows.forEach((row, index) => {
        if (!row || typeof row !== 'object') return;
        const story = typeof row.story === 'string' ? row.story : '';
        const question = typeof row.question === 'string' ? row.question : '';
        const explanation = typeof row.explanation === 'string' ? row.explanation : '';
        const payload = `${story} ${question} ${explanation}`;

        if (toSentenceCount(story) > 2) {
            issues.push(`[${index}] story exceeds 2 sentences`);
        }
        if (/true\s*or\s*false/i.test(question)) {
            issues.push(`[${index}] question uses true/false`);
        }
        PHONETIC_RULES.forEach((pattern) => {
            if (pattern.test(payload)) {
                issues.push(`[${index}] missing phonetic spelling for Japanese term in: ${question || story}`);
            }
        });
        BLOCKED_TERMS.forEach((pattern) => {
            if (pattern.test(payload)) {
                issues.push(`[${index}] blocked term matched (${pattern})`);
            }
        });

        const sourceConfidence = typeof row.sourceConfidence === 'string' ? row.sourceConfidence : '';
        const sourceNote = typeof row.sourceNote === 'string' ? row.sourceNote : '';
        if (sourceConfidence === 'regional' && !/different in different places/i.test(sourceNote)) {
            issues.push(`[${index}] regional fact missing sourceNote variation guidance`);
        }
    });

    return issues;
};

const run = () => {
    const allIssues = [];
    FACT_FILES.forEach((relativePath) => {
        const filePath = path.resolve(relativePath);
        if (!fs.existsSync(filePath)) {
            allIssues.push(`[missing] ${relativePath} not found`);
            return;
        }
        const issues = lintFile(filePath);
        issues.forEach((issue) => allIssues.push(`${relativePath} ${issue}`));
    });

    if (allIssues.length > 0) {
        console.error('Cultural fact lint failed:');
        allIssues.slice(0, 100).forEach((issue) => console.error(`- ${issue}`));
        process.exitCode = 1;
        return;
    }

    console.log('Cultural fact lint passed.');
};

run();
