DO $$
DECLARE
    japan_id UUID;
    v1_id UUID;
    transport_branch_id UUID;
    language_branch_id UUID;
    yes_first JSONB := '[{"id":"1","text":"Yes","is_correct":true},{"id":"2","text":"No","is_correct":false}]'::jsonb;
    no_first JSONB := '[{"id":"1","text":"Yes","is_correct":false},{"id":"2","text":"No","is_correct":true}]'::jsonb;
    transport_questions TEXT[] := ARRAY[
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
    transport_answers BOOLEAN[] := ARRAY[
        true, true, true, false, true, true, false, true, false, true,
        true, false, true, true, true, false, true, true, false, true,
        true, false, true, false, true, false, true, true, true, false
    ];
    language_questions TEXT[] := ARRAY[
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
    language_answers BOOLEAN[] := ARRAY[
        true, true, true, true, true, true, true, true, true, true,
        true, true, true, true, true, true, true, true, true, false,
        true, true, true, true, true, true, true, true, true, false
    ];
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    IF japan_id IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO v1_id
    FROM public.country_versions
    WHERE country_id = japan_id
      AND version_number = 1;

    IF v1_id IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO transport_branch_id
    FROM public.branches
    WHERE country_version_id = v1_id
      AND name = 'Transport';

    SELECT id INTO language_branch_id
    FROM public.branches
    WHERE country_version_id = v1_id
      AND name = 'Language Basics';

    IF transport_branch_id IS NULL AND language_branch_id IS NULL THEN
        RETURN;
    END IF;

    IF transport_branch_id IS NOT NULL THEN
        WITH transport_targets AS (
            SELECT
                a.id AS activity_id,
                ((a.order_index - 2 + GREATEST(l.order_index - 11, 0)) % 30) + 1 AS question_idx
            FROM public.activities a
            JOIN public.lessons les ON les.id = a.lesson_id
            JOIN public.levels l ON l.id = les.level_id
            WHERE l.branch_id = transport_branch_id
              AND a.type = 'multiple_choice'
              AND a.order_index BETWEEN 2 AND 31
              AND a.question_text LIKE 'Transport Q #%: Which is a fast train?'
        )
        UPDATE public.activities a
        SET
            question_text = transport_questions[t.question_idx],
            options = CASE
                WHEN transport_answers[t.question_idx] THEN yes_first
                ELSE no_first
            END
        FROM transport_targets t
        WHERE a.id = t.activity_id;
    END IF;

    IF language_branch_id IS NOT NULL THEN
        WITH language_targets AS (
            SELECT
                a.id AS activity_id,
                ((a.order_index - 2 + GREATEST(l.order_index - 11, 0)) % 30) + 1 AS question_idx
            FROM public.activities a
            JOIN public.lessons les ON les.id = a.lesson_id
            JOIN public.levels l ON l.id = les.level_id
            WHERE l.branch_id = language_branch_id
              AND a.type = 'multiple_choice'
              AND a.order_index BETWEEN 2 AND 31
              AND a.question_text LIKE 'Lang Q #%: How to say Hello?'
        )
        UPDATE public.activities a
        SET
            question_text = language_questions[t.question_idx],
            options = CASE
                WHEN language_answers[t.question_idx] THEN yes_first
                ELSE no_first
            END
        FROM language_targets t
        WHERE a.id = t.activity_id;
    END IF;
END $$;
