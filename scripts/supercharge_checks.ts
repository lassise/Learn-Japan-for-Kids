import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectActivitiesWithDedupe, createDedupeState } from '../src/lib/supercharge/contentDedupe';
import { getActivityContentKeys, toQuestionKey } from '../src/lib/supercharge/contentUtils';
import { buildGeneratedActivities, generateQuestionsFromFacts, type LocalFactSeed } from '../src/lib/supercharge/generator';
import { buildQuestRunPlan } from '../src/lib/supercharge/questRunBuilder';
import { buildBossChallengeQuestion } from '../src/lib/supercharge/bossChallenge';
import { loadQuestModeConfig } from '../src/lib/supercharge/modeConfig';
import { processQueueItems } from '../src/lib/supercharge/queueProcessor';
import { inspectCsvSchema, parseCsvRows } from '../src/lib/supercharge/csvSchema';
import {
    canUseLessonPrimaryAction,
    deriveLessonProgressPhase,
    getLessonPrimaryActionLabel,
    shouldEnableLessonStuckFallback
} from '../src/lib/supercharge/lessonProgressMachine';
import type { QuestActivity, QuestTopic } from '../src/lib/supercharge/types';

const KID_SAFE_BLOCKLIST = [
    /dark pattern/i,
    /\bgamble\b/i,
    /\bbet\b/i,
    /\bshame\b/i,
    /\bpay to win\b/i,
    /don't break your streak/i
];

