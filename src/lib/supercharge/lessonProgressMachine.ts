export type LessonActivityType =
    | 'multiple_choice'
    | 'image_choice'
    | 'map_click'
    | 'scenario'
    | 'flashcard'
    | 'info';

export type LessonProgressPhase =
    | 'awaiting_input'
    | 'ready_to_submit'
    | 'auto_advancing'
    | 'ready_to_continue';

export interface LessonProgressContext {
    activityType: LessonActivityType;
    isSelectionMade: boolean;
    isCompleted: boolean;
    isLast: boolean;
    autoAdvancePending: boolean;
}

export interface LessonStuckFallbackContext {
    activityType: LessonActivityType;
    phase: LessonProgressPhase;
    isCompleted: boolean;
    attemptsWithoutProgress: number;
    elapsedMs: number;
    thresholdMs?: number;
}

const INPUT_REQUIRED_TYPES: LessonActivityType[] = [
    'multiple_choice',
    'image_choice',
    'map_click',
    'scenario',
    'flashcard'
];

export const deriveLessonProgressPhase = ({
    activityType,
    isSelectionMade,
    isCompleted,
    autoAdvancePending
}: LessonProgressContext): LessonProgressPhase => {
    if (autoAdvancePending) {
        return 'auto_advancing';
    }

    if (activityType === 'info') {
        return 'ready_to_continue';
    }

    if (isCompleted) {
        return 'ready_to_continue';
    }

    if (INPUT_REQUIRED_TYPES.includes(activityType)) {
        return isSelectionMade ? 'ready_to_submit' : 'awaiting_input';
    }

    return 'ready_to_continue';
};

export const canUseLessonPrimaryAction = (phase: LessonProgressPhase) => {
    return phase !== 'awaiting_input';
};

export const getLessonPrimaryActionLabel = (
    phase: LessonProgressPhase,
    context: Pick<LessonProgressContext, 'activityType' | 'isLast'>
) => {
    if (phase === 'auto_advancing') {
        return context.isLast ? 'Finish Lesson' : 'Next Activity ->';
    }

    if (phase === 'ready_to_continue') {
        if (context.activityType === 'info') {
            return context.isLast ? 'Finish Lesson' : 'Continue ->';
        }
        return context.isLast ? 'Finish Lesson' : 'Next Activity ->';
    }

    return 'Check Answer';
};

export const shouldEnableLessonStuckFallback = ({
    activityType,
    phase,
    isCompleted,
    attemptsWithoutProgress,
    elapsedMs,
    thresholdMs = 12000
}: LessonStuckFallbackContext) => {
    if (activityType === 'info') return false;
    if (isCompleted) return false;
    if (phase !== 'awaiting_input') return false;

    return attemptsWithoutProgress >= 2 || elapsedMs >= Math.max(3000, thresholdMs);
};

