-- FULL JAPAN MODULE SEED (v2)
-- Clears existing Japan activities/lessons to ensure clean state for this module.

DO $$
DECLARE
    v_jp_id UUID;
    
    -- Branches
    v_branch_tourist_id UUID;
    v_branch_food_id UUID;
    v_branch_transport_id UUID;
    v_branch_lang_id UUID;

    -- Lesson IDs
    v_lesson_arrival_id UUID;
    v_lesson_sushi_id UUID;
    v_lesson_train_id UUID;
    v_lesson_greetings_id UUID;

BEGIN
    -- 1. Get Japan Version ID
    SELECT id INTO v_jp_id FROM country_versions 
    WHERE country_id = (SELECT id FROM countries WHERE code = 'JP') AND version_number = 1;

    -- 2. Clear existing structure for a clean slate (optional, but safer for "make the entire module")
    -- We'll delete activities/lessons linked to these branches to regenerate them.
    -- Note: CASCADE delete on branches would work, but let's be surgical.
    
    -- (Skipping massive delete for safety, using ON CONFLICT UPDATE/DO NOTHING strategy)

    -- ==========================================
    -- BRANCH 1: TOURIST ESSENTIALS
    -- ==========================================
    INSERT INTO branches (country_version_id, name, description, order_index)
    VALUES (v_jp_id, 'Tourist Essentials', 'What you will see and do', 1)
    ON CONFLICT (country_version_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_branch_tourist_id;

    -- Level 1: Arrival
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_tourist_id, 'Welcome to Japan', 'Arriving in Tokyo', 1, 1)
    ON CONFLICT (branch_id, title) DO UPDATE SET description = EXCLUDED.description;

    -- Lesson: The Airport
    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_tourist_id AND title = 'Welcome to Japan'), 
        'Landing in Tokyo', 
        'John and Rohan arrive at Narita Airport', 
        1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_lesson_arrival_id;

    -- If lesson already existed, get ID
    IF v_lesson_arrival_id IS NULL THEN
        SELECT id INTO v_lesson_arrival_id FROM lessons WHERE title = 'Landing in Tokyo';
        -- Clear old activities to regenerate
        DELETE FROM activities WHERE lesson_id = v_lesson_arrival_id;
    END IF;

    -- Activities
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url, options) VALUES 
    (v_lesson_arrival_id, 'info', 'Touchdown!', 1, 'John and Rohan look out the window. "Look!" shouts Rohan. "I see red and white towers!" They have landed in Tokyo, the capital of Japan.', 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80', NULL),
    
    (v_lesson_arrival_id, 'multiple_choice', 'What is the capital city of Japan?', 2, NULL, NULL, 
    '[{"id":"opt1","text":"Tokyo","is_correct":true,"explanation":"Correct! Tokyo is the biggest city and capital."},{"id":"opt2","text":"Kyoto","is_correct":false,"explanation":"Kyoto was the old capital long ago."},{"id":"opt3","text":"Osaka","is_correct":false,"explanation":"Osaka is famous for food, but it is not the capital."}]'::jsonb),

    (v_lesson_arrival_id, 'info', 'The Currency', 3, 'At the airport, John needs money. In Japan, they use the **Yen** (¥). It comes in coins and bills.', 'https://images.unsplash.com/photo-1590209488737-25c2765d7949?auto=format&fit=crop&w=800&q=80', NULL),

    (v_lesson_arrival_id, 'multiple_choice', 'John goes to an ATM. What money does he get?', 4, NULL, NULL, 
    '[{"id":"opt1","text":"Dollars","is_correct":false,"explanation":"Dollars are used in the USA."},{"id":"opt2","text":"Yen","is_correct":true,"explanation":"Yes! Yen (¥) is the money in Japan."},{"id":"opt3","text":"Euros","is_correct":false,"explanation":"Euros are used in Europe."}]'::jsonb),

    (v_lesson_arrival_id, 'info', 'Vending Machines', 5, 'Thirsty! Walking out of the terminal, they see a machine selling drinks. Japan has vending machines EVERYWHERE! You can buy hot or cold tea, juice, and even soup!', 'https://images.unsplash.com/photo-1606189569268-52b8618e7724?auto=format&fit=crop&w=800&q=80', NULL),

    (v_lesson_arrival_id, 'multiple_choice', 'Rohan is thirsty. Where can he easily find a drink?', 6, NULL, NULL, 
    '[{"id":"opt1","text":"Vending Machine","is_correct":true,"explanation":"Yes! They are on almost every street corner."},{"id":"opt2","text":"Bank","is_correct":false,"explanation":"Banks have money, not juice!"}]'::jsonb);


    -- ==========================================
    -- BRANCH 2: FOOD & DINING
    -- ==========================================
    INSERT INTO branches (country_version_id, name, description, order_index)
    VALUES (v_jp_id, 'Food & Dining', 'Sushi, Ramen, and Etiquette', 2)
    ON CONFLICT (country_version_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_branch_food_id;

    -- Level 1: Sushi Basics
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_food_id, 'Sushi Basics', 'Learn about Nigiri, Maki, and Wasabi', 1, 1)
    ON CONFLICT (branch_id, title) DO UPDATE SET description = EXCLUDED.description;

    -- Lesson: Sushi Adventure
    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_food_id AND title = 'Sushi Basics'), 
        'Sushi Adventure', 
        'Join John and Rohan for lunch!', 
        1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_lesson_sushi_id;

    IF v_lesson_sushi_id IS NULL THEN
        SELECT id INTO v_lesson_sushi_id FROM lessons WHERE title = 'Sushi Adventure';
        DELETE FROM activities WHERE lesson_id = v_lesson_sushi_id;
    END IF;

    -- Activities (Refined from previous)
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url, options) VALUES 
    (v_lesson_sushi_id, 'info', 'Lunch Time!', 1, 'John and Rohan find a restaurant with plates moving on a belt. It is a Kaiten-zushi (Conveyor Belt Sushi) shop! They sit down.', 'https://images.unsplash.com/photo-1579584425555-c3ce17fd43db?auto=format&fit=crop&w=800&q=80', NULL),

    (v_lesson_sushi_id, 'info', 'Nigiri', 2, 'Rohan grabs a plate. It has a slice of fresh salmon on a small ball of rice. This simple style is called **Nigiri** (nee-gee-ree).', 'https://images.unsplash.com/photo-1553621042-f6e147245754?auto=format&fit=crop&w=800&q=80', NULL),

    (v_lesson_sushi_id, 'multiple_choice', 'What is the sushi with fish on top of a rice ball called?', 3, NULL, NULL, 
    '[{"id":"opt1","text":"Nigiri","is_correct":true,"explanation":"Correct! Nigiri is fish on rice."},{"id":"opt2","text":"Burger","is_correct":false,"explanation":"No way!"},{"id":"opt3","text":"Maki","is_correct":false,"explanation":"Maki is rolled."}]'::jsonb),

    (v_lesson_sushi_id, 'info', 'Maki Rolls', 4, 'John loves the rolls wrapped in dark green seaweed. These are called **Maki** (mah-kee). The seaweed is called Nori.', 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=800&q=80', NULL),

    (v_lesson_sushi_id, 'multiple_choice', 'Which sushi is wrapped in seaweed (Nori)?', 5, NULL, NULL, 
    '[{"id":"opt1","text":"Nigiri","is_correct":false,"explanation":"Nigiri is just fish and rice."},{"id":"opt2","text":"Maki","is_correct":true,"explanation":"Yes! Maki rolls are wrapped in seaweed."}]'::jsonb),

    (v_lesson_sushi_id, 'info', 'Spicy Warning!', 6, 'John sees a green paste. It is **Wasabi** (wah-sah-bee). It is very spicy!', 'https://plus.unsplash.com/premium_photo-1675252369719-dd52bc69c3df?auto=format&fit=crop&w=800&q=80', NULL),

    (v_lesson_sushi_id, 'multiple_choice', 'Should John eat a whole spoonful of Wasabi?', 7, NULL, NULL, 
    '[{"id":"opt1","text":"Yes, yum!","is_correct":false,"explanation":"Oh no! His mouth is burning! Wasabi is SPICY!"},{"id":"opt2","text":"No!","is_correct":true,"explanation":"Smart choice. Use just a tiny bit."}]'::jsonb);

    
    -- ==========================================
    -- BRANCH 3: TRANSPORT
    -- ==========================================
    INSERT INTO branches (country_version_id, name, description, order_index)
    VALUES (v_jp_id, 'Transport', 'Trains, Shinkansen, and Walking', 3)
    ON CONFLICT (country_version_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_branch_transport_id;

    -- Level 1: The Bullet Train
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_transport_id, 'The Bullet Train', 'Super fast travel', 1, 1)
    ON CONFLICT (branch_id, title) DO UPDATE SET description = EXCLUDED.description;

    -- Lesson: Riding the Shinkansen
    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_transport_id AND title = 'The Bullet Train'), 
        'Riding the Shinkansen', 
        'Traveling at super speed to Kyoto', 
        1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_lesson_train_id;

    IF v_lesson_train_id IS NULL THEN
        SELECT id INTO v_lesson_train_id FROM lessons WHERE title = 'Riding the Shinkansen';
        DELETE FROM activities WHERE lesson_id = v_lesson_train_id;
    END IF;

    -- Activities
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, media_url, options) VALUES 
    (v_lesson_train_id, 'info', 'The Shinkansen', 1, 'To go to Kyoto, John takes a special train. It has a long nose and is white and blue. It is the **Shinkansen** (shin-kan-sen) or Bullet Train. It goes 200 mph!', 'https://images.unsplash.com/photo-1555523820-222a7f053576?auto=format&fit=crop&w=800&q=80', NULL),
    
    (v_lesson_train_id, 'multiple_choice', 'What is the fast train called?', 2, NULL, NULL, 
    '[{"id":"opt1","text":"Slow Train","is_correct":false,"explanation":"It is very fast!"},{"id":"opt2","text":"Shinkansen","is_correct":true,"explanation":"Yes! The Bullet Train."},{"id":"opt3","text":"Subway","is_correct":false,"explanation":"The subway is for the city."}]'::jsonb),

    (v_lesson_train_id, 'info', 'Ekiben', 3, 'Before getting on, they buy a special lunch box at the station called **Ekiben** (eh-kee-ben). "Ben" comes from Bento (box lunch).', 'https://images.unsplash.com/photo-1598236104193-4a646271c080?auto=format&fit=crop&w=800&q=80', NULL),

    (v_lesson_train_id, 'multiple_choice', 'What is the station lunch box called?', 4, NULL, NULL, 
    '[{"id":"opt1","text":"Hamburger","is_correct":false,"explanation":"Nope."},{"id":"opt2","text":"Ekiben","is_correct":true,"explanation":"Correct! Station Bento."}]'::jsonb);


    -- ==========================================
    -- BRANCH 4: LANGUAGE BASICS
    -- ==========================================
    INSERT INTO branches (country_version_id, name, description, order_index)
    VALUES (v_jp_id, 'Language Basics', 'Greetings and Politeness', 4)
    ON CONFLICT (country_version_id, name) DO UPDATE SET description = EXCLUDED.description
    RETURNING id INTO v_branch_lang_id;

    -- Level 1: Greetings
    INSERT INTO levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (v_branch_lang_id, 'Daily Greetings', 'Say Hello like a local', 1, 1)
    ON CONFLICT (branch_id, title) DO UPDATE SET description = EXCLUDED.description;

    -- Lesson: A Day in Tokyo
    INSERT INTO lessons (level_id, title, description, order_index)
    VALUES (
        (SELECT id FROM levels WHERE branch_id = v_branch_lang_id AND title = 'Daily Greetings'), 
        'A Day in Tokyo', 
        'Learn to say Hello at the right time', 
        1
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO v_lesson_greetings_id;

    IF v_lesson_greetings_id IS NULL THEN
        SELECT id INTO v_lesson_greetings_id FROM lessons WHERE title = 'A Day in Tokyo';
        DELETE FROM activities WHERE lesson_id = v_lesson_greetings_id;
    END IF;

    -- Activities
    INSERT INTO activities (lesson_id, type, question_text, order_index, content, options) VALUES 
    (v_lesson_greetings_id, 'info', 'Good Morning!', 1, 'It is 8:00 AM. Rohan wakes up. He sees his host mother. In Japan, we say **Ohayou Gozaimasu** (oh-ha-yoh go-zai-mas).', NULL),
    
    (v_lesson_greetings_id, 'multiple_choice', 'What does Rohan say in the morning?', 2, NULL, 
    '[{"id":"opt1","text":"Ohayou Gozaimasu","is_correct":true,"explanation":"Perfect!"},{"id":"opt2","text":"Konnichiwa","is_correct":false,"explanation":"It is too early for Konnichiwa."}]'::jsonb),

    (v_lesson_greetings_id, 'info', 'Thank You!', 3, 'Rohan''s host mom gives him breakfast. He wants to say thank you. He says **Arigatou Gozaimasu** (ah-ree-gah-toh go-zai-mas).', NULL),
    
    (v_lesson_greetings_id, 'multiple_choice', 'How do you say Thank You?', 4, NULL, 
    '[{"id":"opt1","text":"Arigatou","is_correct":true,"explanation":"Yes, Arigatou!"},{"id":"opt2","text":"Sushi","is_correct":false,"explanation":"That is food!"}]'::jsonb),

    (v_lesson_greetings_id, 'info', 'Good Afternoon', 5, 'Later, at 2:00 PM in the park, John meets a friend. He says **Konnichiwa** (kon-nee-chee-wah).', NULL),

    (v_lesson_greetings_id, 'multiple_choice', 'It is daytime. What greeting does John use?', 6, NULL, 
    '[{"id":"opt1","text":"Ohayou","is_correct":false,"explanation":"Not morning."},{"id":"opt2","text":"Konnichiwa","is_correct":true,"explanation":"Correct! Hello/Good Afternoon."}]'::jsonb);

END $$;
