-- INSERT JAPAN FOOD BRANCH & LEVELS (If not exists)
-- This assumes the core country/version structure exists from seed.sql.

-- 1. Get Country Version ID for Japan v1
DO $$
DECLARE
    v_jp_id UUID;
    v_branch_food_id UUID;
    v_branch_lang_id UUID;
    v_lesson_id UUID;
BEGIN
    SELECT id INTO v_jp_id FROM country_versions 
    WHERE country_id = (SELECT id FROM countries WHERE code = 'JP') AND version_number = 1;

    -- 2. Ensure "Food & Dining" Branch Exists
    INSERT INTO branches (country_version_id, name, description, order_index)
    VALUES (v_jp_id, 'Food & Dining', 'Sushi, Ramen, and Etiquette', 2)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_branch_food_id FROM branches 
    WHERE country_version_id = v_jp_id AND name = 'Food & Dining';

    -- 3. Create "Sushi Basics" Level
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_food_id, 'Sushi Basics', 'Learn about Nigiri, Maki, and Wasabi', 1, 1)
    ON CONFLICT DO NOTHING;

    -- 4. Create "Sushi Adventure" Lesson
    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_food_id AND title = 'Sushi Basics'), 
        'Sushi Adventure', 
        'Join John and Rohan for lunch!', 
        1
    )
    RETURNING id INTO v_lesson_id;

    -- 5. Add Activities for Sushi Lesson
    -- Info 1: Setup
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url)
    VALUES (v_lesson_id, 'info', 'Lunch Time!', 1, 'John and Rohan are hungry in Tokyo! They see a restaurant with plates moving on a belt. It is a Conveyor Belt Sushi restaurant! They sit down to eat.', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd43db?auto=format&fit=crop&w=800&q=80');

    -- Info 2: Nigiri
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url)
    VALUES (v_lesson_id, 'info', 'Nigiri Sushi', 2, 'Rohan grabs a plate. It has a slice of fresh fish on top of a small ball of white rice. This is called **Nigiri**.', 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80');

    -- Question 1: Nigiri
    INSERT INTO activities (lesson_id, type, question_text, order_index, options)
    VALUES (v_lesson_id, 'multiple_choice', 'What is the sushi with fish on top of a rice ball called?', 3, 
    '[
        {"id": "opt1", "text": "Nigiri", "is_correct": true, "explanation": "Correct! Nigiri is the classic sushi with fish on rice."},
        {"id": "opt2", "text": "Burger", "is_correct": false, "explanation": "No, that is not sushi!"},
        {"id": "opt3", "text": "Pizza", "is_correct": false, "explanation": "Pizza is delicious, but it is not sushi."}
    ]'::jsonb);

    -- Info 3: Maki
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url)
    VALUES (v_lesson_id, 'info', 'Maki Rolls', 4, 'John loves the rolls wrapped in dark green seaweed. These are called **Maki**. The seaweed is called Nori.', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80');

    -- Question 2: Maki
    INSERT INTO activities (lesson_id, type, question_text, order_index, options)
    VALUES (v_lesson_id, 'multiple_choice', 'Which sushi is wrapped in seaweed?', 5, 
    '[
        {"id": "opt1", "text": "Nigiri", "is_correct": false, "explanation": "Nigiri is the fish on rice."},
        {"id": "opt2", "text": "Maki", "is_correct": true, "explanation": "Yes! Maki rolls are wrapped in Nori (seaweed)."},
        {"id": "opt3", "text": "Soup", "is_correct": false, "explanation": "Soup is a liquid!"}
    ]'::jsonb);

    -- Info 4: Wasabi
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url)
    VALUES (v_lesson_id, 'info', 'Spicy Wasabi', 6, 'John sees a green paste on the table. It is **Wasabi**. It is very spicy, like hot mustard!', 'https://plus.unsplash.com/premium_photo-1675252369719-dd52bc69c3df?auto=format&fit=crop&w=800&q=80');

    -- Question 3: Wasabi Scenario
    INSERT INTO activities (lesson_id, type, question_text, order_index, options)
    VALUES (v_lesson_id, 'multiple_choice', 'John wants to add flavor. Should he eat a whole spoonful of the green Wasabi?', 7, 
    '[
        {"id": "opt1", "text": "Yes, it is sweet like candy!", "is_correct": false, "explanation": "Oh no! John''s mouth is on fire! Wasabi is SPICY!"},
        {"id": "opt2", "text": "No! It is very spicy!", "is_correct": true, "explanation": "Good idea. Just a tiny bit is enough."}
    ]'::jsonb);


    -- BRANCH 2: LANGUAGE BASICS
    SELECT id INTO v_branch_lang_id FROM branches 
    WHERE country_version_id = v_jp_id AND name = 'Language Basics';

    -- Level: Greetings
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_lang_id, 'Daily Greetings', 'Say Hello like a local', 1, 1)
    ON CONFLICT DO NOTHING;

    -- Lesson: Morning & Afternoon
    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_lang_id AND title = 'Daily Greetings'), 
        'A Day in Tokyo', 
        'Learn to say Hello at the right time', 
        1
    )
    RETURNING id INTO v_lesson_id;

    -- Activities for Greetings
    -- Info 1: Morning
    INSERT INTO activities (lesson_id, type, question_text, order_index, content)
    VALUES (v_lesson_id, 'info', 'Good Morning!', 1, 'It is 8:00 AM. Rohan wakes up. He sees his host mother in the kitchen. In Japan, we say **Ohayou Gozaimasu** (Good Morning).');

    -- Question 1: Morning Scenario
    INSERT INTO activities (lesson_id, type, question_text, order_index, options)
    VALUES (v_lesson_id, 'multiple_choice', 'Rohan is sleepy but happy. What does he say to his host mom?', 2, 
    '[
        {"id": "opt1", "text": "Ohayou Gozaimasu", "is_correct": true, "explanation": "Perfect! That means Good Morning."},
        {"id": "opt2", "text": "Konnichiwa", "is_correct": false, "explanation": "Konnichiwa is for the afternoon."},
        {"id": "opt3", "text": "Sayonara", "is_correct": false, "explanation": "Sayonara means Goodbye!"}
    ]'::jsonb);

    -- Info 2: Afternoon
    INSERT INTO activities (lesson_id, type, question_text, order_index, content)
    VALUES (v_lesson_id, 'info', 'Hello (Afternoon)', 3, 'Later, at 2:00 PM, John meets a new friend at the park. The sun is high in the sky. He says **Konnichiwa** (Hello/Good Afternoon).');

    -- Question 2: Afternoon Scenario
    INSERT INTO activities (lesson_id, type, question_text, order_index, options)
    VALUES (v_lesson_id, 'multiple_choice', 'John''s friend waves at him. It is daytime. What does John say?', 4, 
    '[
        {"id": "opt1", "text": "Ohayou", "is_correct": false, "explanation": "It is not morning anymore!"},
        {"id": "opt2", "text": "Konnichiwa", "is_correct": true, "explanation": "Yes! Konnichiwa is perfect for the daytime."},
        {"id": "opt3", "text": "Oyasumi", "is_correct": false, "explanation": "Oyasumi means Goodnight!"}
    ]'::jsonb);


END $$;
