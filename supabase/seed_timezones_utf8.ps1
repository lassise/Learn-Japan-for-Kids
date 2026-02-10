-- SEED: TIME ZONES (Japan)
-- Adds a new branch "Pre-Trip Prep" and a "Time Traveler" lesson.

DO $$
DECLARE
    v_jp_id UUID;
    v_branch_prep_id UUID;
    v_lesson_time_id UUID;
BEGIN
    -- 1. Get Japan ID
    SELECT id INTO v_jp_id FROM country_versions 
    WHERE country_id = (SELECT id FROM countries WHERE code = 'JP') AND version_number = 1;

    -- 2. Create "Pre-Trip Prep" Branch (if not exists)
    INSERT INTO branches (country_version_id, name, description, order_index)
    VALUES (v_jp_id, 'Pre-Trip Prep', 'Getting ready for the big trip', 0) -- Order 0 to appear first/early
    ON CONFLICT (country_version_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_branch_prep_id;

    -- 3. Create "Time Traveler" Lesson
    -- First, ensure a Level exists
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_prep_id, 'Time Travel', 'Understanding Time Zones', 1, 1)
    ON CONFLICT (branch_id, title) DO NOTHING;

    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_prep_id AND title = 'Time Travel'), 
        'Time Traveler''s Watch', 
        'Japan is in the future! Let''s learn why.', 
        1
    )
    ON CONFLICT (level_id, title) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_lesson_time_id;

    -- cleanup old activities if re-seeding
    DELETE FROM activities WHERE lesson_id = v_lesson_time_id;

    -- 4. Insert Activities (12 items for Hard Mode)
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url, options) VALUES 
    
    -- 1 (Info): Intro
    (v_lesson_time_id, 'info', 'Time Travel?', 1, 'Did you know traveling to Japan is like time travel? Japan is the "Land of the Rising Sun". This means they see the sun before we do!', 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80', NULL),

    -- 2 (MC): Sunrise
    (v_lesson_time_id, 'multiple_choice', 'Who sees the sunrise first?', 2, NULL, NULL, 
    '[{"id":"opt1","text":"Japan","is_correct":true,"explanation":"Yes! Japan is in the East, so they see the sun first."},{"id":"opt2","text":"New York","is_correct":false,"explanation":"New York sees it later."}]'::jsonb),

    -- 3 (Info): Time Difference
    (v_lesson_time_id, 'info', 'Day and Night', 3, 'Because the Earth is a ball that spins, when it is day in America, it might be night in Japan. If it is Noon here, it might be the middle of the night there!', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', NULL),

    -- 4 (MC): Opposites
    (v_lesson_time_id, 'multiple_choice', 'If you are eating Lunch in New York, what are kids in Japan doing?', 4, NULL, NULL, 
    '[{"id":"opt1","text":"Eating Lunch","is_correct":false,"explanation":"Nope, it is the middle of the night!"},{"id":"opt2","text":"Sleeping","is_correct":true,"explanation":"Correct! It is sleepy time in Japan."}]'::jsonb),

    -- 5 (Info): JST
    (v_lesson_time_id, 'info', 'Japan Standard Time', 5, 'Japan uses JST. It is usually 13 or 14 hours AHEAD of New York. That means they are in "Tomorrow"!', 'https://images.unsplash.com/photo-1502421713837-77291a13e54b?auto=format&fit=crop&w=800&q=80', NULL),

    -- 6 (MC): Future
    (v_lesson_time_id, 'multiple_choice', 'Is Japan in the future or the past?', 6, NULL, NULL, 
    '[{"id":"opt1","text":"The Future","is_correct":true,"explanation":"Yes! They start the new day before us."},{"id":"opt2","text":"The Past","is_correct":false,"explanation":"No, they are ahead of us."}]'::jsonb),

    -- 7 (Info): Jet Lag
    (v_lesson_time_id, 'info', 'Jet Lag', 7, 'When you fly to Japan, your body might feel confused. You might want to sleep at lunch time! This is called **Jet Lag**.', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80', NULL),

    -- 8 (MC): Feeling Tired
    (v_lesson_time_id, 'multiple_choice', 'What is it called when your body clock is confused?', 8, NULL, NULL, 
    '[{"id":"opt1","text":"Rocket Lag","is_correct":false,"explanation":"Funny, but no."},{"id":"opt2","text":"Jet Lag","is_correct":true,"explanation":"Correct! Jet Lag makes you sleepy."}]'::jsonb),

    -- 9 (Info): The Date Line
    (v_lesson_time_id, 'info', 'The Magic Line', 9, 'There is an imaginary line in the ocean called the International Date Line. When you fly over it, you can lose a whole day or gain a whole day!', 'https://images.unsplash.com/photo-1456935266854-3c66f91f3494?auto=format&fit=crop&w=800&q=80', NULL),

    -- 10 (MC): Skipping a Day
    (v_lesson_time_id, 'multiple_choice', 'If you fly to Japan, do you arrive on the same day?', 10, NULL, NULL, 
    '[{"id":"opt1","text":"Usually the next day","is_correct":true,"explanation":"Yes, you skip ahead into tomorrow!"},{"id":"opt2","text":"Last week","is_correct":false,"explanation":"That would be real time travel!"}]'::jsonb),

    -- 11 (Info): Watch Change
    (v_lesson_time_id, 'info', 'Change Your Watch', 11, 'As soon as the plane lands, you should change your watch to Japan time. If it says 1:00 PM, change it to match the airport clocks!', 'https://images.unsplash.com/photo-1508057198894-247b98660706?auto=format&fit=crop&w=800&q=80', NULL),

    -- 12 (MC): Final Check
    (v_lesson_time_id, 'multiple_choice', 'Why do we change our watches?', 12, NULL, NULL, 
    '[{"id":"opt1","text":"To match local time","is_correct":true,"explanation":"So we are not late for Sushi!"},{"id":"opt2","text":"Just for fun","is_correct":false,"explanation":"Time is important!"}]'::jsonb);

END $$;
