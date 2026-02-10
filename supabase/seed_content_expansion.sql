-- EXPANSION CONTENT (20 Lessons per branch for Japan)
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
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;

    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';
    SELECT id INTO food_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Food & Dining';
    SELECT id INTO transport_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Transport';
    SELECT id INTO lang_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Language Basics';

    -- Generate 15 more lessons for Tourist (Assuming some exist)
    -- actually let's just add 20 fresh ones to be safe or append. 
    -- existing indices are small (1..4). We'll start from 10 to avoid collision or just rely on IDs.
    -- Order Index matters.
    
    -- TOURIST EXPANSION
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (tourist_branch_id, 'Tourist Level ' || i, 'Explore Japan ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Tourist Lesson ' || i, 'Fun facts about Japan ' || i, 10 + i) RETURNING id INTO lesson_id;

        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Japan is amazing for reason #' || i, null, 1),
        (lesson_id, 'multiple_choice', 'Is this true?', '[{"id":"1","text":"Yes","is_correct":true}, {"id":"2","text":"No","is_correct":false}]'::jsonb, 2);
    END LOOP;

    -- FOOD EXPANSION
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (food_branch_id, 'Foodie Level ' || i, 'Yummy treats ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Food Lesson ' || i, 'Delicious food ' || i, 10 + i) RETURNING id INTO lesson_id;

        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Sushi roll #' || i || ' is tasty!', null, 1),
        (lesson_id, 'multiple_choice', 'Would you eat this?', '[{"id":"1","text":"Yes!","is_correct":true}, {"id":"2","text":"Maybe","is_correct":false}]'::jsonb, 2);
    END LOOP;

    -- TRANSPORT EXPANSION
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (transport_branch_id, 'Trains Level ' || i, 'Ride the rails ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Transport Lesson ' || i, 'Moving around ' || i, 10 + i) RETURNING id INTO lesson_id;

        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Train station #' || i || ' is busy.', null, 1),
        (lesson_id, 'multiple_choice', 'Where is the train?', '[{"id":"1","text":"Here","is_correct":true}, {"id":"2","text":"There","is_correct":false}]'::jsonb, 2);
    END LOOP;

    -- LANGUAGE EXPANSION
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (lang_branch_id, 'Language Level ' || i, 'Speak up ' || i, 10 + i, 1) RETURNING id INTO level_id;

        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Word ' || i, 'Vocabulary ' || i, 10 + i) RETURNING id INTO lesson_id;

        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Word number ' || i || ' is useful.', null, 1),
        (lesson_id, 'multiple_choice', 'What does this mean?', '[{"id":"1","text":"Good","is_correct":true}, {"id":"2","text":"Bad","is_correct":false}]'::jsonb, 2);
    END LOOP;

END $$;
