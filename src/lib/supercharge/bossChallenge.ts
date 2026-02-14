import type { QuestTopic } from './types';
import { sanitizeQuestionText } from './contentUtils';

const TOPIC_OPENERS: Record<QuestTopic, string[]> = {
    food: [
        'Boss Challenge: Pick the best food clue for lunch time.',
        'Boss Challenge: Help choose the best snack for a trip.'
    ],
    transport: [
        'Boss Challenge: Pick the safest travel choice.',
        'Boss Challenge: Help the team ride the train the right way.'
    ],
    shrines: [
        'Boss Challenge: Pick the most respectful action near a shrine.',
        'Boss Challenge: Help the guide choose polite shrine behavior.'
    ],
    school: [
        'Boss Challenge: Pick the best school teamwork choice.',
        'Boss Challenge: Help friends work together in class.'
    ],
    phrases: [
        'Boss Challenge: Pick the most polite phrase.',
        'Boss Challenge: Help your guide choose kind words.'
    ],
    culture: [
        'Boss Challenge: Pick the best culture clue.',
        'Boss Challenge: Help match a custom to the right moment.'
    ],
    nature: [
        'Boss Challenge: Pick the best nature safety choice.',
        'Boss Challenge: Help care for a park in a kind way.'
    ],
    general: [
        'Boss Challenge: Pick the best answer for this quest stop.',
        'Boss Challenge: Help your team solve this final puzzle.'
    ]
};

const cleanStem = (questionText: string) => {
    const sanitized = sanitizeQuestionText(questionText);
    return sanitized.replace(/\?$/, '').trim();
};

export const buildBossChallengeQuestion = (
    topic: QuestTopic,
    questionText: string,
    seedIndex: number
) => {
    const openerSet = TOPIC_OPENERS[topic] || TOPIC_OPENERS.general;
    const opener = openerSet[Math.abs(seedIndex) % openerSet.length] || TOPIC_OPENERS.general[0];
    const stem = cleanStem(questionText);

    if (!stem) {
        return `${opener} Choose the best answer.`;
    }

    return `${opener} ${stem}. Choose the best answer.`;
};
