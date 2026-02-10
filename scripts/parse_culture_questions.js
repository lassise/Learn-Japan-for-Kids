
const fs = require('fs');
const path = require('path');

// Define the paths
const rawQuestionsPath = path.resolve(__dirname, '../raw_questions.txt');
const outputPath = path.resolve(__dirname, '../supabase/seed_content_culture_v4.sql');

// Read the raw file
const rawContent = fs.readFileSync(rawQuestionsPath, 'utf8');

// Regex to capture blocks
// Assuming format:
// [Scenario Text]
// Question X: [Question Text]
// A. [Option A]
// B. [Option B]
// C. [Option C]
// Answer: [Correct Letter]
// ----------------------------------------

const blocks = rawContent.split('----------------------------------------');

const parsedQuestions = [];

blocks.forEach(block => {
    const lines = block.trim().split('\n').filter(l => l.trim() !== '');
    if (lines.length < 5) return;

    // Find Scenario (Lines before Question X)
    const questionLineIndex = lines.findIndex(l => l.match(/^Question \d+:/));
    if (questionLineIndex === -1) return;

    const scenario = lines.slice(0, questionLineIndex).join(' ').trim();

    // Parse Question
    const questionLine = lines[questionLineIndex];
    const questionText = questionLine.replace(/^Question \d+:\s*/, '').trim();

    // Parse Answer
    const answerLineIndex = lines.findIndex(l => l.match(/^Answer:/));
    if (answerLineIndex === -1) return;
    const correctLetter = lines[answerLineIndex].replace('Answer:', '').trim();

    // Parse Options (Between Question and Answer)
    const optionLines = lines.slice(questionLineIndex + 1, answerLineIndex);
    const options = [];

    optionLines.forEach(l => {
        const match = l.match(/^([A-C])\.\s*(.+)/);
        if (match) {
            const letter = match[1];
            const text = match[2].trim();
            options.push({
                id: letter, // Using letter as ID for simplicity or map to 1,2,3
                text: text,
                is_correct: letter === correctLetter
            });
        }
    });

    if (options.length > 0) {
        parsedQuestions.push({
            scenario,
            question: questionText,
            options
        });
    }
});

console.log(`Parsed ${parsedQuestions.length} questions.`);

// GENERATE SQL
let sql = `-- CULTURE CONTENT (User Provided)
DO $$
DECLARE
    japan_id UUID;
    v1_id UUID;
    tourist_branch_id UUID;
    food_branch_id UUID;
    transport_branch_id UUID;
    lang_branch_id UUID;
    level_id UUID;
    lesson_id UUID;
    i INT;
    q INT;
    option_json JSONB;
    food_questions TEXT[];
    food_answers BOOLEAN[];
    transport_questions TEXT[];
    transport_answers BOOLEAN[];
    language_questions TEXT[];
    language_answers BOOLEAN[];
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;

    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';
    SELECT id INTO food_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Food & Dining';
    SELECT id INTO transport_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Transport';
    SELECT id INTO lang_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Language Basics';

    -- CLEANUP: Delete levels created by previous expansions (indices > 10)
    DELETE FROM public.levels WHERE branch_id = tourist_branch_id AND order_index > 10;
    
    -- We can keep the other branches or regenerate them. 
    -- The user prompt said "use these questions for the culture part", implying replace culture, what about others?
    -- "food_branch_id", etc. were handled in v3.
    -- Let's just DELETE and RECREATE the Tourist ones, and leave the V3 code for others if we want,
    -- OR we can include the V3 logic for others here to have a single consistent file.
    -- Let's include V3 logic for others to keep it clean.
    
    DELETE FROM public.levels WHERE branch_id IN (food_branch_id, transport_branch_id, lang_branch_id) AND order_index > 10;

    -- RE-GENERATE TOURIST (20 Lessons, 30 Questions each from User List)
`;

// Logic: 20 Lessons. 30 Questions per lesson.
// Total needed: 600.
// We have ~200 parsed questions.
// We will loop through parsedQuestions.

let totalNeeded = 20 * 30; // 600
let qIndex = 0;

