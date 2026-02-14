import type { ChildReadingLevel, QuestTopic } from './types';

const JAPANESE_PHONETICS: Array<{ pattern: RegExp; replacement: string }> = [
    { pattern: /\bKonnichiwa\b(?!\s*\()/gi, replacement: 'Konnichiwa (Kon-NEE-chee-wah)' },
    { pattern: /\bArigato\b(?!\s*\()/gi, replacement: 'Arigato (ah-ree-GAH-toh)' },
    { pattern: /\bOhayo\b(?!\s*\()/gi, replacement: 'Ohayo (oh-hah-YOH)' },
    { pattern: /\bSumimasen\b(?!\s*\()/gi, replacement: 'Sumimasen (soo-mee-mah-SEN)' },
    { pattern: /\bItadakimasu\b(?!\s*\()/gi, replacement: 'Itadakimasu (ee-tah-dah-kee-MAHS)' },
    { pattern: /\bonigiri\b(?!\s*\()/gi, replacement: 'onigiri (oh-nee-GHEE-ree)' },
    { pattern: /\bmiso\b(?!\s*\()/gi, replacement: 'miso (MEE-soh)' },
    { pattern: /\bramen\b(?!\s*\()/gi, replacement: 'ramen (RAH-men)' },
    { pattern: /\btorii\b(?!\s*\()/gi, replacement: 'torii (TOH-ree-ee)' },
    { pattern: /\bshinkansen\b(?!\s*\()/gi, replacement: 'shinkansen (sheen-kahn-SEN)' }
];

const READING_LEVEL_SIMPLIFY_MAP: Record<ChildReadingLevel, Array<[RegExp, string]>> = {
    'K-2': [
        [/\bapproximately\b/gi, 'about'],
        [/\btraditional\b/gi, 'classic'],
        [/\bexpress\b/gi, 'show'],
        [/\brespectful\b/gi, 'kind'],
        [/\bcommunity\b/gi, 'group'],
        [/\bresponsibility\b/gi, 'care'],
        [/\bceremony\b/gi, 'event'],
        [/\bcommute\b/gi, 'ride to school'],
        [/\bcustom\b/gi, 'way'],
        [/\bculture\b/gi, 'daily life'],
        [/\bregional\b/gi, 'local'],
        [/\bfermented\b/gi, 'aged']
    ],
    '3-5': [
        [/\bapproximately\b/gi, 'about'],
        [/\bceremony\b/gi, 'event'],
        [/\bregional\b/gi, 'local'],
        [/\bcustom\b/gi, 'tradition']
    ],
    '6-8': [
        [/\bapproximately\b/gi, 'about'],
        [/\bregional\b/gi, 'local']
    ],
    '9-12': []
};

const DEFAULT_READ_SUFFIX: Record<ChildReadingLevel, string> = {
    'K-2': 'Pick one answer.',
    '3-5': 'Pick the best answer.',
    '6-8': 'Choose the best answer.',
    '9-12': 'Select the best answer.'
};

const QUESTION_STEM_TEMPLATES = [
    '{question} Pick the best answer.',
    '{question} Which choice fits best?',
    '{question} Choose one answer.'
];

const STORY_NAMES = ['Aiko', 'Ren', 'Mina', 'Haru', 'Sora', 'Yuki'];

export const ensureTwoSentenceStory = (story: string) => {
    const parts = story
        .split(/[.!?]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2);

    if (parts.length === 0) return '';
    return `${parts.join('. ')}.`;
};

export const ensureJapanesePhonetics = (text: string) => {
    let output = text;

    JAPANESE_PHONETICS.forEach(({ pattern, replacement }) => {
        output = output.replace(pattern, replacement);
    });

    return output;
};

export const hasPhoneticSpelling = (text: string) => /\([A-Za-z-]{3,}\)/.test(text);

export const sanitizeQuestionNoTrueFalse = (question: string) => {
    const cleaned = question
        .replace(/^\s*true\s*or\s*false\s*[:\-]?\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    const withQuestion = cleaned.endsWith('?') ? cleaned : `${cleaned}?`;
    return withQuestion;
};

export const simplifyForReadingLevel = (text: string, readingLevel: ChildReadingLevel) => {
    return READING_LEVEL_SIMPLIFY_MAP[readingLevel].reduce(
        (acc, [pattern, replacement]) => acc.replace(pattern, replacement),
        text
    );
};

export const enforceVocabularyByReadingLevel = simplifyForReadingLevel;

export const varyQuestionStem = (question: string, seedIndex: number, readingLevel: ChildReadingLevel) => {
    const clean = sanitizeQuestionNoTrueFalse(question);
    const noQuestionMark = clean.replace(/\?$/, '').trim();

    const template = QUESTION_STEM_TEMPLATES[seedIndex % QUESTION_STEM_TEMPLATES.length];
    const expanded = template.replace('{question}', `${noQuestionMark}?`);

    return `${expanded} ${DEFAULT_READ_SUFFIX[readingLevel]}`.replace(/\s+/g, ' ').trim();
};

export const buildSourceTags = (topic: QuestTopic, sourceConfidence: 'verified' | 'regional' | undefined) => {
    const confidence = sourceConfidence || 'regional';
    return [`topic:${topic}`, 'source:local-facts', `source-confidence:${confidence}`];
};

export const enforceQualityRules = (input: {
    story: string;
    question: string;
    topic: QuestTopic;
    readingLevel: ChildReadingLevel;
    variantSeed: number;
}) => {
    const selectedName = STORY_NAMES[input.variantSeed % STORY_NAMES.length];
    let story = input.story.replace(/\b(Aiko|Ren|Mina|Haru|Sora|Yuki|Kai|Yui|Nana|Ken|Mika)\b/, selectedName);
    story = ensureTwoSentenceStory(story);
    story = ensureJapanesePhonetics(story);
    story = enforceVocabularyByReadingLevel(story, input.readingLevel);

    let question = varyQuestionStem(input.question, input.variantSeed, input.readingLevel);
    question = ensureJapanesePhonetics(question);
    question = enforceVocabularyByReadingLevel(question, input.readingLevel);

    if (!hasPhoneticSpelling(`${story} ${question}`) && input.topic === 'phrases') {
        story = `${story} Konnichiwa (Kon-NEE-chee-wah) is a polite hello.`;
        story = ensureTwoSentenceStory(story);
    }

    return { story, question };
};
