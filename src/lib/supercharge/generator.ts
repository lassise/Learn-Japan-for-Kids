import type {
    ActivityOption,
    ChildReadingLevel,
    DifficultyLabel,
    GeneratedQuestion,
    QuestActivity,
    QuestTopic
} from './types';
import { hashString, normalizeContentText, toQuestionKey } from './contentUtils';
import {
    buildSourceTags,
    enforceVocabularyByReadingLevel,
    enforceQualityRules,
    sanitizeQuestionNoTrueFalse
} from './contentQuality';

export interface LocalFactSeed {
    id: string;
    topic: QuestTopic;
    difficulty: DifficultyLabel;
    story: string;
    question: string;
    correctAnswer: string;
    distractors: string[];
    explanation: string;
    uncertain?: boolean;
    sourceConfidence?: 'verified' | 'regional';
    sourceNote?: string;
    tags?: string[];
}

let factsCache: LocalFactSeed[] | null = null;
const FACT_SOURCE_URLS = ['/data/supercharge_facts.review.json', '/data/supercharge_facts.v1.json', '/data/supercharge_facts.json'];
const BLOCKED_TERMS = ['gamble', 'bet', 'weapon', 'violence', 'shame'];
const ALLOWED_TOPICS: QuestTopic[] = ['food', 'transport', 'shrines', 'school', 'phrases', 'culture', 'nature', 'general'];
const TOPIC_REGIONAL_NOTES: Record<QuestTopic, string> = {
    food: 'Recipes and meal styles can be different in different places.',
    transport: 'Rules can look different in different places.',
    shrines: 'Customs can be different in different places.',
    school: 'School routines can be different in different places.',
    phrases: 'Word choices can be different in different places.',
    culture: 'Traditions can be different in different places.',
    nature: 'Season timing can be different in different places.',
    general: 'Details can be different in different places.'
};

const fallbackDistractors = [
    'A school bag',
    'A toy robot',
    'A rainy cloud',
    'A soccer ball',
    'A beach umbrella'
];

const topicDistractors: Record<QuestTopic, string[]> = {
    food: ['A train station map', 'A temple bell', 'A soccer goal'],
    transport: ['A sushi roll', 'A school notebook', 'A flower petal'],
    shrines: ['A lunch tray', 'A subway ticket', 'A music speaker'],
    school: ['A mountain cable car', 'A noodle pot', 'A shrine lantern'],
    phrases: ['A toy train', 'A noodle bowl', 'A pencil case'],
    culture: ['A bus gate', 'A weather cloud', 'A playground ball'],
    nature: ['A station locker', 'A class bell', 'A lunch chopstick'],
    general: ['A red umbrella', 'A blue notebook', 'A green ticket']
};

const compactStory = (story: string) => {
    const parts = story
        .split(/[.!?]/)
        .map((part) => part.trim())
        .filter(Boolean)
        .slice(0, 2);

    return `${parts.join('. ')}${parts.length > 0 ? '.' : ''}`;
};

