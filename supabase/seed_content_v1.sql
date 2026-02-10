-- JAPAN CONTENT (Continuing from Lesson 1)
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
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;

    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';
    SELECT id INTO food_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Food & Dining';
    SELECT id INTO transport_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Transport';
    SELECT id INTO lang_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Language Basics';

    -- Lesson 2: Conbini (Tourist)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Convenience Stores', 'The magic of Konbini', 2, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Konbini Magic', 'Why Japanese convenience stores are amazing.', 2) RETURNING id INTO lesson_id;

    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'In Japan, convenience stores are called "Konbini". They have everything!', null, 1),
    (lesson_id, 'multiple_choice', 'Which of these can you find in a Konbini?', '[{"id":"1","text":"Fresh Sushi","is_correct":true}, {"id":"2","text":"Concert Tickets","is_correct":true}, {"id":"3","text":"Both!","is_correct":true, "explanation":"You can buy food, tickets, and even pay bills!"}]'::jsonb, 2);

    -- Lesson 3: Trains (Transport)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (transport_branch_id, 'Riding the Train', 'Quiet and Fast', 1, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Train Etiquette', 'Shhh! It is quiet time.', 1) RETURNING id INTO lesson_id;

    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'What should you NOT do on a Japanese train?', '[{"id":"1","text":"Talk loudly on phone","is_correct":true, "explanation":"Trains are very quiet."}, {"id":"2","text":"Sleep","is_correct":false}, {"id":"3","text":"Read","is_correct":false}]'::jsonb, 1),
    (lesson_id, 'image_choice', 'Which card do you use for trains?', '[{"id":"1","text":"Suica / Pasmo","is_correct":true, "explanation":"These are the IC cards for travel."}, {"id":"2","text":"Library Card","is_correct":false}]'::jsonb, 2);

    -- Lesson 4: Chopsticks (Food)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (food_branch_id, 'Chopstick Manners', 'Do not pass food!', 1, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Using Chopsticks', 'Important rules for eating.', 1) RETURNING id INTO lesson_id;

    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Is it okay to pass food from chopstick to chopstick?', '[{"id":"1","text":"No, never!","is_correct":true, "explanation":"This reminds people of funerals. Put it on a plate first."}, {"id":"2","text":"Yes, always","is_correct":false}]'::jsonb, 1);

    -- Lesson 5: Vending Machines (Tourist)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Vending Machines', 'On every corner', 3, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Drinks Everywhere', 'Hot and cold drinks!', 3) RETURNING id INTO lesson_id;

    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Japan has more vending machines than almost anywhere else!', null, 1),
    (lesson_id, 'multiple_choice', 'Blue label means cold. What does Red label mean?', '[{"id":"1","text":"Hot Drink","is_correct":true}, {"id":"2","text":"Spicy Drink","is_correct":false}]'::jsonb, 2);

    -- Lesson 6: Thank You (Language)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (lang_branch_id, 'Manners', 'Saying Thanks', 1, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Saying Arigato', 'Politeness is key.', 1) RETURNING id INTO lesson_id;
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'How do you say "Thank you"?', '[{"id":"1","text":"Arigato Gozaimasu","is_correct":true}, {"id":"2","text":"Konnichiwa","is_correct":false}]'::jsonb, 1);

    -- Lesson 7: Shoes Off (Culture - put in Tourist for now or create Culture branch if needed, using Tourist)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Indoor Manners', 'Shoes off!', 4, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Genkan Area', 'Where to leave your shoes.', 4) RETURNING id INTO lesson_id;

    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'scenario', 'You are entering a house. What do you do first?', '[{"id":"1","text":"Take off shoes","is_correct":true}, {"id":"2","text":"Run inside","is_correct":false}]'::jsonb, 1);
END $$;

-- PERU CONTENT (7 Lessons)
DO $$
DECLARE
    peru_id UUID;
    v1_id UUID;
    tourist_branch_id UUID;
    food_branch_id UUID;
    transport_branch_id UUID;
    lang_branch_id UUID;
    level_id UUID;
    lesson_id UUID;
