DO $$
DECLARE
    lesson_row RECORD;
    question_count INT;
    needed_count INT;
    max_order_index INT;
    idx INT;
    base_question TEXT;
    base_options JSONB;
    variant_text TEXT;
BEGIN
    FOR lesson_row IN
        SELECT les.id AS lesson_id
        FROM public.lessons les
        JOIN public.levels lvl ON lvl.id = les.level_id
        JOIN public.branches br ON br.id = lvl.branch_id
        JOIN public.country_versions cv ON cv.id = br.country_version_id
        JOIN public.countries c ON c.id = cv.country_id
        WHERE c.code = 'JP'
          AND cv.version_number = 1
          AND br.name IN (
              'Pre-Trip Prep',
              'Tourist Essentials',
              'Food & Dining',
              'Transport',
              'Language Basics'
          )
    LOOP
        SELECT COUNT(*), COALESCE(MAX(order_index), 1)
        INTO question_count, max_order_index
        FROM public.activities
        WHERE lesson_id = lesson_row.lesson_id
          AND type = 'multiple_choice';

        IF question_count <= 0 THEN
            CONTINUE;
        END IF;

        needed_count := GREATEST(0, 30 - question_count);
        IF needed_count <= 0 THEN
            CONTINUE;
        END IF;

        FOR idx IN 1..needed_count LOOP
            SELECT a.question_text, a.options
            INTO base_question, base_options
            FROM public.activities a
            WHERE a.lesson_id = lesson_row.lesson_id
              AND a.type = 'multiple_choice'
            ORDER BY a.order_index
            OFFSET ((idx - 1) % question_count)
            LIMIT 1;

            IF base_question IS NULL OR base_options IS NULL THEN
                CONTINUE;
            END IF;

            variant_text := CASE (idx % 3)
                WHEN 1 THEN 'Concept check: ' || regexp_replace(base_question, '\?$', '')
                WHEN 2 THEN 'Try it another way: ' || base_question
                ELSE 'Quick review: ' || regexp_replace(base_question, '\?$', '') || '. Which answer fits best?'
            END;

            IF EXISTS (
                SELECT 1
                FROM public.activities existing_a
                WHERE existing_a.lesson_id = lesson_row.lesson_id
                  AND existing_a.type = 'multiple_choice'
                  AND existing_a.question_text = variant_text
            ) THEN
                variant_text := variant_text || ' (review ' || idx || ')';
            END IF;

            max_order_index := max_order_index + 1;

            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index)
            VALUES (
                lesson_row.lesson_id,
                'multiple_choice',
                variant_text,
                base_options,
                max_order_index
            );
        END LOOP;
    END LOOP;
END $$;