const deterministicShuffle = <T,>(items: T[], seed: string) => {
    const list = [...items];
    for (let i = list.length - 1; i > 0; i -= 1) {
        const random = parseInt(hashString(`${seed}:${i}`), 36);
        const j = random % (i + 1);
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
};

const buildChoices = (fact: LocalFactSeed, seed: string, questionIndex: number) => {
    const wrongPool = deterministicShuffle(
        Array.from(
            new Set([
                ...fact.distractors,
                ...(topicDistractors[fact.topic] || []),
                ...fallbackDistractors
            ])
        ).filter((option) => option !== fact.correctAnswer),
        `${seed}:wrong-pool:${fact.id}`
    );

    const wrongChoices = wrongPool.slice(0, 2);
    if (wrongChoices.length < 2) {
        return { choices: [], answerIndex: 0 };
    }

    const correctSlotSeed = parseInt(hashString(`${seed}:correct-slot:${fact.id}`), 36);
    const answerIndex = (correctSlotSeed + questionIndex) % 3;

    const choices = ['', '', ''];
    choices[answerIndex] = fact.correctAnswer;

    let wrongIndex = 0;
    for (let i = 0; i < choices.length; i += 1) {
        if (choices[i]) continue;
        choices[i] = wrongChoices[wrongIndex];
        wrongIndex += 1;
    }

    return { choices, answerIndex };
};

const buildExplanation = (fact: LocalFactSeed, readingLevel: ChildReadingLevel) => {
    const base = fact.explanation.trim();
    let output = base;
    const needsRegionalNote = fact.uncertain || fact.sourceConfidence === 'regional';
    const sourceNote = (fact.sourceNote || '').trim();

    if (needsRegionalNote && !output.toLowerCase().includes('different places')) {
        output = `${output} It can be different in different places.`;
    }

    if (sourceNote && !output.toLowerCase().includes(sourceNote.toLowerCase())) {
        output = `${output} ${sourceNote}`;
    }

    return enforceVocabularyByReadingLevel(output.replace(/\s+/g, ' ').trim(), readingLevel);
};

export const loadLocalFacts = async (): Promise<LocalFactSeed[]> => {
    if (factsCache) return factsCache;

    if (typeof fetch === 'undefined') {
        factsCache = [];
        return factsCache;
    }

    try {
        const collectedFacts: LocalFactSeed[] = [];

        for (const url of FACT_SOURCE_URLS) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;

                const data = await response.json();
                if (!Array.isArray(data)) continue;

                data.forEach((item) => {
                    if (!item || typeof item !== 'object') return;
                    const row = item as Partial<LocalFactSeed>;

                    if (
                        typeof row.id !== 'string'
                        || !ALLOWED_TOPICS.includes(row.topic as QuestTopic)
                        || (row.difficulty !== 'Rookie' && row.difficulty !== 'Scout' && row.difficulty !== 'Explorer')
                        || typeof row.story !== 'string'
                        || typeof row.question !== 'string'
                        || typeof row.correctAnswer !== 'string'
                        || !Array.isArray(row.distractors)
                        || typeof row.explanation !== 'string'
                    ) {
                        return;
                    }

                    const unsafePayload = `${row.story} ${row.question} ${row.correctAnswer} ${row.explanation}`.toLowerCase();
                    if (BLOCKED_TERMS.some((term) => unsafePayload.includes(term))) {
                        return;
                    }

                    const sourceConfidence = row.sourceConfidence === 'verified' || row.sourceConfidence === 'regional'
                        ? row.sourceConfidence
                        : (row.uncertain ? 'regional' : 'verified');
                    const sourceNote = typeof row.sourceNote === 'string' && row.sourceNote.trim()
                        ? row.sourceNote.trim()
                        : (sourceConfidence === 'regional' ? TOPIC_REGIONAL_NOTES[row.topic as QuestTopic] : undefined);

                    collectedFacts.push({
                        id: row.id,
                        topic: row.topic as QuestTopic,
                        difficulty: row.difficulty as DifficultyLabel,
                        story: row.story,
                        question: row.question,
                        correctAnswer: row.correctAnswer,
                        distractors: row.distractors
                            .map((value) => (typeof value === 'string' ? value : ''))
                            .filter(Boolean),
                        explanation: row.explanation,
                        uncertain: Boolean(row.uncertain),
                        sourceConfidence,
                        sourceNote,
                        tags: Array.isArray(row.tags)
                            ? row.tags.filter((tag): tag is string => typeof tag === 'string')
                            : []
                    });
                });
            } catch {
                // Try next source URL.
            }
        }

        const deduped = new Map<string, LocalFactSeed>();
        collectedFacts.forEach((fact) => {
            if (!deduped.has(fact.id)) {
                deduped.set(fact.id, fact);
            }
        });

        factsCache = Array.from(deduped.values());
        return factsCache;
    } catch {
        factsCache = [];
        return factsCache;
    }
};

interface GenerateQuestionsArgs {
    facts: LocalFactSeed[];
    topic: QuestTopic;
    difficulty: DifficultyLabel;
    readingLevel: ChildReadingLevel;
    count: number;
    existingQuestionKeys: Set<string>;
    seed: string;
}

export const generateQuestionsFromFacts = ({
    facts,
    topic,
    difficulty,
    readingLevel,
    count,
    existingQuestionKeys,
    seed
}: GenerateQuestionsArgs): GeneratedQuestion[] => {
    const candidates = facts.filter((fact) => {
        if (fact.topic !== topic) return false;
        if (fact.difficulty === difficulty) return true;
        if (difficulty === 'Explorer' && fact.difficulty === 'Scout') return true;
        if (difficulty === 'Scout' && fact.difficulty === 'Rookie') return true;
        return false;
    });

    const ranked = deterministicShuffle(candidates, `${seed}:${topic}:${difficulty}`);

    const output: GeneratedQuestion[] = [];

    for (const fact of ranked) {
        if (output.length >= count) break;

        const quality = enforceQualityRules({
            story: compactStory(fact.story),
            question: sanitizeQuestionNoTrueFalse(fact.question),
            topic,
            readingLevel,
            variantSeed: output.length
        });

        const story = quality.story;
        const question = quality.question;
        const key = toQuestionKey(normalizeContentText(`${story} ${question}`));

        if (existingQuestionKeys.has(key)) continue;

        const choiceInfo = buildChoices(fact, `${seed}:${fact.id}`, output.length);
        if (choiceInfo.choices.length < 3) continue;

        output.push({
            story,
            question,
            choices: choiceInfo.choices,
            answerIndex: choiceInfo.answerIndex,
            explanation: buildExplanation(fact, readingLevel),
            tags: [
                ...(fact.tags || []),
                ...buildSourceTags(topic, fact.sourceConfidence),
                ...(fact.sourceNote ? ['source:regional-note'] : []),
                'generated',
                topic
            ],
            topic,
            difficulty
        });

        existingQuestionKeys.add(key);
    }

    return output;
};

