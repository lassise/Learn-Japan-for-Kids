-- INSERT LESSONS FOR JAPAN - Level 1: Arrival in Tokyo
-- We need the Level ID first.
DO $$
DECLARE
    level_id UUID;
    lesson_id UUID;
BEGIN
    SELECT id INTO level_id FROM public.levels WHERE title = 'Arrival in Tokyo' LIMIT 1;

    -- Create Lesson
    INSERT INTO public.lessons (level_id, title, description, order_index, content_json)
    VALUES (level_id, 'Landing in Narita', 'Welcome to Japan! Let''s look around.', 1, '{}')
    RETURNING id INTO lesson_id;

    -- Activity 1: Info Slide
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index)
    VALUES (
        lesson_id, 
        'info', 
        'Welcome to Japan!', 
        null, 
        1
    );

    -- Activity 2: Multiple Choice
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index)
    VALUES (
        lesson_id,
        'multiple_choice',
        'What do you say when you meet someone for the first time in the day?',
        '[
            {"id": "opt1", "text": "Konnichiwa (Good afternoon)", "is_correct": true, "explanation": "Konnichiwa is the standard greeting during the day."},
            {"id": "opt2", "text": "Sayonara (Goodbye)", "is_correct": false, "explanation": "Sayonara means Goodbye."},
            {"id": "opt3", "text": "Arigato (Thank you)", "is_correct": false, "explanation": "Arigato means Thank you."}
        ]'::jsonb,
        2
    );

    -- Activity 3: Multiple Choice (Image - implicit by text mostly for now)
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index)
    VALUES (
        lesson_id,
        'multiple_choice',
        'Which of these is a famous Japanese food?',
        '[
            {"id": "opt1", "text": "Sushi", "is_correct": true, "explanation": "Sushi is a famous Japanese dish involving vinegared rice."},
            {"id": "opt2", "text": "Pizza", "is_correct": false, "explanation": "Pizza is Italian!"},
            {"id": "opt3", "text": "Tacos", "is_correct": false, "explanation": "Tacos are Mexican!"}
        ]'::jsonb,
        3
    );

END $$;
