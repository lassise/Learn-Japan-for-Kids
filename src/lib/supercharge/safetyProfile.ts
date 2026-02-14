import type { LocalFactSeed } from './generator';
import type { QuestActivity, QuestTopic } from './types';
import { loadChildPreferences, saveChildPreferences } from './childPreferences';

export type SafetyMode = 'basic' | 'strict';

export interface SafetyProfile {
    mode: SafetyMode;
    allowedTopics: QuestTopic[];
    allowUncertainFacts: boolean;
    allowScenario: boolean;
}

const STRICT_ALLOWED_TOPICS: QuestTopic[] = ['food', 'transport', 'school', 'phrases', 'nature'];
const BASIC_ALLOWED_TOPICS: QuestTopic[] = ['food', 'transport', 'school', 'phrases', 'nature', 'shrines', 'culture', 'general'];

const BLOCKED_TERMS = ['gamble', 'bet', 'weapon', 'violent', 'shame'];

export const buildSafetyProfile = (mode: SafetyMode): SafetyProfile => {
    if (mode === 'strict') {
        return {
            mode,
            allowedTopics: STRICT_ALLOWED_TOPICS,
            allowUncertainFacts: false,
            allowScenario: false
        };
    }

    return {
        mode,
        allowedTopics: BASIC_ALLOWED_TOPICS,
        allowUncertainFacts: true,
        allowScenario: true
    };
};

export const loadChildSafetyMode = async (childId: string): Promise<SafetyMode> => {
    const preferences = await loadChildPreferences(childId);
    return preferences.safeMode;
};

export const saveChildSafetyMode = async (childId: string, mode: SafetyMode) => {
    await saveChildPreferences(childId, { safeMode: mode });
};

const containsBlockedTerms = (value: string) => {
    const lower = value.toLowerCase();
    return BLOCKED_TERMS.some((term) => lower.includes(term));
};

export const applySafetyFilters = (
    profile: SafetyProfile,
    input: {
        activities: QuestActivity[];
        facts: LocalFactSeed[];
    }
) => {
    const activities = input.activities.filter((activity) => {
        if (!profile.allowedTopics.includes(activity.topic)) return false;
        if (!profile.allowScenario && activity.type === 'scenario') return false;

        const textBlob = `${activity.question_text} ${activity.content || ''}`;
        if (containsBlockedTerms(textBlob)) return false;

        return true;
    });

    const facts = input.facts.filter((fact) => {
        if (!profile.allowedTopics.includes(fact.topic)) return false;
        if (!profile.allowUncertainFacts && fact.uncertain) return false;

        const textBlob = `${fact.story} ${fact.question} ${fact.explanation}`;
        if (containsBlockedTerms(textBlob)) return false;

        return true;
    });

    return { activities, facts };
};