interface BuildGeneratedActivitiesArgs {
    facts: LocalFactSeed[];
    topic: QuestTopic;
    difficulty: DifficultyLabel;
    readingLevel: ChildReadingLevel;
    count: number;
    existingQuestionKeys: Set<string>;
    orderStart: number;
    seed: string;
}

const GENERATED_MAP_COORDINATES = [
    { x: 24, y: 26 },
    { x: 62, y: 33 },
    { x: 42, y: 66 }
];

const GENERATED_SEQUENCE_HINTS = [
    'Read each clue and move the best match to card #1.',
    'Use the clue words to rank the options.',
    'Sort the cards so the strongest answer is first.'
];

const toMapLabel = (choiceText: string, index: number) => {
    const firstWord = choiceText.split(/\s+/)[0] || `Pin ${index + 1}`;
    return `${String.fromCharCode(65 + index)}: ${firstWord}`;
};

const buildGeneratedOptionsForType = (
    item: GeneratedQuestion,
    generatedType: QuestActivity['type'],
    itemIndex: number
): ActivityOption[] => {
    const sequenceHint = GENERATED_SEQUENCE_HINTS[itemIndex % GENERATED_SEQUENCE_HINTS.length];

    return item.choices.map((choiceText, choiceIndex) => {
        const isCorrect = choiceIndex === item.answerIndex;
        const baseOption: ActivityOption = {
            id: `g-${itemIndex}-${choiceIndex}`,
            text: choiceText,
            is_correct: isCorrect,
            explanation: item.explanation
        };

        if (generatedType === 'flashcard') {
            baseOption.explanation = `${item.explanation || 'Good thinking.'} ${sequenceHint}`.trim();
        }

        if (generatedType === 'map_click') {
            const hotspot = GENERATED_MAP_COORDINATES[choiceIndex % GENERATED_MAP_COORDINATES.length];
            baseOption.hotspot = {
                x: hotspot.x,
                y: hotspot.y,
                mapLabel: toMapLabel(choiceText, choiceIndex),
                label: isCorrect ? 'Best clue location' : 'Map clue location'
            };
        }

        return baseOption;
    });
};

const buildQuestionTailForType = (generatedType: QuestActivity['type'], index: number) => {
    if (generatedType === 'flashcard') {
        return GENERATED_SEQUENCE_HINTS[index % GENERATED_SEQUENCE_HINTS.length];
    }

    if (generatedType === 'map_click') {
        return 'Tap the map label that fits the clue best.';
    }

    if (generatedType === 'scenario') {
        return 'Pick the safest and kindest choice.';
    }

    return '';
};

const buildGeneratedTypeTags = (generatedType: QuestActivity['type']) => {
    if (generatedType === 'flashcard') {
        return ['generated-ordering', 'generated-order-category', 'generated-sequence-clue'];
    }

    if (generatedType === 'map_click') {
        return ['generated-choice', 'generated-map-label', 'generated-hotspot'];
    }

    if (generatedType === 'scenario') {
        return ['generated-choice', 'generated-scenario'];
    }

    return ['generated-choice'];
};

export const buildGeneratedActivities = ({
    facts,
    topic,
    difficulty,
    readingLevel,
    count,
    existingQuestionKeys,
    orderStart,
    seed
}: BuildGeneratedActivitiesArgs): QuestActivity[] => {
    const generated = generateQuestionsFromFacts({
        facts,
        topic,
        difficulty,
        readingLevel,
        count,
        existingQuestionKeys,
        seed
    });

    const generatedTypeCycle: QuestActivity['type'][] = [
        'multiple_choice',
        'scenario',
        'flashcard',
        'map_click',
        'scenario',
        'flashcard'
    ];

    return generated.map((item, index) => {
        const generatedType = generatedTypeCycle[index % generatedTypeCycle.length];
        const questionTail = buildQuestionTailForType(generatedType, index);
        const options = buildGeneratedOptionsForType(item, generatedType, index);
        const composedQuestion = `${item.story} ${item.question} ${questionTail}`.replace(/\s+/g, ' ').trim();

        return {
            id: `generated:${topic}:${hashString(`${seed}:${orderStart + index}:${item.question}`)}`,
            lesson_id: 'generated',
            branch_key: `generated:${topic}`,
            branch_name: `Generated ${topic}`,
            type: generatedType,
            question_text: composedQuestion,
            options,
            order_index: orderStart + index,
            difficulty: difficulty === 'Explorer' ? 3 : difficulty === 'Scout' ? 2 : 1,
            topic,
            tags: [...item.tags, ...buildGeneratedTypeTags(generatedType)],
            source: 'generated',
            story: item.story,
            explanation: item.explanation,
            content: composedQuestion
        } as QuestActivity;
    });
};