BEGIN
    SELECT id INTO peru_id FROM public.countries WHERE code = 'PE';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = peru_id AND version_number = 1;

    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';
    SELECT id INTO food_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Food & Markets';
    SELECT id INTO transport_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Transport';
    SELECT id INTO lang_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Language Basics';

    -- Lesson 1: Lima
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'Arrival in Lima', 'The Capital City', 1) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Walking in Miraflores', 'Ocean views and cats.', 1) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Lima is on the coast of the Pacific Ocean.', null, 1),
    (lesson_id, 'multiple_choice', 'What park in Lima is famous for its cats?', '[{"id":"1","text":"Kennedy Park","is_correct":true}, {"id":"2","text":"Central Park","is_correct":false}]'::jsonb, 2);

    -- Lesson 2: Machu Picchu
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'Ancient City', 'In the clouds', 2) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Machu Picchu', 'Lost city of the Incas.', 2) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Who built Machu Picchu?', '[{"id":"1","text":"The Incas","is_correct":true}, {"id":"2","text":"The Romans","is_correct":false}]'::jsonb, 1);

    -- Lesson 3: Llamas
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'Animal Friends', 'Wooly friends', 3) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Llama or Alpaca?', 'Can you tell the difference?', 3) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Alpacas are smaller and fluffy. Llamas are bigger!', null, 1);

    -- Lesson 4: Food
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (food_branch_id, 'Peruvian Food', 'Delicious flavors', 1) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Potatoes & Corn', 'So many kinds!', 1) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Where do potatoes come from originally?', '[{"id":"1","text":"Peru!","is_correct":true}, {"id":"2","text":"Ireland","is_correct":false}]'::jsonb, 1);

    -- Lesson 5: Altitude
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'High Up', 'Breathing checks', 4) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Altitude Sickness', 'Take it slow.', 4) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Cusco is very high up. What should you do on day 1?', '[{"id":"1","text":"Rest and drink water","is_correct":true}, {"id":"2","text":"Run a marathon","is_correct":false}]'::jsonb, 1);

    -- Lesson 6: Money
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'Markets', 'Buying souvenirs', 5) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Soles', 'Peruvian money.', 5) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'The money is called Soles. What does "Sol" mean?', '[{"id":"1","text":"Sun","is_correct":true}, {"id":"2","text":"Moon","is_correct":false}]'::jsonb, 1);

    -- Lesson 7: Greetings
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (lang_branch_id, 'Greetings', 'Hola!', 1) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Saying Hello', 'Spanish basics.', 1) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'How do you say "Friend" in Spanish?', '[{"id":"1","text":"Amigo","is_correct":true}, {"id":"2","text":"Gato","is_correct":false}]'::jsonb, 1);
END $$;

-- GREECE CONTENT (7 Lessons)
DO $$
DECLARE
    greece_id UUID;
    v1_id UUID;
    tourist_branch_id UUID;
    food_branch_id UUID;
    transport_branch_id UUID;
    lang_branch_id UUID;
    level_id UUID;
    lesson_id UUID;
BEGIN
    SELECT id INTO greece_id FROM public.countries WHERE code = 'GR';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = greece_id AND version_number = 1;

    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';
    SELECT id INTO food_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Food & Tavernas';
    SELECT id INTO transport_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Transport';
    SELECT id INTO lang_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Language Basics';

    -- Lesson 1: Athens
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'Athens', 'The Capital', 1) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'The Acropolis', 'High City.', 1) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'The Parthenon sits on top of the Acropolis in Athens.', null, 1),
    (lesson_id, 'multiple_choice', 'It is very old! Who built it?', '[{"id":"1","text":"Ancient Greeks","is_correct":true}, {"id":"2","text":"Robots","is_correct":false}]'::jsonb, 2);

    -- Lesson 2: Islands
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'The Islands', 'Blue water', 2) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Ferry Ride', 'Hopping islands.', 2) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'image_choice', 'Houses on Santorini are often white and which other color?', '[{"id":"1","text":"Blue","is_correct":true}, {"id":"2","text":"Red","is_correct":false}]'::jsonb, 1);

    -- Lesson 3: Food
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (food_branch_id, 'Greek Food', 'Yum!', 1) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Gyros', 'Street food.', 1) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'What distinguishes a Gyro?', '[{"id":"1","text":"Meat cooked on a vertical spinner","is_correct":true}, {"id":"2","text":"It is a soup","is_correct":false}]'::jsonb, 1);

    -- Lesson 4: Salad
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (food_branch_id, 'Greek Salad', 'Fresh and healthy', 2) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'No Lettuce?', 'Traditional way.', 2) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Does a traditional Greek salad have lettuce?', '[{"id":"1","text":"No","is_correct":true}, {"id":"2","text":"Yes","is_correct":false}]'::jsonb, 1);

    -- Lesson 5: Cats
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (tourist_branch_id, 'More Cats', 'They are everywhere!', 3) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Island Cats', 'Friendly locals.', 3) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'In Greece, you will see many friendly stray cats. They are part of the community.', null, 1);

    -- Lesson 6: Alphabet
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (lang_branch_id, 'Alphabet', 'It looks different!', 1) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Alpha Beta', 'Letters.', 1) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'The letter "Delta" looks like what shape?', '[{"id":"1","text":"Triangle","is_correct":true}, {"id":"2","text":"Circle","is_correct":false}]'::jsonb, 1);

    -- Lesson 7: Meaning of Yes/No
    INSERT INTO public.levels (branch_id, title, description, order_index) VALUES (lang_branch_id, 'Tricky Gestures', 'Body language', 2) RETURNING id INTO level_id;
    INSERT INTO public.lessons (level_id, title, description, order_index) VALUES (level_id, 'Nodding for No?', 'Be careful!', 2) RETURNING id INTO lesson_id;
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'In Greece, sometimes listing the head up means "No".', null, 1);

END $$;
