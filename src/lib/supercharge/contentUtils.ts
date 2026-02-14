import type { QuestActivity, QuestTopic } from './types';

const SPACE_RE = /\s+/g;
const NON_TEXT_RE = /[^a-z0-9\s]/g;

export const normalizeContentText = (value: string | null | undefined) =>
    (value || '')
        .toLowerCase()
        .replace(SPACE_RE, ' ')
        .replace(NON_TEXT_RE, '')
        .trim();

export const hashString = (value: string) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
};

const PHONETIC_MAP: Record<string, string> = {
    'Sushi': 'Su-shi',
    'Ramen': 'Ra-men',
    'Onigiri': 'O-ni-gi-ri',
    'Konnichiwa': 'Kon-ni-chi-wa',
    'Arigato': 'A-ri-ga-to',
    'Sayonara': 'Sa-yo-na-ra',
    'Ohayou': 'O-ha-yo-u',
    'Konbanwa': 'Kon-ban-wa',
    'Itadakimasu': 'I-ta-da-ki-ma-su',
    'Gochisousama': 'Go-chi-sou-sa-ma',
    'Hanami': 'Ha-na-mi',
    'Sakura': 'Sa-ku-ra',
    'Torii': 'To-ri-i',
    'Shinkansen': 'Shin-kan-sen',
    'Karaage': 'Ka-ra-a-ge',
    'Tempura': 'Tem-pu-ra',
    'Matcha': 'Ma-t-cha',
    'Bento': 'Ben-to',
    'Daruma': 'Da-ru-ma',
    'Koinobori': 'Ko-i-no-bo-ri',
    'Origami': 'O-ri-ga-mi',
    'Katana': 'Ka-ta-na',
    'Kimono': 'Ki-mo-no',
    'Yukata': 'Yu-ka-ta',
    'Ryokan': 'Ryo-kan',
    'Onsen': 'On-sen',
    'Tatami': 'Ta-ta-mi',
    'Futon': 'Fu-ton',
    'Samurai': 'Sa-mu-rai',
    'Ninja': 'Nin-ja',
    'Manga': 'Man-ga',
    'Anime': 'A-ni-me',
    'Kawaii': 'Ka-wai-i',
    'Gakko': 'Gak-ko',
    'Otera': 'O-te-ra',
    'Bunka': 'Bun-ka',
    'Shizen': 'Shi-zen',
    'Tomodachi': 'To-mo-da-chi',
    'Densha': 'Den-sha',
    'Tabemono': 'Ta-be-mo-no',
    'Kotoba': 'Ko-to-ba'
};

export const applyPhonetics = (text: string | null | undefined): string => {
    if (!text) return '';
    let result = text;
    Object.entries(PHONETIC_MAP).forEach(([word, phonetic]) => {
        // Only replace if not already followed by phonetics (avoid recursion)
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\b${escapedWord}\\b(?!\\s*\\()`, 'gi');
        result = result.replace(regex, (m) => `${m} (${phonetic})`);
    });
    return result;
};

export const toActivityKey = (activityId: string) => `activity:${activityId}`;

export const toQuestionKey = (text: string) => `question:${hashString(normalizeContentText(text))}`;

export const sanitizeQuestionText = (value: string) => {
    const withoutTrueFalse = value.replace(/^\s*true\s*or\s*false\s*[:\-]?\s*/i, '');
    return withoutTrueFalse.replace(/^\s*is\s+/i, (prefix) => (prefix.trim().toLowerCase() === 'is' ? '' : prefix)).trim();
};

export const getActivityQuestionSignature = (activity: Pick<QuestActivity, 'question_text' | 'story'>) => {
    const combined = [activity.story, activity.question_text].filter(Boolean).join(' ');
    return normalizeContentText(combined);
};

export const getActivityContentKeys = (activity: Pick<QuestActivity, 'id' | 'question_text' | 'story'>) => {
    const questionText = getActivityQuestionSignature(activity);
    const keys = [toActivityKey(activity.id)];
    if (questionText) {
        keys.push(toQuestionKey(questionText));
    }
    return keys;
};

export const inferTopicFromBranchName = (branchName: string): QuestTopic => {
    const lower = branchName.toLowerCase();

    if (lower.includes('food')) return 'food';
    if (lower.includes('transport')) return 'transport';
    if (lower.includes('train')) return 'transport';
    if (lower.includes('language')) return 'phrases';
    if (lower.includes('phrase')) return 'phrases';
    if (lower.includes('tourist')) return 'shrines';
    if (lower.includes('culture')) return 'culture';
    if (lower.includes('nature')) return 'nature';
    if (lower.includes('school')) return 'school';
    if (lower.includes('shrine')) return 'shrines';

    return 'general';
};

export const inferTopicFromQuestion = (questionText: string): QuestTopic => {
    const lower = questionText.toLowerCase();

    if (lower.includes('sushi') || lower.includes('ramen') || lower.includes('onigiri') || lower.includes('food')) return 'food';
    if (lower.includes('train') || lower.includes('station') || lower.includes('bus') || lower.includes('transport')) return 'transport';
    if (lower.includes('konnichiwa') || lower.includes('arigato') || lower.includes('phrase') || lower.includes('hello')) return 'phrases';
    if (lower.includes('shrine') || lower.includes('temple') || lower.includes('torii')) return 'shrines';
    if (lower.includes('school') || lower.includes('class')) return 'school';
    if (lower.includes('park') || lower.includes('mountain') || lower.includes('flower')) return 'nature';

    return 'culture';
};

export const isQuestionActivity = (activity: Pick<QuestActivity, 'type' | 'options'>) => {
    if (activity.type === 'info') return false;
    return Array.isArray(activity.options) && activity.options.length >= 3;
};

export const seededOrder = (seed: string, value: string) => {
    return parseInt(hashString(`${seed}:${value}`), 36);
};

export const toDateKey = (date = new Date()) => {
    const year = date.getUTCFullYear();
    const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
    const day = `${date.getUTCDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const inLastNDays = (isoDate: string, days: number, now = Date.now()) => {
    const seenAt = new Date(isoDate).getTime();
    if (Number.isNaN(seenAt)) return false;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return seenAt >= cutoff;
};
export const formatSeconds = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
