-- EXPANSION CONTENT V2 (Real Questions)
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
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;

    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';
    SELECT id INTO food_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Food & Dining';
    SELECT id INTO transport_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Transport';
    SELECT id INTO lang_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Language Basics';

    -- CLEANUP: Delete activities/lessons/levels created by previous expansion (indices > 10)
    -- We cascade delete from levels
    DELETE FROM public.levels WHERE branch_id IN (tourist_branch_id, food_branch_id, transport_branch_id, lang_branch_id) AND order_index > 10;

    -- RE-GENERATE TOURIST (20 Lessons, 20 Questions each)
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (tourist_branch_id, 'Tourist Level ' || i, 'Explore Japan ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Tourist Lesson ' || i, 'Fun facts about Japan ' || i, 10 + i) RETURNING id INTO lesson_id;

        -- 1 Info Slide
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Welcome to Lesson ' || i || '! Get ready for 20 questions.', null, 1);

        -- 20 Questions
        FOR q IN 1..20 LOOP
            IF (q % 2 = 0) THEN
                option_json := '[{"id":"1","text":"True","is_correct":true}, {"id":"2","text":"False","is_correct":false}]'::jsonb;
                INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
                (lesson_id, 'multiple_choice', 'Japan fact #' || i || '-' || q || ': Sushi is from Japan.', option_json, 1 + q);
            ELSE
                option_json := '[{"id":"1","text":"Tokyo","is_correct":true}, {"id":"2","text":"Paris","is_correct":false}, {"id":"3","text":"Mars","is_correct":false}]'::jsonb;
                INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
                (lesson_id, 'multiple_choice', 'Question ' || i || '-' || q || ': What is the capital of Japan?', option_json, 1 + q);
            END IF;
        END LOOP;
    END LOOP;

    -- RE-GENERATE FOOD
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (food_branch_id, 'Foodie Level ' || i, 'Yummy treats ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Food Lesson ' || i, 'Delicious food ' || i, 10 + i) RETURNING id INTO lesson_id;

        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Food Lesson ' || i || ' intro.', null, 1);

        FOR q IN 1..20 LOOP
            option_json := '[{"id":"1","text":"Yum!","is_correct":true}, {"id":"2","text":"Yuck","is_correct":false}]'::jsonb;
            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', 'Food Item #' || i || '-' || q || ': Is Ramen delicious?', option_json, 1 + q);
        END LOOP;
    END LOOP;

    -- RE-GENERATE TRANSPORT
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (transport_branch_id, 'Trains Level ' || i, 'Ride the rails ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Transport Lesson ' || i, 'Moving around ' || i, 10 + i) RETURNING id INTO lesson_id;

        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Transport Lesson ' || i || ' intro.', null, 1);

        FOR q IN 1..20 LOOP
             option_json := '[{"id":"1","text":"Shinkansen","is_correct":true}, {"id":"2","text":"Snail","is_correct":false}]'::jsonb;
            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', 'Transport Q #' || i || '-' || q || ': Which is a fast train?', option_json, 1 + q);
        END LOOP;
    END LOOP;

    -- RE-GENERATE LANGUAGE
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (lang_branch_id, 'Language Level ' || i, 'Speak up ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Word ' || i, 'Vocabulary ' || i, 10 + i) RETURNING id INTO lesson_id;

        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Language Lesson ' || i || ' intro.', null, 1);

        FOR q IN 1..20 LOOP
            option_json := '[{"id":"1","text":"Konnichiwa","is_correct":true}, {"id":"2","text":"Goodbye","is_correct":false}]'::jsonb;
            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', 'Lang Q #' || i || '-' || q || ': How to say Hello?', option_json, 1 + q);
        END LOOP;
    END LOOP;

END $$;