const PHONETIC_RULES = [
    { term: /konnichiwa/i, phonetic: /konnichiwa\s*\(/i },
    { term: /arigato/i, phonetic: /arigato\s*\(/i },
    { term: /sumimasen/i, phonetic: /sumimasen\s*\(/i },
    { term: /itadakimasu/i, phonetic: /itadakimasu\s*\(/i },
    { term: /shinkansen/i, phonetic: /shinkansen\s*\(/i },
    { term: /onigiri/i, phonetic: /onigiri\s*\(/i },
    { term: /torii/i, phonetic: /torii\s*\(/i }
];

const makeOptions = (correctText: string, wrongA: string, wrongB: string) => [
    { id: 'a', text: correctText, is_correct: true, explanation: 'Good choice.' },
    { id: 'b', text: wrongA, is_correct: false, explanation: 'Try again.' },
    { id: 'c', text: wrongB, is_correct: false, explanation: 'Try again.' }
];

const makeActivity = (id: string, question: string, topic: QuestTopic): QuestActivity => ({
    id,
    lesson_id: 'lesson-demo',
    type: 'multiple_choice',
    question_text: question,
    options: makeOptions('Correct', 'Wrong One', 'Wrong Two'),
    order_index: 0,
    difficulty: 1,
    topic,
    tags: [topic],
    source: 'db'
});

const runDedupeCheck = () => {
    const state = createDedupeState();
    const activities: QuestActivity[] = [
        makeActivity('a1', 'What is onigiri?', 'food'),
        makeActivity('a2', 'What is onigiri?', 'food'),
        makeActivity('a3', 'Which train is very fast?', 'transport'),
        makeActivity('a4', 'How do you greet politely?', 'phrases'),
        makeActivity('a5', 'Where is a shrine gate?', 'shrines')
    ];

    const seen = new Set<string>([toQuestionKey('What is onigiri?')]);

    const result = selectActivitiesWithDedupe(
        activities,
        3,
        'dedupe-seed',
        seen,
        state,
        ['transport', 'phrases', 'shrines']
    );

    assert.equal(result.selected.length, 3, 'dedupe should return requested count');

    const keys = result.selected.map((item) => getActivityContentKeys(item).find((key) => key.startsWith('question:')) || '');
    const uniqueKeys = new Set(keys);
    assert.equal(uniqueKeys.size, keys.length, 'dedupe should avoid duplicate question signatures');

    console.log('check:dedupe passed');
};

const runGeneratorCheck = async () => {
    const raw = await readFile('public/data/supercharge_facts.json', 'utf8');
    const facts = JSON.parse(raw) as LocalFactSeed[];

    const generated = generateQuestionsFromFacts({
        facts,
        topic: 'phrases',
        difficulty: 'Rookie',
        readingLevel: '3-5',
        count: 4,
        existingQuestionKeys: new Set<string>(),
        seed: 'generator-seed'
    });

    assert.ok(generated.length > 0, 'generator should produce phrase questions');

    generated.forEach((item, index) => {
        assert.equal(item.choices.length, 3, `generated question ${index} should have 3 choices`);
        assert.ok(item.answerIndex >= 0 && item.answerIndex < 3, `generated question ${index} answer index valid`);
        assert.ok(!/true\s*or\s*false/i.test(item.question), `generated question ${index} should not use true/false`);

        const sentenceParts = item.story.split(/[.!?]/).filter((part) => part.trim().length > 0);
        assert.ok(sentenceParts.length <= 2, `generated story ${index} should be 1-2 sentences`);

        assert.ok(/\([A-Za-z-]+\)/.test(item.story), `generated story ${index} should include phonetic spelling`);
        assert.ok(item.tags.some((tag) => tag.startsWith('source-confidence:')), `generated question ${index} should include source confidence tag`);
    });

    const uniqueAnswerIndexes = new Set(generated.map((item) => item.answerIndex));
    assert.ok(uniqueAnswerIndexes.size >= 2, 'generator should balance answer positions');

    const generatedActivities = buildGeneratedActivities({
        facts,
        topic: 'phrases',
        difficulty: 'Scout',
        readingLevel: '3-5',
        count: 6,
        existingQuestionKeys: new Set<string>(),
        orderStart: 1,
        seed: 'generator-activity-seed'
    });
    assert.ok(generatedActivities.some((activity) => activity.type === 'flashcard'), 'generator should include ordering activity templates');
    assert.ok(generatedActivities.some((activity) => activity.type === 'map_click'), 'generator should include map label activity templates');

    const flashcard = generatedActivities.find((activity) => activity.type === 'flashcard');
    assert.ok(flashcard?.tags.includes('generated-order-category'), 'flashcard template should include ordering category tag');
    assert.ok(flashcard?.tags.includes('generated-sequence-clue'), 'flashcard template should include sequence clue tag');

    const mapClick = generatedActivities.find((activity) => activity.type === 'map_click');
    assert.ok(mapClick?.tags.includes('generated-map-label'), 'map template should include map label tag');
    assert.ok(
        (mapClick?.options || []).every((option) => Boolean(option.hotspot?.mapLabel) && typeof option.hotspot?.x === 'number' && typeof option.hotspot?.y === 'number'),
        'map template should include explicit hotspot coordinates and labels'
    );

    console.log('check:generator passed');
};

const runQuestPlanCheck = async () => {
    const raw = await readFile('public/data/supercharge_facts.json', 'utf8');
    const facts = JSON.parse(raw) as LocalFactSeed[];

    const topics: QuestTopic[] = ['food', 'transport', 'phrases', 'shrines', 'school', 'culture'];
    const dbActivities: QuestActivity[] = [];

    for (let i = 0; i < 150; i += 1) {
        const topic = topics[i % topics.length];
        dbActivities.push({
            id: `db-${i}`,
            lesson_id: `lesson-${i % 10}`,
            type: 'multiple_choice',
            question_text: `Question ${i} for ${topic}?`,
            options: makeOptions(`Correct ${i}`, `Wrong ${i}A`, `Wrong ${i}B`),
            order_index: i,
            difficulty: (i % 3) + 1,
            topic,
            tags: [topic],
            source: 'db'
        });
    }

    const modeExpectations = [
        { mode: 'sixty' as const, segments: 1, minActivities: 7 },
        { mode: 'seventy_five' as const, segments: 2, minActivities: 14 },
        { mode: 'ninety' as const, segments: 3, minActivities: 20 }
    ];

    for (const expectation of modeExpectations) {
        const plan = buildQuestRunPlan({
            mode: expectation.mode,
            childId: 'child-check',
            readingLevel: '3-5',
            seed: `quest-plan-seed:${expectation.mode}`,
            seenContentKeys: new Set<string>(),
            dbActivities,
            facts
        });

        assert.ok(plan.activities.length >= expectation.minActivities, `${expectation.mode} plan should build a complete short run`);
        assert.equal(plan.segments.length, expectation.segments, `${expectation.mode} should create expected segments`);

        const nonInfo = plan.activities.filter((item) => item.type !== 'info');
        const nonInfoQuestionKeys = nonInfo.map((item) => getActivityContentKeys(item).find((key) => key.startsWith('question:')) || '');
        const uniqueQuestionKeys = new Set(nonInfoQuestionKeys);
        assert.equal(uniqueQuestionKeys.size, nonInfoQuestionKeys.length, `${expectation.mode} should avoid duplicate signatures`);

        const bossCount = plan.activities.filter((item) => item.isBossChallenge).length;
        const minBossCount = 1;
        assert.ok(
            bossCount >= minBossCount && bossCount <= plan.segments.length,
            `${expectation.mode} should include regular boss challenges`
        );

        const recapCount = plan.activities.filter((item) => item.id.includes(':recap')).length;
        assert.equal(recapCount, plan.segments.length, `${expectation.mode} should include one recap per segment`);

        const interactiveCount = plan.activities.filter((item) => item.type === 'map_click' || item.type === 'flashcard').length;
        assert.ok(interactiveCount > 0, `${expectation.mode} should include interactive activity types`);

        const lessonWindowViolations = nonInfo.reduce((violations, item, index, array) => {
            if (index < 2) return violations;
            const recent = [array[index - 1], array[index - 2]];
            return recent.some((recentItem) => recentItem.lesson_id === item.lesson_id) ? violations + 1 : violations;
        }, 0);
        assert.ok(lessonWindowViolations <= Math.floor(nonInfo.length * 0.25), `${expectation.mode} should keep lesson diversity`);

        const uniqueLeadTarget = Math.min(4, new Set(dbActivities.map((activity) => activity.topic)).size, plan.segments.length);
        const leadTopics = plan.segments.slice(0, uniqueLeadTarget).map((segment) => segment.topic);
        assert.equal(new Set(leadTopics).size, leadTopics.length, `${expectation.mode} should spread early segment topics`);

        let maxTypeStreak = 1;
        let currentTypeStreak = 1;
        for (let index = 1; index < nonInfo.length; index += 1) {
            if (nonInfo[index].type === nonInfo[index - 1].type) {
                currentTypeStreak += 1;
            } else {
                currentTypeStreak = 1;
            }
            maxTypeStreak = Math.max(maxTypeStreak, currentTypeStreak);
        }
        assert.ok(maxTypeStreak <= 2, `${expectation.mode} should avoid long same-type streaks`);
    }

    const shiftedPlan = buildQuestRunPlan({
        mode: 'sixty',
        childId: 'child-check',
        readingLevel: '3-5',
        seed: 'quest-plan-seed-shift',
        seenContentKeys: new Set<string>(),
        dbActivities,
        facts,
        difficultyShift: 1
    });
    assert.ok(shiftedPlan.generatedCount >= 0, 'difficulty-shifted plan should build successfully');

    console.log('check:quest-plan passed');
};

const runModeConfigCheck = async () => {
    const modeConfig = await loadQuestModeConfig();
    assert.ok(modeConfig.sixty.minutesTarget === 3, 'sixty mode target should map to short run (~3 min)');
    assert.ok(modeConfig.seventy_five.minutesTarget === 5, 'seventy_five mode target should map to short run (~5 min)');
    assert.ok(modeConfig.ninety.minutesTarget === 7, 'ninety mode target should map to short run (~7 min)');
    assert.ok(modeConfig.sixty.title.toLowerCase().includes('question'), 'short mode title should be question-based');
    assert.ok(modeConfig.ninety.bossIntervalMinutes >= 3, 'short-run boss interval should stay sane');
    console.log('check:mode-config passed');
};

const runLessonProgressContractCheck = async () => {
    const infoPhase = deriveLessonProgressPhase({
        activityType: 'info',
        isSelectionMade: false,
        isCompleted: false,
        isLast: false,
        autoAdvancePending: false
    });
    assert.equal(infoPhase, 'ready_to_continue', 'info activity should always be continue-ready');
    assert.equal(getLessonPrimaryActionLabel(infoPhase, { activityType: 'info', isLast: false }), 'Continue ->', 'info label should use continue copy');

    const waitingPhase = deriveLessonProgressPhase({
        activityType: 'multiple_choice',
        isSelectionMade: false,
        isCompleted: false,
        isLast: false,
        autoAdvancePending: false
    });
    assert.equal(waitingPhase, 'awaiting_input', 'question activity should wait for selection before submit');
    assert.equal(canUseLessonPrimaryAction(waitingPhase), false, 'awaiting_input should keep primary action disabled');

    const submitPhase = deriveLessonProgressPhase({
        activityType: 'multiple_choice',
        isSelectionMade: true,
        isCompleted: false,
        isLast: false,
        autoAdvancePending: false
    });
    assert.equal(submitPhase, 'ready_to_submit', 'question activity should become submit-ready once selection is made');
    assert.equal(getLessonPrimaryActionLabel(submitPhase, { activityType: 'multiple_choice', isLast: false }), 'Check Answer', 'submit-ready should keep check-answer copy');

    const continuePhase = deriveLessonProgressPhase({
        activityType: 'multiple_choice',
        isSelectionMade: true,
        isCompleted: true,
        isLast: false,
        autoAdvancePending: false
    });
    assert.equal(continuePhase, 'ready_to_continue', 'completed activity should move to continue-ready phase');
    assert.equal(getLessonPrimaryActionLabel(continuePhase, { activityType: 'multiple_choice', isLast: false }), 'Next Activity ->', 'completed non-final activity should show next label');

    const finalPhase = deriveLessonProgressPhase({
        activityType: 'multiple_choice',
        isSelectionMade: true,
        isCompleted: true,
        isLast: true,
        autoAdvancePending: false
    });
    assert.equal(getLessonPrimaryActionLabel(finalPhase, { activityType: 'multiple_choice', isLast: true }), 'Finish Lesson', 'final completed activity should show finish label');

    const autoPhase = deriveLessonProgressPhase({
        activityType: 'multiple_choice',
        isSelectionMade: true,
        isCompleted: true,
        isLast: false,
        autoAdvancePending: true
    });
    assert.equal(autoPhase, 'auto_advancing', 'auto-advance pending should expose auto-advancing phase');

    assert.equal(
        shouldEnableLessonStuckFallback({
            activityType: 'multiple_choice',
            phase: 'awaiting_input',
            isCompleted: false,
            attemptsWithoutProgress: 2,
            elapsedMs: 1000
        }),
        true,
        'stuck fallback should activate after repeated no-progress attempts'
    );
    assert.equal(
        shouldEnableLessonStuckFallback({
            activityType: 'multiple_choice',
            phase: 'awaiting_input',
            isCompleted: false,
            attemptsWithoutProgress: 0,
            elapsedMs: 13000
        }),
        true,
        'stuck fallback should activate after elapsed timeout'
    );
    assert.equal(
        shouldEnableLessonStuckFallback({
            activityType: 'info',
            phase: 'ready_to_continue',
            isCompleted: false,
            attemptsWithoutProgress: 3,
            elapsedMs: 15000
        }),
        false,
        'stuck fallback should not show for info slides'
    );

    const [lessonEngineSource, multiChoiceSource, interactiveSource] = await Promise.all([
        readFile('src/components/Lesson/LessonEngine.tsx', 'utf8'),
        readFile('src/components/Lesson/Activities/MultipleChoice.tsx', 'utf8'),
        readFile('src/components/Lesson/Activities/InteractiveActivity.tsx', 'utf8')
    ]);
    assert.ok(lessonEngineSource.includes('deriveLessonProgressPhase'), 'lesson engine should use progress machine phase derivation');
    assert.ok(lessonEngineSource.includes('Need help? Show hint'), 'lesson engine should include hint fallback CTA');
    assert.ok(multiChoiceSource.includes('submitTrigger'), 'multiple choice should support deterministic submit trigger path');
    assert.ok(interactiveSource.includes('submitTrigger'), 'interactive activity should support deterministic submit trigger path');
    console.log('check:lesson-progress-contract passed');
};

const runMiniQuestVarietyCheck = async () => {
    const [miniQuestSource, questBoardSource, questRunSource, memorySource] = await Promise.all([
        readFile('src/lib/supercharge/miniQuests.ts', 'utf8'),
        readFile('src/pages/QuestBoard.tsx', 'utf8'),
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/lib/supercharge/questRunMemory.ts', 'utf8')
    ]);

    assert.ok(miniQuestSource.includes('RECENT_REPEAT_BLOCK_DAYS'), 'mini quests should avoid near-day repeat selection');
    assert.ok(miniQuestSource.includes('rerollDailyMiniQuest'), 'mini quests should expose reroll helper');
    assert.ok(miniQuestSource.includes('loadMiniQuestWeeklySummary'), 'mini quests should expose weekly summary helper');
    assert.ok(questBoardSource.includes('swapDailyQuest'), 'quest board should support daily quest swap action');
    assert.ok(questBoardSource.includes('Weekly Rhythm'), 'quest board should show weekly rhythm summary');
    assert.ok(questRunSource.includes('loadQuestRunHistory'), 'quest run should load run history');
    assert.ok(questRunSource.includes('saveLastQuestMode'), 'quest run should persist last used mode');
    assert.ok(memorySource.includes('appendQuestRunHistory'), 'quest run memory should store historical run rows');
    console.log('check:mini-quest-variety passed');
};

const runKidSafeCopyLintCheck = async () => {
    const files = [
        'public/data/supercharge_facts.json',
        'src/pages/QuestRun.tsx',
        'src/components/Lesson/Activities/MultipleChoice.tsx',
        'src/components/Lesson/LessonEngine.tsx'
    ];

    for (const file of files) {
        const content = await readFile(file, 'utf8');
        KID_SAFE_BLOCKLIST.forEach((pattern) => {
            assert.ok(!pattern.test(content), `kid-safe lint blocked by ${pattern} in ${file}`);
        });
    }

    console.log('check:kid-safe-copy passed');
};

const runBossTemplateCheck = () => {
    const topics: QuestTopic[] = ['food', 'transport', 'phrases', 'shrines', 'school', 'culture', 'nature', 'general'];
    topics.forEach((topic, index) => {
        const prompt = buildBossChallengeQuestion(topic, `What is a good ${topic} choice?`, index);
        assert.ok(prompt.startsWith('Boss Challenge:'), `boss template should include boss header for ${topic}`);
        assert.ok(!/true\s*or\s*false/i.test(prompt), `boss template should avoid true/false wording for ${topic}`);
        assert.ok(prompt.includes('Choose the best answer.'), `boss template should end with clear instruction for ${topic}`);
    });

    console.log('check:boss-template passed');
};

const runQueueIntegrationCheck = async () => {
    const syncQueueSource = await readFile('src/lib/syncQueue.ts', 'utf8');
    const segmentEventSource = await readFile('src/lib/supercharge/segmentEvents.ts', 'utf8');
    const telemetrySource = await readFile('src/lib/supercharge/planTelemetry.ts', 'utf8');
    const adaptiveSource = await readFile('src/lib/supercharge/adaptiveDifficulty.ts', 'utf8');
    const adaptivePacingSource = await readFile('src/lib/supercharge/adaptivePacingEvents.ts', 'utf8');
    const adaptiveTopicSource = await readFile('src/lib/supercharge/adaptiveTopicPacing.ts', 'utf8');
    const transcriptSource = await readFile('src/lib/supercharge/sessionTranscripts.ts', 'utf8');
    assert.ok(syncQueueSource.includes('quest_segment_event'), 'sync queue should support quest_segment_event kind');
    assert.ok(syncQueueSource.includes('quest_plan_telemetry'), 'sync queue should support quest_plan_telemetry kind');
    assert.ok(syncQueueSource.includes('adaptive_difficulty_profile'), 'sync queue should support adaptive_difficulty_profile kind');
    assert.ok(syncQueueSource.includes('adaptive_pacing_event'), 'sync queue should support adaptive_pacing_event kind');
    assert.ok(syncQueueSource.includes('adaptive_topic_pacing'), 'sync queue should support adaptive_topic_pacing kind');
    assert.ok(syncQueueSource.includes('quest_session_transcript'), 'sync queue should support quest_session_transcript kind');
    assert.ok(segmentEventSource.includes("from('quest_segment_events')"), 'segment events should persist to quest_segment_events');
    assert.ok(telemetrySource.includes("from('quest_plan_telemetry')"), 'plan telemetry should persist to quest_plan_telemetry');
    assert.ok(adaptiveSource.includes("from('adaptive_difficulty_profiles')"), 'adaptive difficulty should persist to adaptive_difficulty_profiles');
    assert.ok(adaptivePacingSource.includes("from('adaptive_pacing_events')"), 'adaptive pacing events should persist to adaptive_pacing_events');
    assert.ok(adaptiveTopicSource.includes("from('adaptive_topic_pacing_events')"), 'adaptive topic pacing should persist to adaptive_topic_pacing_events');
    assert.ok(transcriptSource.includes("from('quest_session_transcripts')"), 'session transcripts should persist to quest_session_transcripts');
    console.log('check:queue-integration passed');
};

const runRetryQueueHandlingCheck = async () => {
    const syncQueueSource = await readFile('src/lib/syncQueue.ts', 'utf8');
    assert.ok(syncQueueSource.includes('processQueueItems('), 'queue retry should process items through retry-safe helper');
    assert.ok(syncQueueSource.includes('for (const item of succeeded)'), 'queue retry should delete only successful items');
    assert.ok(syncQueueSource.includes('attempt_count'), 'queue retry should track attempt_count metadata');
    assert.ok(syncQueueSource.includes('next_retry_at'), 'queue retry should track next_retry_at metadata');
    assert.ok(syncQueueSource.includes('toBackoffDelayMs'), 'queue retry should apply retry backoff');
    assert.ok(syncQueueSource.includes("console.error('Sync failed for item'"), 'queue retry should keep failed items for retry');
    console.log('check:retry-queue-handling passed');
};

const runQueueRetryMockedIntegrationCheck = async () => {
    const queueItems = [
        { id: 1, kind: 'content_history' },
        { id: 2, kind: 'quest_plan_telemetry' },
        { id: 3, kind: 'adaptive_pacing_event' }
    ];

    const failedOnFirstPass = new Set<number>([2]);
    const firstPass = await processQueueItems(queueItems, async (item) => {
        if (failedOnFirstPass.has(item.id)) {
            failedOnFirstPass.delete(item.id);
            throw new Error('mocked supabase failure');
        }
    });

    assert.deepEqual(firstPass.succeeded.map((item) => item.id), [1, 3], 'first pass should keep failed item pending');
    assert.deepEqual(firstPass.failed.map((item) => item.id), [2], 'first pass should retain one failed item');

    const secondPass = await processQueueItems(firstPass.failed, async () => {});
    assert.equal(secondPass.failed.length, 0, 'second pass should flush retried pending items');
    assert.deepEqual(secondPass.succeeded.map((item) => item.id), [2], 'second pass should sync remaining item');

    console.log('check:queue-retry-mocked-integration passed');
};

const runOfflineSyncSmokeCheck = async () => {
    const [contentHistorySource, miniQuestSource, segmentSource, planTelemetrySource, adaptiveSource, adaptivePacingSource, adaptiveTopicSource, transcriptSource] = await Promise.all([
        readFile('src/lib/supercharge/contentHistory.ts', 'utf8'),
        readFile('src/lib/supercharge/miniQuests.ts', 'utf8'),
        readFile('src/lib/supercharge/segmentEvents.ts', 'utf8'),
        readFile('src/lib/supercharge/planTelemetry.ts', 'utf8'),
        readFile('src/lib/supercharge/adaptiveDifficulty.ts', 'utf8'),
        readFile('src/lib/supercharge/adaptivePacingEvents.ts', 'utf8'),
        readFile('src/lib/supercharge/adaptiveTopicPacing.ts', 'utf8'),
        readFile('src/lib/supercharge/sessionTranscripts.ts', 'utf8')
    ]);

    assert.ok(contentHistorySource.includes('saveContentHistoryOffline'), 'content history should queue offline');
    assert.ok(miniQuestSource.includes('saveMiniQuestProgressOffline'), 'mini quest progress should queue offline');
    assert.ok(segmentSource.includes('saveQuestSegmentEventOffline'), 'segment events should queue offline');
    assert.ok(planTelemetrySource.includes('saveQuestPlanTelemetryOffline'), 'plan telemetry should queue offline');
    assert.ok(adaptiveSource.includes('saveAdaptiveDifficultyProfileOffline'), 'adaptive profile should queue offline');
    assert.ok(adaptivePacingSource.includes('saveAdaptivePacingEventOffline'), 'adaptive pacing events should queue offline');
    assert.ok(adaptiveTopicSource.includes('saveAdaptiveTopicPacingOffline'), 'adaptive topic pacing should queue offline');
    assert.ok(transcriptSource.includes('saveQuestSessionTranscriptOffline'), 'session transcripts should queue offline');
    console.log('check:offline-sync-smoke passed');
};

const runLocalizationAuditCheck = async () => {
    const [baseRaw, v1Raw] = await Promise.all([
        readFile('public/data/supercharge_facts.json', 'utf8'),
        readFile('public/data/supercharge_facts.v1.json', 'utf8')
    ]);

    const baseFacts = JSON.parse(baseRaw) as LocalFactSeed[];
    const v1Facts = JSON.parse(v1Raw) as LocalFactSeed[];
    assert.ok(v1Facts.length >= baseFacts.length, 'v1 fact pack should be at least as large as base pack');

    v1Facts.forEach((fact, index) => {
        const payload = `${fact.story} ${fact.question}`;
        PHONETIC_RULES.forEach((rule) => {
            if (rule.term.test(payload)) {
                assert.ok(rule.phonetic.test(payload), `fact ${index} must include phonetic spelling for matched Japanese term`);
            }
        });
    });

    console.log('check:localization-audit passed');
};

const runInteractionAccessibilityCheck = async () => {
    const interactiveSource = await readFile('src/components/Lesson/Activities/InteractiveActivity.tsx', 'utf8');
    assert.ok(interactiveSource.includes('ArrowUp'), 'interactive flashcard should support ArrowUp reordering');
    assert.ok(interactiveSource.includes('ArrowDown'), 'interactive flashcard should support ArrowDown reordering');
    assert.ok(interactiveSource.includes('draggable={!submitted}'), 'interactive flashcard should support drag interactions');
    assert.ok(interactiveSource.includes('aria-label='), 'interactive activities should include aria labels');
    assert.ok(interactiveSource.includes('toHotspotPosition'), 'map click should use explicit hotspot coordinates when available');
    assert.ok(interactiveSource.includes('mapLabel'), 'map click should surface map labels');
    console.log('check:interaction-accessibility passed');
};

const runKeyboardOnlyProgressionCheck = async () => {
    const [lessonEngineSource, multipleChoiceSource, interactiveSource, dashboardSource] = await Promise.all([
        readFile('src/components/Lesson/LessonEngine.tsx', 'utf8'),
        readFile('src/components/Lesson/Activities/MultipleChoice.tsx', 'utf8'),
        readFile('src/components/Lesson/Activities/InteractiveActivity.tsx', 'utf8'),
        readFile('src/components/Dashboard/ChildDashboard.tsx', 'utf8')
    ]);

    assert.ok(multipleChoiceSource.includes('window.addEventListener(\'keydown\''), 'multiple choice should listen for keyboard input');
    assert.ok(multipleChoiceSource.includes('key === \'enter\''), 'multiple choice should support Enter submit');
    assert.ok(interactiveSource.includes('onKeyDown'), 'interactive activities should support keyboard progression');
    assert.ok(interactiveSource.includes('ArrowDown'), 'interactive activities should support keyboard reordering');
    assert.ok(lessonEngineSource.includes('onActivityAnswered'), 'lesson engine should expose activity callbacks for full progression');
    assert.ok(dashboardSource.includes('tabIndex={0}'), 'dashboard category cards should be keyboard focusable');
    console.log('check:keyboard-progression passed');
};

const runDatePresetAndCsvSchemaCheck = async () => {
    const [parentAdminSource, csvSchemaSource, presetSource] = await Promise.all([
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/lib/supercharge/csvSchema.ts', 'utf8'),
        readFile('src/lib/supercharge/reportDatePresets.ts', 'utf8')
    ]);

    assert.ok(parentAdminSource.includes('School Term'), 'parent admin should provide school-term date preset');
    assert.ok(parentAdminSource.includes('applyDatePreset'), 'parent admin should apply date presets');
    assert.ok(parentAdminSource.includes('Import CSV (Preview)'), 'parent admin should support CSV import preview');
    assert.ok(csvSchemaSource.includes('SUPERCHARGE_CSV_SCHEMA_VERSION'), 'CSV schema helper should define schema version');
    assert.ok(csvSchemaSource.includes('inspectCsvSchema'), 'CSV schema helper should parse previews');
    assert.ok(csvSchemaSource.includes('issues'), 'CSV schema helper should return column-level issues');
    assert.ok(csvSchemaSource.includes('suggestions'), 'CSV schema helper should return fix suggestions');
    assert.ok(presetSource.includes('resolveReportDatePreset'), 'date preset helper should resolve report ranges');
    console.log('check:presets-and-csv-schema passed');
};

const runCsvSchemaEdgeCaseCheck = () => {
    const csv = [
        'schema_version,export_type,child_name,session_key,date_key,topic,question,order',
        'supercharge.v2,session_transcript,"Kid, Name",session-1,2026-02-14,phrases,"Said ""Konnichiwa (Kon-NEE-chee-wah)""",1',
        'supercharge.v2,session_transcript,Explorer,session-1,2026-02-14,food,"Line one',
        'Line two",2'
    ].join('\n');

    const rows = parseCsvRows(csv);
    assert.equal(rows.length, 3, 'CSV parser should keep multiline quoted row as one record');
    assert.equal(rows[1][2], 'Kid, Name', 'CSV parser should preserve quoted commas');
    assert.equal(rows[1][6], 'Said "Konnichiwa (Kon-NEE-chee-wah)"', 'CSV parser should unescape quoted quotes');
    assert.equal(rows[2][6], 'Line one\nLine two', 'CSV parser should preserve quoted newlines');

    const preview = inspectCsvSchema(csv);
    assert.equal(preview.valid, true, 'CSV preview should validate expected schema');
    assert.equal(preview.rowCount, 2, 'CSV preview should count multiline row correctly');
    assert.equal(preview.exportType, 'session_transcript', 'CSV preview should detect export type');
    assert.equal(preview.issues.length, 0, 'CSV preview should avoid reporting issues for valid CSV');

    console.log('check:csv-schema-edge-cases passed');
};

const runShortageAlertCheck = async () => {
    const parentAdminSource = await readFile('src/pages/ParentAdmin.tsx', 'utf8');
    assert.ok(parentAdminSource.includes('Shortage Alert'), 'parent admin should show shortage alert badge');
    assert.ok(parentAdminSource.includes('getShortageAlert'), 'parent admin should compute shortage pressure');
    console.log('check:shortage-alert passed');
};

const runParentAdminWave11Check = async () => {
    const [parentAdminSource, syncQueueSource] = await Promise.all([
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/lib/syncQueue.ts', 'utf8')
    ]);

    assert.ok(parentAdminSource.includes('Queue Dashboard'), 'parent admin should include queue dashboard card');
    assert.ok(parentAdminSource.includes('Anomaly Alerts'), 'parent admin should include anomaly alert summary');
    assert.ok(parentAdminSource.includes('Copy-safe Replay'), 'parent admin should include copy-safe replay action');
    assert.ok(parentAdminSource.includes('Print Transcript PDF'), 'parent admin should include transcript PDF fallback action');
    assert.ok(parentAdminSource.includes('Topic Trend Filter'), 'parent admin should include topic trend filter controls');
    assert.ok(parentAdminSource.includes('Branch Trend Filter'), 'parent admin should include branch trend filter controls');
    assert.ok(parentAdminSource.includes('get_family_quest_telemetry_rollup'), 'parent admin should use telemetry rollup RPC');
    assert.ok(parentAdminSource.includes('get_family_quest_telemetry_weekly'), 'parent admin should use weekly telemetry RPC');
    assert.ok(syncQueueSource.includes('getQueueDiagnostics'), 'sync queue should expose queue diagnostics helper');

    console.log('check:parent-admin-wave11 passed');
};

const runParentAdminWave12Check = async () => {
    const [parentAdminSource, questRunSource, syncQueueSource, wave12MigrationSource] = await Promise.all([
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/lib/syncQueue.ts', 'utf8'),
        readFile('supabase/migrations/20260214_supercharge_wave12_branch_analytics_and_anomaly_controls.sql', 'utf8')
    ]);

    assert.ok(parentAdminSource.includes('Replay In App'), 'parent admin should include replay-in-app action');
    assert.ok(parentAdminSource.includes('Transcript Replay'), 'parent admin should include transcript replay modal');
    assert.ok(parentAdminSource.includes('Weekly PDF Packet'), 'parent admin should include weekly packet export');
    assert.ok(parentAdminSource.includes('Last 24h trend'), 'parent admin should include queue trend sparkline');
    assert.ok(parentAdminSource.includes('child_anomaly_alert_controls'), 'parent admin should read anomaly mute controls');
    assert.ok(parentAdminSource.includes('branchBreakdown'), 'topic pacing view should include branch breakdown output');
    assert.ok(parentAdminSource.includes('SpeakButton'), 'transcript replay mode should support TTS');
    assert.ok(questRunSource.includes('branch_key'), 'quest run should persist branch keys on activity answers');
    assert.ok(syncQueueSource.includes('branch_name'), 'offline sync queue should persist branch names for topic pacing');
    assert.ok(wave12MigrationSource.includes('child_anomaly_alert_controls'), 'wave12 migration should add anomaly control table');
    assert.ok(wave12MigrationSource.includes('branch_key'), 'wave12 migration should add branch key to topic pacing table');

    console.log('check:parent-admin-wave12 passed');
};

const runHotspotValidatorCheck = async () => {
    const [validatorSource, fetchSource] = await Promise.all([
        readFile('src/lib/supercharge/hotspotValidator.ts', 'utf8'),
        readFile('src/lib/supercharge/fetchQuestContent.ts', 'utf8')
    ]);
    assert.ok(validatorSource.includes('MIN_DISTANCE_PERCENT'), 'hotspot validator should check overlap distance');
    assert.ok(validatorSource.includes('bounds'), 'hotspot validator should report bounds issues');
    assert.ok(validatorSource.includes('MAX_JITTER_ATTEMPTS'), 'hotspot validator should define deterministic overlap auto-heal attempts');
    assert.ok(validatorSource.includes('jitterPoint'), 'hotspot validator should apply deterministic jitter for overlap auto-heal');
    assert.ok(fetchSource.includes('validateAndNormalizeHotspots'), 'quest content fetch should run hotspot validator');
    console.log('check:hotspot-validator passed');
};

const runTranscriptExportCheck = async () => {
    const [parentAdminSource, questRunSource, transcriptSource] = await Promise.all([
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/lib/supercharge/sessionTranscripts.ts', 'utf8')
    ]);

    assert.ok(parentAdminSource.includes('Export Transcript'), 'parent admin should offer transcript export');
    assert.ok(parentAdminSource.includes("from('quest_session_transcripts')"), 'parent admin should read quest_session_transcripts');
    assert.ok(parentAdminSource.includes('Copy-safe Replay'), 'parent admin should offer copy-safe replay cards');
    assert.ok(parentAdminSource.includes('Print Transcript PDF'), 'parent admin should offer transcript PDF print fallback');
    assert.ok(questRunSource.includes('persistQuestSessionTranscript'), 'quest run should persist session transcript');
    assert.ok(transcriptSource.includes('toTranscriptQuestion'), 'session transcript helper should sanitize questions');
    console.log('check:transcript-export passed');
};

const runReducedMotionCoverageCheck = async () => {
    const [indexCssSource, parentAdminSource, questRunSource] = await Promise.all([
        readFile('src/index.css', 'utf8'),
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/pages/QuestRun.tsx', 'utf8')
    ]);

    assert.ok(indexCssSource.includes('supercharge-reduce-motion'), 'global styles should include reduce-motion class overrides');
    assert.ok(indexCssSource.includes('transition-duration: 0.01ms'), 'reduce-motion style should clamp transitions');
    assert.ok(parentAdminSource.includes('Reduce Motion'), 'parent admin should expose reduce-motion control');
    assert.ok(questRunSource.includes('preferences.reduceMotion ? false : true'), 'quest run should adjust behavior for reduce-motion profiles');
    console.log('check:reduced-motion-coverage passed');
};

const runCiMatrixSmokeCheck = async () => {
    const [workflowSource, browserSmokeSource] = await Promise.all([
        readFile('.github/workflows/supercharge_offline_smoke.yml', 'utf8'),
        readFile('scripts/browser_offline_online_smoke.cjs', 'utf8')
    ]);

    assert.ok(workflowSource.includes('matrix:'), 'smoke workflow should use browser matrix');
    assert.ok(workflowSource.includes('chromium'), 'smoke workflow should include chromium');
    assert.ok(workflowSource.includes('webkit'), 'smoke workflow should include webkit');
    assert.ok(workflowSource.includes('SMOKE_BROWSER'), 'workflow should pass SMOKE_BROWSER env');
    assert.ok(workflowSource.includes('SMOKE_ARTIFACT_DIR'), 'workflow should pass smoke artifact directory env');
    assert.ok(workflowSource.includes('upload-artifact'), 'workflow should upload smoke artifacts');
    assert.ok(browserSmokeSource.includes('SMOKE_BROWSER'), 'browser smoke runner should read SMOKE_BROWSER');
    assert.ok(browserSmokeSource.includes('SMOKE_ARTIFACT_DIR'), 'browser smoke runner should handle artifact directory');
    assert.ok(browserSmokeSource.includes('page.screenshot'), 'browser smoke runner should capture screenshots');
    console.log('check:ci-matrix-smoke passed');
};

const runNightlyTriageWorkflowCheck = async () => {
    const workflowSource = await readFile('.github/workflows/supercharge_offline_smoke.yml', 'utf8');
    assert.ok(workflowSource.includes('schedule:'), 'workflow should include nightly schedule trigger');
    assert.ok(workflowSource.includes('cron:'), 'workflow should define cron schedule');
    assert.ok(workflowSource.includes('triage-smoke-failures'), 'workflow should include triage label job');
    assert.ok(workflowSource.includes('triage:supercharge-smoke-fail'), 'workflow should apply smoke failure triage label');
    assert.ok(workflowSource.includes('actions/github-script'), 'workflow triage should use github-script');
    console.log('check:nightly-triage-workflow passed');
};

const runTelemetryMaintenanceDocsCheck = async () => {
    const [docsSource, migrationSource, rollupMigrationSource] = await Promise.all([
        readFile('docs/telemetry_maintenance.md', 'utf8'),
        readFile('supabase/migrations/20260214_supercharge_wave10_topic_pacing_and_maintenance.sql', 'utf8'),
        readFile('supabase/migrations/20260214_supercharge_wave11_admin_rollups.sql', 'utf8')
    ]);

    assert.ok(docsSource.includes('Retention policy'), 'maintenance docs should include retention policy');
    assert.ok(docsSource.includes('prune_supercharge_telemetry'), 'maintenance docs should reference prune function');
    assert.ok(docsSource.includes('verify_supercharge_retention'), 'maintenance docs should reference retention verification helper');
    assert.ok(docsSource.includes('maintenance:retention'), 'maintenance docs should include scripted maintenance command');
    assert.ok(migrationSource.includes('CREATE OR REPLACE FUNCTION public.prune_supercharge_telemetry'), 'migration should define prune function');
    assert.ok(rollupMigrationSource.includes('CREATE OR REPLACE FUNCTION public.get_family_quest_telemetry_rollup'), 'rollup migration should define telemetry rollup RPC');
    assert.ok(rollupMigrationSource.includes('CREATE OR REPLACE FUNCTION public.get_family_quest_telemetry_weekly'), 'rollup migration should define weekly telemetry RPC');
    assert.ok(rollupMigrationSource.includes('CREATE OR REPLACE FUNCTION public.verify_supercharge_retention'), 'rollup migration should define retention verification helper');
    console.log('check:telemetry-maintenance-docs passed');
};

const runOpsScriptCoverageCheck = async () => {
    const [packageSource, benchmarkScriptSource, maintenanceScriptSource, benchmarkDocsSource] = await Promise.all([
        readFile('package.json', 'utf8'),
        readFile('scripts/rpc_benchmark_supercharge.cjs', 'utf8'),
        readFile('scripts/run_retention_maintenance.cjs', 'utf8'),
        readFile('docs/rpc_benchmark.md', 'utf8')
    ]);

    assert.ok(packageSource.includes('benchmark:supercharge-rpc'), 'package scripts should expose rpc benchmark command');
    assert.ok(packageSource.includes('maintenance:retention'), 'package scripts should expose retention maintenance command');
    assert.ok(benchmarkScriptSource.includes('get_family_quest_telemetry_rollup'), 'benchmark script should call rollup RPC');
    assert.ok(benchmarkScriptSource.includes('get_family_quest_telemetry_weekly'), 'benchmark script should call weekly RPC');
    assert.ok(benchmarkScriptSource.includes('BENCH_TARGET_ROLLUP_P95_MS'), 'benchmark script should support latency targets');
    assert.ok(maintenanceScriptSource.includes('verify_supercharge_retention'), 'maintenance script should call retention verification RPC');
    assert.ok(maintenanceScriptSource.includes('p_execute_prune: true'), 'maintenance script should run prune execution mode');
    assert.ok(benchmarkDocsSource.includes('Latency targets'), 'benchmark docs should include latency targets');
    console.log('check:ops-script-coverage passed');
};

const runCulturalReviewCoverageCheck = async () => {
    const [generatorSource, contentQualitySource, reviewFactRaw] = await Promise.all([
        readFile('src/lib/supercharge/generator.ts', 'utf8'),
        readFile('src/lib/supercharge/contentQuality.ts', 'utf8'),
        readFile('public/data/supercharge_facts.review.json', 'utf8')
    ]);

    const reviewFacts = JSON.parse(reviewFactRaw) as LocalFactSeed[];
    assert.ok(reviewFacts.length >= 8, 'review fact pack should include expanded curated facts');
    const regionalFacts = reviewFacts.filter((fact) => fact.sourceConfidence === 'regional');
    assert.ok(regionalFacts.length >= 3, 'review fact pack should include multiple regional facts');
    regionalFacts.forEach((fact, index) => {
        assert.ok(
            typeof fact.sourceNote === 'string' && fact.sourceNote.toLowerCase().includes('different in different places'),
            `regional review fact ${index} should include a regional source note`
        );
    });

    assert.ok(generatorSource.includes('/data/supercharge_facts.review.json'), 'generator should load review fact pack');
    assert.ok(generatorSource.includes('TOPIC_REGIONAL_NOTES'), 'generator should include regional fallback notes');
    assert.ok(generatorSource.includes('source:regional-note'), 'generator should tag regional-note output');
    assert.ok(contentQualitySource.includes('READING_LEVEL_SIMPLIFY_MAP'), 'content quality should enforce reading-level vocabulary maps');
    assert.ok(contentQualitySource.includes('enforceVocabularyByReadingLevel'), 'content quality should export reading-level vocabulary guard');

    const generated = generateQuestionsFromFacts({
        facts: reviewFacts,
        topic: 'culture',
        difficulty: 'Scout',
        readingLevel: 'K-2',
        count: 2,
        existingQuestionKeys: new Set<string>(),
        seed: 'culture-review-check'
    });
    assert.ok(generated.length > 0, 'generator should produce output from review fact pack');
    assert.ok(
        generated.some((item) => (item.explanation || '').toLowerCase().includes('different in different places')),
        'regional generated explanations should carry place-variation note'
    );
    generated.forEach((item, index) => {
        assert.ok(item.story.split(/[.!?]/).filter(Boolean).length <= 2, `review generated story ${index} should stay short`);
    });

    console.log('check:cultural-review-coverage passed');
};

const runRoutePrefetchCheck = async () => {
    const [prefetchSource, dashboardSource, boardSource] = await Promise.all([
        readFile('src/lib/supercharge/routePrefetch.ts', 'utf8'),
        readFile('src/components/Dashboard/ChildDashboard.tsx', 'utf8'),
        readFile('src/pages/QuestBoard.tsx', 'utf8')
    ]);

    assert.ok(prefetchSource.includes("import('../../pages/QuestRun')"), 'route prefetch should include QuestRun chunk');
    assert.ok(prefetchSource.includes("import('../../pages/PracticePlayer')"), 'route prefetch should include PracticePlayer chunk');
    assert.ok(prefetchSource.includes("import('../../components/Dashboard/CategoryDetail')"), 'route prefetch should include CategoryDetail chunk');
    assert.ok(dashboardSource.includes('prefetchQuestRunRoute'), 'dashboard should prefetch quest run route');
    assert.ok(dashboardSource.includes('prefetchPracticeRoute'), 'dashboard should prefetch practice route');
    assert.ok(dashboardSource.includes('prefetchCategoryRoute'), 'dashboard should prefetch category route');
    assert.ok(boardSource.includes('prefetchQuestRunRoute'), 'quest board should prefetch quest run route');
    console.log('check:route-prefetch passed');
};

const runWave13SessionVarietyCheck = async () => {
    const [questBoardSource, questRunSource, miniQuestSource, memorySource] = await Promise.all([
        readFile('src/pages/QuestBoard.tsx', 'utf8'),
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/lib/supercharge/miniQuests.ts', 'utf8'),
        readFile('src/lib/supercharge/questRunMemory.ts', 'utf8')
    ]);

    assert.ok(questBoardSource.includes('Weekly Rhythm'), 'quest board should include weekly mini-quest rhythm card');
    assert.ok(questBoardSource.includes('Swap quest'), 'quest board should include quest swap action');
    assert.ok(questRunSource.includes('Recent Quest Runs'), 'quest run start should include recent run history card');
    assert.ok(questRunSource.includes('Last used'), 'quest run start should mark last used mode');
    assert.ok(questRunSource.includes('Segment progress'), 'quest run should include segment progress indicator');
    assert.ok(miniQuestSource.includes('rerollDailyMiniQuest'), 'mini quest helper should expose reroll helper');
    assert.ok(miniQuestSource.includes('loadMiniQuestWeeklySummary'), 'mini quest helper should expose weekly summary helper');
    assert.ok(miniQuestSource.includes('RECENT_REPEAT_BLOCK_DAYS'), 'mini quest helper should avoid near-day repeats');
    assert.ok(memorySource.includes('appendQuestRunHistory'), 'quest run memory helper should persist run history');
    assert.ok(memorySource.includes('saveLastQuestMode'), 'quest run memory helper should persist last mode');
    console.log('check:wave13-session-variety passed');
};

const runWave14SessionControlCheck = async () => {
    const [questRunSource, questBoardSource, parentAdminSource, childPreferencesSource, speakButtonSource, questBuilderSource] = await Promise.all([
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/pages/QuestBoard.tsx', 'utf8'),
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/lib/supercharge/childPreferences.ts', 'utf8'),
        readFile('src/components/common/SpeakButton.tsx', 'utf8'),
        readFile('src/lib/supercharge/questRunBuilder.ts', 'utf8')
    ]);

    assert.ok(questRunSource.includes('Save and Exit'), 'quest run should include manual save and exit action');
    assert.ok(questRunSource.includes('Route:'), 'quest mode cards should include route preview');
    assert.ok(questRunSource.includes('Bosses:'), 'quest mode cards should include boss count preview');
    assert.ok(questRunSource.includes('Content-gap hotspots'), 'quest run should expose content-gap hotspot counters');
    assert.ok(questBoardSource.includes('Weekly Topic Theme'), 'quest board should include weekly topic theme banner');
    assert.ok(questBoardSource.includes('allowDailyQuestReroll'), 'quest board should respect parent reroll preference');
    assert.ok(parentAdminSource.includes('Allow Quest Swap'), 'parent admin should control reroll toggle per child');
    assert.ok(parentAdminSource.includes('Playback speed'), 'replay modal should include playback speed control');
    assert.ok(parentAdminSource.includes('Export Branch CSV'), 'parent admin should export branch mastery csv');
    assert.ok(parentAdminSource.includes('Export JSON'), 'queue dashboard should export diagnostics json');
    assert.ok(childPreferencesSource.includes('allow_daily_quest_reroll'), 'child preferences should persist reroll toggle');
    assert.ok(speakButtonSource.includes('rateOverride'), 'speak button should support playback rate override');
    assert.ok(questBuilderSource.includes('fallbackByTopic'), 'quest builder should include fallback counters by topic');
    assert.ok(questBuilderSource.includes('buildRecapVoiceText'), 'quest builder should use reading-level recap voice presets');
    console.log('check:wave14-session-control passed');
};

const runWave15SessionControlCheck = async () => {
    const [
        questRunSource,
        questBoardSource,
        parentAdminSource,
        childDashboardSource,
        childPreferencesSource,
        wave15MigrationSource
    ] = await Promise.all([
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/pages/QuestBoard.tsx', 'utf8'),
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/components/Dashboard/ChildDashboard.tsx', 'utf8'),
        readFile('src/lib/supercharge/childPreferences.ts', 'utf8'),
        readFile('supabase/migrations/20260214_supercharge_wave15_theme_and_fallback_controls.sql', 'utf8')
    ]);

    assert.ok(questRunSource.includes('data-testid="quest-run-save-exit"'), 'quest run should expose save-and-exit test id');
    assert.ok(questRunSource.includes('data-testid="quest-run-time-status"'), 'quest run should expose time status test id');
    assert.ok(questRunSource.includes('data-testid="quest-run-segment-progress"'), 'quest run should expose segment progress test id');
    assert.ok(questRunSource.includes('fallbackWarningThresholdPct'), 'quest run should apply fallback warning threshold');
    assert.ok(questRunSource.includes('Fallback mix:'), 'quest run mode preview should show fallback mix percentage');
    assert.ok(questRunSource.includes('Latest vs previous run'), 'quest run should show latest vs previous run comparison');
    assert.ok(questBoardSource.includes('Compact view'), 'quest board should expose compact mode toggle');
    assert.ok(questBoardSource.includes('weeklyThemeOverride'), 'quest board should support parent weekly theme override');
    assert.ok(parentAdminSource.includes('Export Hotspots CSV'), 'parent admin should export hotspot session CSV');
    assert.ok(parentAdminSource.includes('buildMasteryPointTooltip'), 'parent admin should provide mastery delta tooltip helper');
    assert.ok(parentAdminSource.includes('Auto-play cards'), 'parent admin replay modal should expose autoplay controls');
    assert.ok(childDashboardSource.includes('Content Pool:'), 'child dashboard should show content pool health badge');
    assert.ok(childPreferencesSource.includes('weekly_theme_override'), 'child preferences should persist weekly theme override');
    assert.ok(childPreferencesSource.includes('fallback_warning_threshold_pct'), 'child preferences should persist fallback warning threshold');
    assert.ok(wave15MigrationSource.includes('weekly_theme_override'), 'wave15 migration should add weekly theme override column');
    assert.ok(wave15MigrationSource.includes('fallback_warning_threshold_pct'), 'wave15 migration should add fallback warning threshold column');

    console.log('check:wave15-session-control passed');
};

const runWave16SessionControlCheck = async () => {
    const [
        parentAdminSource,
        questBoardSource,
        childDashboardSource,
        childPreferencesSource,
        smokeSource,
        wave16MigrationSource
    ] = await Promise.all([
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/pages/QuestBoard.tsx', 'utf8'),
        readFile('src/components/Dashboard/ChildDashboard.tsx', 'utf8'),
        readFile('src/lib/supercharge/childPreferences.ts', 'utf8'),
        readFile('src/pages/SuperchargeSmoke.tsx', 'utf8'),
        readFile('supabase/migrations/20260214_supercharge_wave16_theme_cadence.sql', 'utf8')
    ]);

    assert.ok(parentAdminSource.includes('Theme Cadence'), 'parent admin should include weekly theme cadence control');
    assert.ok(parentAdminSource.includes('Fallback Presets'), 'parent admin should include fallback preset controls');
    assert.ok(parentAdminSource.includes('Reading default'), 'parent admin should expose reading-level fallback default action');
    assert.ok(parentAdminSource.includes('Seen Content Coverage'), 'parent admin should show content history rollup coverage');
    assert.ok(parentAdminSource.includes('Import Branch Notes'), 'parent admin should support branch annotation CSV import');
    assert.ok(parentAdminSource.includes('Weekly digest'), 'parent admin should include weekly anomaly digest card');
    assert.ok(parentAdminSource.includes('Hotspot CSV Preview'), 'parent admin should render hotspot export preview rows');
    assert.ok(questBoardSource.includes('getThemeCycleKey'), 'quest board should compute deterministic cycle key for cadence');
    assert.ok(questBoardSource.includes('Read theme helper'), 'quest board should include weekly theme speak helper');
    assert.ok(childDashboardSource.includes('getBranchFallbackPressure'), 'child dashboard should compute per-branch fallback pressure');
    assert.ok(childDashboardSource.includes('Needs variety'), 'child dashboard should show branch fallback pressure labels');
    assert.ok(childPreferencesSource.includes('weekly_theme_cadence'), 'child preferences should persist weekly theme cadence');
    assert.ok(childPreferencesSource.includes('getFallbackThresholdForReadingLevel'), 'child preferences should expose reading-level threshold defaults');
    assert.ok(smokeSource.includes('runReplayAutoplaySmoke'), 'smoke route should include replay autoplay smoke coverage');
    assert.ok(smokeSource.includes('Replay coverage failed'), 'smoke route should report replay coverage failure details');
    assert.ok(wave16MigrationSource.includes('weekly_theme_cadence'), 'wave16 migration should add weekly theme cadence column');

    console.log('check:wave16-session-control passed');
};

const runWave17SessionControlCheck = async () => {
    const [
        parentAdminSource,
        questRunSource,
        childDashboardSource,
        questBoardSource,
        childPreferencesSource,
        smokeSource,
        wave17MigrationSource
    ] = await Promise.all([
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/components/Dashboard/ChildDashboard.tsx', 'utf8'),
        readFile('src/pages/QuestBoard.tsx', 'utf8'),
        readFile('src/lib/supercharge/childPreferences.ts', 'utf8'),
        readFile('src/pages/SuperchargeSmoke.tsx', 'utf8'),
        readFile('supabase/migrations/20260214_supercharge_wave17_digest_and_presets.sql', 'utf8')
    ]);

    assert.ok(parentAdminSource.includes('Digest Thresholds'), 'parent admin should include digest threshold controls');
    assert.ok(parentAdminSource.includes('Export Branch Notes CSV'), 'parent admin should export branch notes CSV');
    assert.ok(parentAdminSource.includes('Queue Drill-down'), 'parent admin should include queue drill-down modal');
    assert.ok(parentAdminSource.includes('Content-history retention status'), 'parent admin should show content-history retention status');
    assert.ok(parentAdminSource.includes('Topic Trend Mini-sparklines'), 'parent admin should render topic mini-sparklines in child cards');
    assert.ok(parentAdminSource.includes('Auto-play progress'), 'replay modal should include autoplay progress status');
    assert.ok(questRunSource.includes('Fallback preset:'), 'quest run should show fallback preset labels on start card');
    assert.ok(questRunSource.includes('focusTopic'), 'quest run should parse focused topic query params');
    assert.ok(childDashboardSource.includes('Start Focus Quest'), 'child dashboard should expose branch quick action for focused quest launch');
    assert.ok(questBoardSource.includes('Bi-weekly reflection'), 'quest board should include bi-weekly reflection prompt card');
    assert.ok(questBoardSource.includes('buildBiweeklyReflectionPrompt'), 'quest board should generate reflection prompt copy');
    assert.ok(childPreferencesSource.includes('fallback_preset_label'), 'child preferences should persist fallback preset labels');
    assert.ok(childPreferencesSource.includes('digest_watch_shortage_delta_pct'), 'child preferences should persist digest thresholds');
    assert.ok(smokeSource.includes('runBranchAnnotationCsvSmoke'), 'smoke route should include branch annotation CSV smoke coverage');
    assert.ok(smokeSource.includes('Branch annotation coverage failed'), 'smoke route should report branch annotation coverage failures');
    assert.ok(wave17MigrationSource.includes('fallback_preset_label'), 'wave17 migration should add fallback preset label column');
    assert.ok(wave17MigrationSource.includes('digest_watch_shortage_delta_pct'), 'wave17 migration should add digest watch threshold column');
    assert.ok(wave17MigrationSource.includes('digest_high_shortage_delta_pct'), 'wave17 migration should add digest high threshold column');

    console.log('check:wave17-session-control passed');
};

const runWave18SessionControlCheck = async () => {
    const [
        parentAdminSource,
        questRunSource,
        childDashboardSource,
        questBoardSource,
        syncQueueSource,
        smokeSource
    ] = await Promise.all([
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/components/Dashboard/ChildDashboard.tsx', 'utf8'),
        readFile('src/pages/QuestBoard.tsx', 'utf8'),
        readFile('src/lib/syncQueue.ts', 'utf8'),
        readFile('src/pages/SuperchargeSmoke.tsx', 'utf8')
    ]);

    assert.ok(parentAdminSource.includes('retryFailedQueueItemsByKindNow'), 'parent admin should use retry-by-kind queue helper');
    assert.ok(parentAdminSource.includes('Retry kind'), 'queue drill-down should provide per-kind retry action');
    assert.ok(parentAdminSource.includes('Press `Esc` to close'), 'queue drill-down should show keyboard close hint');
    assert.ok(parentAdminSource.includes('Loop subset'), 'replay modal should include loop subset mode');
    assert.ok(parentAdminSource.includes('Max loops'), 'replay modal should expose bounded max loops control');
    assert.ok(parentAdminSource.includes('fourWeekSlopePts'), 'weekly digest should compute 4-week slope');
    assert.ok(parentAdminSource.includes('confidence'), 'weekly digest should include confidence level');
    assert.ok(parentAdminSource.includes('note_updated_at'), 'branch notes export should include note update metadata');
    assert.ok(parentAdminSource.includes('pinned_range_start'), 'branch notes export should include pinned range metadata');
    assert.ok(syncQueueSource.includes('retryFailedQueueItemsByKindNow'), 'sync queue should expose retryFailedQueueItemsByKindNow helper');

    assert.ok(questRunSource.includes('focusSource'), 'quest run should parse focused launch source');
    assert.ok(questRunSource.includes('filteredQuickFocusTopics'), 'quest run should enforce allowed topic filtering for quick focus');
    assert.ok(questRunSource.includes('Focus source:'), 'quest run start cards should show focus source badge text');
    assert.ok(childDashboardSource.includes('focusSource=branch_card'), 'child dashboard should pass branch_card focus source param');

    assert.ok(questBoardSource.includes('Print reflection strip'), 'quest board should expose reflection strip print action');
    assert.ok(questBoardSource.includes('Prompts only, no scores.'), 'reflection strip export should include prompt-only safety note');

    assert.ok(smokeSource.includes('runQueueDrilldownSmoke'), 'smoke route should include queue drill-down smoke helper');
    assert.ok(smokeSource.includes('Queue drill-down coverage failed'), 'smoke route should report queue drill-down failure details');
    console.log('check:wave18-session-control passed');
};

const runWave19UltraShortAndQualityCheck = async () => {
    const [
        questRunSource,
        parentAdminSource,
        childPreferencesSource,
        lessonPlayerSource,
        wave19MigrationSource
    ] = await Promise.all([
        readFile('src/pages/QuestRun.tsx', 'utf8'),
        readFile('src/pages/ParentAdmin.tsx', 'utf8'),
        readFile('src/lib/supercharge/childPreferences.ts', 'utf8'),
        readFile('src/pages/LessonPlayer.tsx', 'utf8'),
        readFile('supabase/migrations/20260215_supercharge_wave19_ultra_short_only.sql', 'utf8')
    ]);

    assert.ok(childPreferencesSource.includes('ultra_short_only'), 'child preferences should persist ultra short toggle');
    assert.ok(parentAdminSource.includes('Ultra Short Only'), 'parent admin should expose ultra short only control');
    assert.ok(questRunSource.includes('ultraShortOnly'), 'quest run should enforce ultra short preference');
    assert.ok(questRunSource.includes('Session cap: Parent guided'), 'quest run copy should avoid explicit minute framing');
    assert.ok(lessonPlayerSource.includes('isLowSignalInfoCard'), 'lesson player should classify low-signal intro cards');
    assert.ok(lessonPlayerSource.includes('lowSignalLeadCards'), 'lesson player should reorder low-signal intro cards behind first question');
    assert.ok(wave19MigrationSource.includes('ultra_short_only'), 'wave19 migration should add ultra_short_only column');

    console.log('check:wave19-ultra-short-and-quality passed');
};

const run = async () => {
    runDedupeCheck();
    await runGeneratorCheck();
    await runQuestPlanCheck();
    await runModeConfigCheck();
    await runLessonProgressContractCheck();
    await runMiniQuestVarietyCheck();
    await runKidSafeCopyLintCheck();
    runBossTemplateCheck();
    await runQueueIntegrationCheck();
    await runRetryQueueHandlingCheck();
    await runQueueRetryMockedIntegrationCheck();
    await runOfflineSyncSmokeCheck();
    await runLocalizationAuditCheck();
    await runInteractionAccessibilityCheck();
    await runKeyboardOnlyProgressionCheck();
    await runDatePresetAndCsvSchemaCheck();
    runCsvSchemaEdgeCaseCheck();
    await runShortageAlertCheck();
    await runParentAdminWave11Check();
    await runParentAdminWave12Check();
    await runHotspotValidatorCheck();
    await runTranscriptExportCheck();
    await runReducedMotionCoverageCheck();
    await runCiMatrixSmokeCheck();
    await runNightlyTriageWorkflowCheck();
    await runTelemetryMaintenanceDocsCheck();
    await runOpsScriptCoverageCheck();
    await runCulturalReviewCoverageCheck();
    await runRoutePrefetchCheck();
    await runWave13SessionVarietyCheck();
    await runWave14SessionControlCheck();
    await runWave15SessionControlCheck();
    await runWave16SessionControlCheck();
    await runWave17SessionControlCheck();
    await runWave18SessionControlCheck();
    await runWave19UltraShortAndQualityCheck();
    console.log('All supercharge checks passed.');
};

run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