for (let i = 1; i <= 20; i++) {
    sql += `
    -- Tourist Lesson ${i}
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level ${i}', 'Learn manners and customs ${i}', 10 + ${i}, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson ${i}', 'Japanese Etiquette ${i}', 10 + ${i}) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson ${i}! Master these 30 scenarios.', null, 1);
    `;

    for (let q = 1; q <= 30; q++) {
        // Use modulo to cycle through questions
        const quest = parsedQuestions[qIndex % parsedQuestions.length];
        qIndex++;

        // Escape SQL single quotes
        const safeScenario = quest.scenario.replace(/'/g, "''");
        const safeQuestion = quest.question.replace(/'/g, "''");

        // Fix options JSON
        // Options array of objects needs to be JSON string
        // We used letter IDs "A", "B", "C".
        const safeOptions = JSON.stringify(quest.options).replace(/'/g, "''");

        const fullQuestionText = `${safeScenario}\\n\\n${safeQuestion}`;

        sql += `
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', '${fullQuestionText}', '${safeOptions}'::jsonb, ${1 + q});`;
    }
}

// REST OF CONTENT (Food, Transport, Language)
sql += `
    food_questions := ARRAY[
        'Is sushi a common food in Japan?',
        'Is miso soup usually sweet like candy?',
        'Is ramen a noodle dish?',
        'Is tempura made by deep-frying battered food?',
        'Is matcha a type of green tea?',
        'Is mochi made from pounded rice?',
        'Is wasabi known for a spicy kick?',
        'Is soy sauce called shoyu in Japanese?',
        'Is onigiri a rice ball snack?',
        'Is udon thinner than somen noodles?',
        'Is sashimi served without rice?',
        'Is takoyaki often filled with octopus?',
        'Is okonomiyaki a savory pancake?',
        'Is natto known for a strong smell and sticky texture?',
        'Is bento a lunch box meal?',
        'Is tonkatsu usually a breaded pork cutlet?',
        'Is yakitori grilled chicken on skewers?',
        'Is daifuku a mochi dessert?',
        'Is karaage Japanese-style fried chicken?',
        'Is dashi a soup stock used in many dishes?',
        'Is soba always made with zero buckwheat?',
        'Is an izakaya more like a casual pub than a museum?',
        'Is oden usually served cold like ice cream?',
        'Is taiyaki a fish-shaped pastry?',
        'Is shabu-shabu cooked by dipping thin meat in hot broth?',
        'Is gyudon a beef rice bowl?',
        'Is yakisoba a stir-fried noodle dish?',
        'Is dorayaki often filled with sweet red bean paste?',
        'Is senbei a type of Japanese rice cracker?',
        'Is anpan often filled with sweet red bean paste?'
    ];

    food_answers := ARRAY[
        true, false, true, true, true, true, true, true, true, false,
        true, true, true, true, true, true, true, true, true, true,
        false, true, false, true, true, true, true, true, true, true
    ];

    -- RE-GENERATE FOOD
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (food_branch_id, 'Foodie Level ' || i, 'Yummy treats ' || i, 10 + i, 1) RETURNING id INTO level_id;
        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Food Lesson ' || i, 'Delicious food ' || i, 10 + i) RETURNING id INTO lesson_id;
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Food Lesson ' || i || ' intro.', null, 1);
        FOR q IN 1..30 LOOP
            IF food_answers[((q + i - 2) % 30) + 1] THEN
                option_json := '[{"id":"1","text":"Yes","is_correct":true}, {"id":"2","text":"No","is_correct":false}]'::jsonb;
            ELSE
                option_json := '[{"id":"1","text":"Yes","is_correct":false}, {"id":"2","text":"No","is_correct":true}]'::jsonb;
            END IF;

            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', food_questions[((q + i - 2) % 30) + 1], option_json, 1 + q);
        END LOOP;
    END LOOP;

    transport_questions := ARRAY[
        'Is the Shinkansen known as the bullet train?',
        'Should riders line up before boarding many trains?',
        'Is it polite to let people exit the train before you board?',
        'Is speaking loudly on a packed commuter train recommended?',
        'Do many train stations show signs in Japanese and English?',
        'Can an IC card like Suica or PASMO be used for many trains and buses?',
        'Is the JR Pass a type of dessert sold in stations?',
        'Do priority seats exist for elderly passengers and people who need support?',
        'Should you block the train doors while deciding where to stand?',
        'Is platform safety behind the yellow line an important rule?',
        'Do local trains usually stop at more stations than express trains?',
        'Is it okay to play videos out loud on public transport?',
        'Can station lockers help travelers store luggage temporarily?',
        'Are taxi doors in Japan often opened automatically by the driver?',
        'Do many buses require exact change or an IC tap when paying?',
        'Should you run across tracks to catch a departing train?',
        'Is checking the last-train time important at night?',
        'Do women-only cars exist on some lines during certain hours?',
        'Is smoking allowed in every train car today?',
        'Are transfer signs used to guide passengers between lines?',
        'Is it polite to move backpacks to avoid hitting others in crowded cars?',
        'Do all trains in Japan require seat reservations?',
        'Is the Yamanote Line a loop line in Tokyo?',
        'Should escalator etiquette in stations be ignored completely?',
        'Can rural areas have less frequent train service than major cities?',
        'Is it normal to eat a full hot meal on very crowded rush-hour trains?',
        'Are bus stop names and next-stop announcements commonly provided?',
        'Is standing on the correct side of platform lines part of orderly boarding?',
        'Can high-speed rail significantly reduce travel time between major cities?',
        'Should you force train doors open after the closing chime?'
    ];

    transport_answers := ARRAY[
        true, true, true, false, true, true, false, true, false, true,
        true, false, true, true, true, false, true, true, false, true,
        true, false, true, false, true, false, true, true, true, false
    ];

    -- RE-GENERATE TRANSPORT
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (transport_branch_id, 'Trains Level ' || i, 'Ride the rails ' || i, 10 + i, 1) RETURNING id INTO level_id;
        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Transport Lesson ' || i, 'Moving around ' || i, 10 + i) RETURNING id INTO lesson_id;
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Transport Lesson ' || i || ' intro.', null, 1);
        FOR q IN 1..30 LOOP
            IF transport_answers[((q + i - 2) % 30) + 1] THEN
                option_json := '[{"id":"1","text":"Yes","is_correct":true}, {"id":"2","text":"No","is_correct":false}]'::jsonb;
            ELSE
                option_json := '[{"id":"1","text":"Yes","is_correct":false}, {"id":"2","text":"No","is_correct":true}]'::jsonb;
            END IF;

            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', transport_questions[((q + i - 2) % 30) + 1], option_json, 1 + q);
        END LOOP;
    END LOOP;

    language_questions := ARRAY[
        'Does Konnichiwa mean hello or good day?',
        'Does Arigatou mean thank you?',
        'Does Ohayou usually mean good morning?',
        'Does Konbanwa mean good evening?',
        'Does Sayonara usually mean goodbye?',
        'Is Sumimasen used for excuse me or sorry?',
        'Is Onegaishimasu used to make polite requests?',
        'Is Gomen nasai an apology phrase?',
        'Is Itadakimasu said before eating?',
        'Is Gochisousama often said after finishing a meal?',
        'Does Hai mean yes?',
        'Does Iie mean no?',
        'Does Doko ask where something is?',
        'Does Nani ask what?',
        'Does Ikura ask how much something costs?',
        'Is Sensei a word for teacher?',
        'Is Tomodachi a word for friend?',
        'Does Eki mean train station?',
        'Does Mizu mean water?',
        'Does Neko mean dog?',
        'Does Inu mean dog?',
        'Is Oyasumi used around bedtime or good night?',
        'Is Kudasai often used like please when asking for something?',
        'Does Daijoubu often mean it is okay?',
        'Does Wakarimasen mean I do not understand?',
        'Is Yasai the word for vegetables?',
        'Does Denwa mean telephone?',
        'Is Kuruma the word for car?',
        'Does Sakana mean fish?',
        'Does Tokei mean mountain?'
    ];

    language_answers := ARRAY[
        true, true, true, true, true, true, true, true, true, true,
        true, true, true, true, true, true, true, true, true, false,
        true, true, true, true, true, true, true, true, true, false
    ];

    -- RE-GENERATE LANGUAGE
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (lang_branch_id, 'Language Level ' || i, 'Speak up ' || i, 10 + i, 1) RETURNING id INTO level_id;
        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Word ' || i, 'Vocabulary ' || i, 10 + i) RETURNING id INTO lesson_id;
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Language Lesson ' || i || ' intro.', null, 1);
        FOR q IN 1..30 LOOP
            IF language_answers[((q + i - 2) % 30) + 1] THEN
                option_json := '[{"id":"1","text":"Yes","is_correct":true}, {"id":"2","text":"No","is_correct":false}]'::jsonb;
            ELSE
                option_json := '[{"id":"1","text":"Yes","is_correct":false}, {"id":"2","text":"No","is_correct":true}]'::jsonb;
            END IF;

            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', language_questions[((q + i - 2) % 30) + 1], option_json, 1 + q);
        END LOOP;
    END LOOP;

END $$;
`;

fs.writeFileSync(outputPath, sql);
console.log('SQL generated at ' + outputPath);
