-- SEED: TIME ZONES EXPANDED (Japan)
-- Updates "Time Traveler" lesson to have 32 activities for full difficulty support.

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
    VALUES (v_jp_id, 'Pre-Trip Prep', 'Getting ready for the big trip', 0)
    ON CONFLICT (country_version_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_branch_prep_id;

    -- 3. Create "Time Travel" Level
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_prep_id, 'Time Travel', 'Understanding Time Zones', 1, 1)
    ON CONFLICT (branch_id, title) DO NOTHING;

    -- 4. Get Lesson ID (or create if missing)
    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_prep_id AND title = 'Time Travel'), 
        'Time Traveler''s Watch', 
        'Japan is in the future! Let''s learn why.', 
        1
    )
    ON CONFLICT (level_id, title) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_lesson_time_id;

    -- 5. CLEAR OLD ACTIVITIES to avoid duplicates/messy ordering
    DELETE FROM activities WHERE lesson_id = v_lesson_time_id;

    -- 6. Insert 32 Activities
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url, options) VALUES 
    
    -- #1-10 (Easy / Rookie Set)
    (v_lesson_time_id, 'info', 'Time Travel?', 1, 'Did you know traveling to Japan is like time travel? Japan is the "Land of the Rising Sun". This means they see the sun before we do!', 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'Who sees the sunrise first?', 2, NULL, NULL, '[{"id":"opt1","text":"Japan","is_correct":true,"explanation":"Yes! Japan is in the East."},{"id":"opt2","text":"New York","is_correct":false,"explanation":"New York sees it later."}]'::jsonb),
    (v_lesson_time_id, 'info', 'Day and Night', 3, 'Because the Earth spins, when it is day in America, it might be night in Japan. If it is Noon here, it might be midnight there!', 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'If you are eating Lunch in New York, what are kids in Japan doing?', 4, NULL, NULL, '[{"id":"opt1","text":"Eating Lunch","is_correct":false,"explanation":"Nope, it is night!"},{"id":"opt2","text":"Sleeping","is_correct":true,"explanation":"Correct! It is sleepy time."}]'::jsonb),
    (v_lesson_time_id, 'info', 'Japan Standard Time', 5, 'Japan uses JST. It is usually 13 or 14 hours AHEAD of New York. That means they are in "Tomorrow"!', 'https://images.unsplash.com/photo-1502421713837-77291a13e54b?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'Is Japan in the future or the past?', 6, NULL, NULL, '[{"id":"opt1","text":"The Future","is_correct":true,"explanation":"Yes! They enable the new day first."},{"id":"opt2","text":"The Past","is_correct":false,"explanation":"No, they are ahead."}]'::jsonb),
    (v_lesson_time_id, 'info', 'Jet Lag', 7, 'When you fly to Japan, your body gets confused. You might want to sleep at lunch! This is called **Jet Lag**.', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'What is it called when your body clock is confused?', 8, NULL, NULL, '[{"id":"opt1","text":"Rocket Lag","is_correct":false,"explanation":"Funny, but no."},{"id":"opt2","text":"Jet Lag","is_correct":true,"explanation":"Correct!"}]'::jsonb),
    (v_lesson_time_id, 'info', 'The Magic Line', 9, 'The International Date Line is an imaginary line in the ocean. Crossing it changes the calendar day!', 'https://images.unsplash.com/photo-1456935266854-3c66f91f3494?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'If you fly to Japan, do you arrive the same day?', 10, NULL, NULL, '[{"id":"opt1","text":"Usually the next day","is_correct":true,"explanation":"You skip ahead!"},{"id":"opt2","text":"Yesterday","is_correct":false,"explanation":"Nope!"}]'::jsonb),

    -- #11-20 (Medium / Scout Set)
    (v_lesson_time_id, 'info', 'Calling Home', 11, 'If you want to call Grandma in New York, don''t call at 2 PM Japan time. It might be 1 AM for her!', 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'When is a good time to call New York from Japan?', 12, NULL, NULL, '[{"id":"opt1","text":"7:00 AM in Japan","is_correct":true,"explanation":"It would be evening in NY."},{"id":"opt2","text":"3:00 AM in Japan","is_correct":false,"explanation":"Grandma is sleeping!"}]'::jsonb),
    (v_lesson_time_id, 'info', 'No Daylight Savings', 13, 'Japan does not use Daylight Savings Time. They don''t change their clocks in summer like some countries do.', 'https://images.unsplash.com/photo-1501139083538-0139583c61ee?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'Do Japanese clocks change in summer?', 14, NULL, NULL, '[{"id":"opt1","text":"Yes","is_correct":false,"explanation":"Nope, they stay the same."},{"id":"opt2","text":"No","is_correct":true,"explanation":"Correct! No DST in Japan."}]'::jsonb),
    (v_lesson_time_id, 'info', 'Flight Time', 15, 'The flight from New York to Tokyo is very long—about 14 hours! That''s a lot of movies.', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'How long is the flight?', 16, NULL, NULL, '[{"id":"opt1","text":"2 hours","is_correct":false,"explanation":"Too short!"},{"id":"opt2","text":"14 hours","is_correct":true,"explanation":"It is a long haul!"}]'::jsonb),
    (v_lesson_time_id, 'info', 'Sleeping on the Plane', 17, 'To beat Jet Lag, try to sleep on the plane if it is night time in Japan. It helps your body adjust.', 'https://images.unsplash.com/photo-1544983058-bf66752d5e30?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'Should you sleep on the plane?', 18, NULL, NULL, '[{"id":"opt1","text":"Yes, if it helps match time","is_correct":true,"explanation":"Good strategy."},{"id":"opt2","text":"Never","is_correct":false,"explanation":"You will be tired!"}]'::jsonb),
    (v_lesson_time_id, 'info', 'Breakfast for Dinner?', 19, 'Because of the time difference, your stomach might want pancakes when everyone else is eating Sushi for dinner!', 'https://images.unsplash.com/photo-1493770348161-369560ae357d?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'Why are you hungry at weird times?', 20, NULL, NULL, '[{"id":"opt1","text":"Magic","is_correct":false,"explanation":"Not magic."},{"id":"opt2","text":"Body Clock","is_correct":true,"explanation":"Your internal clock is still on home time."}]'::jsonb),

    -- #21-32 (Hard / Captain Set)
    (v_lesson_time_id, 'info', 'World Map', 21, 'Look at a map. Japan is on the far right (East). The USA is on the left (West). The sun rises in the East!', 'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'Does the sun rise in the East or West?', 22, NULL, NULL, '[{"id":"opt1","text":"East","is_correct":true,"explanation":"The sun rises in the East."},{"id":"opt2","text":"West","is_correct":false,"explanation":"Sets in the West!"}]'::jsonb),
    (v_lesson_time_id, 'info', 'Date Line Math', 23, 'If it is Monday 9am in Japan, it might be Sunday 8pm in New York. Japan is usually "Tomorrow".', 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'If it is Tuesday in Japan, what day might it be in USA?', 24, NULL, NULL, '[{"id":"opt1","text":"Monday","is_correct":true,"explanation":"USA is often a day behind."},{"id":"opt2","text":"Wednesday","is_correct":false,"explanation":"USA is not ahead."}]'::jsonb),
    (v_lesson_time_id, 'info', '24 Hour Clock', 25, 'Japan uses the 24-hour clock often. 1:00 PM is "13:00". 6:00 PM is "18:00".', 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'What time is 15:00?', 26, NULL, NULL, '[{"id":"opt1","text":"3:00 PM","is_correct":true,"explanation":"15 - 12 = 3 PM"},{"id":"opt2","text":"5:00 PM","is_correct":false,"explanation":"Check your math!"}]'::jsonb),
    (v_lesson_time_id, 'info', 'Returning Home', 27, 'When you fly back to the USA, you might arrive BEFORE you left! You cross the line back into "Yesterday".', 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'Can you land before you took off?', 28, NULL, NULL, '[{"id":"opt1","text":"Yes, on the clock/calendar","is_correct":true,"explanation":"Because of time zones!"},{"id":"opt2","text":"Impossible","is_correct":false,"explanation":"It happens all the time!"}]'::jsonb),
    (v_lesson_time_id, 'info', 'Sunshine', 29, 'Because Japan gets sun first, the flag has a big red sun in the middle!', 'https://images.unsplash.com/photo-1528164344753-204a6c205759?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'What is on the Japanese flag?', 30, NULL, NULL, '[{"id":"opt1","text":"A Red Sun","is_correct":true,"explanation":"Hinomaru - Circle of the Sun."},{"id":"opt2","text":"A Blue Moon","is_correct":false,"explanation":"Nope."}]'::jsonb),
    (v_lesson_time_id, 'info', 'Time Master', 31, 'You are now a Time Master! Remember to drink water and get sunlight to feel better.', 'https://images.unsplash.com/photo-1550291652-6ea9114a47b1?auto=format&fit=crop&w=800&q=80', NULL),
    (v_lesson_time_id, 'multiple_choice', 'What helps with Jet Lag?', 32, NULL, NULL, '[{"id":"opt1","text":"Sunlight and Water","is_correct":true,"explanation":"Go outside and stay hydrated."},{"id":"opt2","text":"Candy","is_correct":false,"explanation":"Candy is tasty but won''t fix Jet Lag."}]'::jsonb);

END $$;
