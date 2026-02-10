-- CULTURE CONTENT EXPANSION V5 (User Context)
DO $$
DECLARE
    japan_id UUID;
    v1_id UUID;
    tourist_branch_id UUID;
    level_id UUID;
    lesson_id UUID;
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;
    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';

    -- CLEANUP: Delete levels created by previous expansions (indices > 10) if any, or we can just append
    -- Strategy: We will replace content if it exists or create new.
    -- For simplicity, let's just delete the specific levels we are about to create if they exist by title?
    -- Actually, safest is to remove old ones derived from previous seeds if they clash.
    -- The previous v4 seed used indices 11-20 (10+1 to 10+10).
    -- We will reuse that range 11-20.
    
    DELETE FROM public.levels WHERE branch_id = tourist_branch_id AND order_index > 10 AND order_index <= 20;


    -- Tourist Lesson 1 (Questions 1-20)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 1', 'Japanese Manners & Customs 1', 10 + 1, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 1', 'Japanese Etiquette 1', 10 + 1) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 1! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Take off shoes in many homes.

What is a common first step when entering a home?', '[{"id": "A", "text": "Take off your shoes and place them neatly", "is_correct": true}, {"id": "B", "text": "Put your shoes on the couch", "is_correct": false}, {"id": "C", "text": "Keep your shoes on in the living room", "is_correct": false}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Slippers are often used indoors.

Why might a home have slippers for guests?', '[{"id": "A", "text": "To use as toys", "is_correct": false}, {"id": "B", "text": "To wear inside instead of shoes", "is_correct": true}, {"id": "C", "text": "To wear outside on the street", "is_correct": false}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some homes have bathroom-only slippers.

What is special about bathroom slippers?', '[{"id": "A", "text": "They are for sleeping", "is_correct": false}, {"id": "B", "text": "They are for running outside", "is_correct": false}, {"id": "C", "text": "They are only for the bathroom area", "is_correct": true}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People often bow to greet.

What can a small bow show?', '[{"id": "A", "text": "That you are bored", "is_correct": false}, {"id": "B", "text": "Respect", "is_correct": true}, {"id": "C", "text": "That you want to race", "is_correct": false}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Lines are common at trains and stores.

What should you do when others are waiting?', '[{"id": "A", "text": "Push past people", "is_correct": false}, {"id": "B", "text": "Cut to the front quickly", "is_correct": false}, {"id": "C", "text": "Stand in line and wait", "is_correct": true}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Quiet voices are common on trains.

What is a good train behavior?', '[{"id": "A", "text": "Shout across the car", "is_correct": false}, {"id": "B", "text": "Talk softly", "is_correct": true}, {"id": "C", "text": "Play videos out loud", "is_correct": false}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Phones are often on silent in public.

What might you do with your phone on a train?', '[{"id": "A", "text": "Turn the volume up", "is_correct": false}, {"id": "B", "text": "Play a game with sound", "is_correct": false}, {"id": "C", "text": "Put it on silent", "is_correct": true}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Itadakimasu (Ee-tah-dah-KEE-mahs) is said before eating.

When do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id": "A", "text": "Before eating", "is_correct": true}, {"id": "B", "text": "After eating", "is_correct": false}, {"id": "C", "text": "Before sleeping", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gochisousama (Go-chee-SOH-sah-mah) is said after eating.

When do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id": "A", "text": "When meeting a friend", "is_correct": false}, {"id": "B", "text": "After eating", "is_correct": true}, {"id": "C", "text": "Before eating", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Arigatou (Ah-REE-gah-toh) means thank you.

What does Arigatou (Ah-REE-gah-toh) mean?', '[{"id": "A", "text": "Good morning", "is_correct": false}, {"id": "B", "text": "Thank you", "is_correct": true}, {"id": "C", "text": "Excuse me", "is_correct": false}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Sumimasen (Sue-mee-MAH-sen) can mean excuse me.

Why might someone say Sumimasen (Sue-mee-MAH-sen)?', '[{"id": "A", "text": "To say good night", "is_correct": false}, {"id": "B", "text": "To get attention politely", "is_correct": true}, {"id": "C", "text": "To say you are full", "is_correct": false}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Onegaishimasu (Oh-neh-gai-shee-MAH-s) is used when asking politely.

When might you say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id": "A", "text": "When saying goodbye", "is_correct": false}, {"id": "B", "text": "When telling a joke", "is_correct": false}, {"id": "C", "text": "When making a polite request", "is_correct": true}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gomen nasai (Go-men nah-SAI) is an apology.

When might you say Gomen nasai (Go-men nah-SAI)?', '[{"id": "A", "text": "After winning a game", "is_correct": false}, {"id": "B", "text": "After opening a present", "is_correct": false}, {"id": "C", "text": "After bumping into someone", "is_correct": true}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Chopsticks have special manners.

What is a good chopsticks choice?', '[{"id": "A", "text": "Point them at people", "is_correct": false}, {"id": "B", "text": "Set them down neatly when done", "is_correct": true}, {"id": "C", "text": "Stick them upright in rice", "is_correct": false}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Passing items with two hands can be polite.

Why use two hands to give something?', '[{"id": "A", "text": "To show respect", "is_correct": true}, {"id": "B", "text": "To make it heavier", "is_correct": false}, {"id": "C", "text": "To show you are fast", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Trash cans can be rare in public.

What might you do with trash if there is no bin?', '[{"id": "A", "text": "Hide it under a seat", "is_correct": false}, {"id": "B", "text": "Keep it until you find a bin", "is_correct": true}, {"id": "C", "text": "Drop it on the ground", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Recycling and sorting are common.

Why might there be different trash bins?', '[{"id": "A", "text": "For hiding snacks", "is_correct": false}, {"id": "B", "text": "For sorting different kinds of trash", "is_correct": true}, {"id": "C", "text": "For storing shoes", "is_correct": false}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Being on time matters.

What is a good habit for meetings?', '[{"id": "A", "text": "Arrive on time", "is_correct": true}, {"id": "B", "text": "Arrive very late", "is_correct": false}, {"id": "C", "text": "Skip without telling", "is_correct": false}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Personal space is respected.

What is a polite choice in a crowded place?', '[{"id": "A", "text": "Run and weave", "is_correct": false}, {"id": "B", "text": "Avoid bumping into others", "is_correct": true}, {"id": "C", "text": "Push through people", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'At shrines, people may rinse hands.

Why rinse hands at a shrine?', '[{"id": "A", "text": "To wash toys", "is_correct": false}, {"id": "B", "text": "To be respectful", "is_correct": true}, {"id": "C", "text": "To cool candy", "is_correct": false}]'::jsonb, 21);


    -- Tourist Lesson 2 (Questions 21-40)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 2', 'Japanese Manners & Customs 2', 10 + 2, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 2', 'Japanese Etiquette 2', 10 + 2) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 2! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'At some shrines, you bow before entering.

When might you bow at a shrine?', '[{"id": "A", "text": "Before going in", "is_correct": true}, {"id": "B", "text": "While tying shoes", "is_correct": false}, {"id": "C", "text": "While eating noodles", "is_correct": false}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Konnichiwa (Kon-NEE-chee-wah) is a daytime greeting.

What does Konnichiwa (Kon-NEE-chee-wah) mean?', '[{"id": "A", "text": "Good night", "is_correct": false}, {"id": "B", "text": "Hello / Good day", "is_correct": true}, {"id": "C", "text": "Goodbye", "is_correct": false}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Ohayou (Oh-HAH-yoh) is a morning greeting.

When do people often say Ohayou (Oh-HAH-yoh)?', '[{"id": "A", "text": "In the morning", "is_correct": true}, {"id": "B", "text": "At midnight", "is_correct": false}, {"id": "C", "text": "After dinner", "is_correct": false}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Konbanwa (Kon-bahn-wah) is an evening greeting.

What does Konbanwa (Kon-bahn-wah) mean?', '[{"id": "A", "text": "Nice to meet you", "is_correct": false}, {"id": "B", "text": "Good evening", "is_correct": true}, {"id": "C", "text": "Good morning", "is_correct": false}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Sayonara (Sah-yoh-NAH-rah) can mean goodbye.

When might you say Sayonara (Sah-yoh-NAH-rah)?', '[{"id": "A", "text": "When leaving", "is_correct": true}, {"id": "B", "text": "When eating", "is_correct": false}, {"id": "C", "text": "When waking up", "is_correct": false}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Inside voices are valued at temples and trains.

Where should you use a quiet voice?', '[{"id": "A", "text": "At a loud concert", "is_correct": false}, {"id": "B", "text": "On a playground", "is_correct": false}, {"id": "C", "text": "On trains and at temples", "is_correct": true}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People often wait for the walk signal.

What is a common street rule?', '[{"id": "A", "text": "Run across any time", "is_correct": false}, {"id": "B", "text": "Wait for the signal to cross", "is_correct": true}, {"id": "C", "text": "Cross while texting", "is_correct": false}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Escalators often have a standing side.

What should you do on an escalator in a busy station?', '[{"id": "A", "text": "Walk backwards", "is_correct": false}, {"id": "B", "text": "Stand to one side if people pass", "is_correct": true}, {"id": "C", "text": "Sit on the steps", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Many people carry a small towel/handkerchief.

Why might someone carry a small towel?', '[{"id": "A", "text": "To dry hands", "is_correct": true}, {"id": "B", "text": "To cover a sandwich", "is_correct": false}, {"id": "C", "text": "To play tug-of-war", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'School kids often clean their classroom.

Why might students help clean at school?', '[{"id": "A", "text": "To earn candy", "is_correct": false}, {"id": "B", "text": "To avoid homework forever", "is_correct": false}, {"id": "C", "text": "To take care of shared spaces", "is_correct": true}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Shoes are often removed in some traditional rooms.

Which place might ask you to remove shoes?', '[{"id": "A", "text": "A swimming pool", "is_correct": false}, {"id": "B", "text": "A tatami room", "is_correct": true}, {"id": "C", "text": "A bus stop", "is_correct": false}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Tatami mats are woven floor mats.

What is tatami?', '[{"id": "A", "text": "A kind of car", "is_correct": false}, {"id": "B", "text": "A kind of phone", "is_correct": false}, {"id": "C", "text": "A kind of floor mat", "is_correct": true}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Bento is a packed lunch box.

What is a bento?', '[{"id": "A", "text": "A type of shoe", "is_correct": false}, {"id": "B", "text": "A video game", "is_correct": false}, {"id": "C", "text": "A lunch box with food", "is_correct": true}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Onigiri are rice balls.

What are onigiri?', '[{"id": "A", "text": "Rice balls", "is_correct": true}, {"id": "B", "text": "Cold soup", "is_correct": false}, {"id": "C", "text": "Sweet donuts", "is_correct": false}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Miso soup is common.

What is miso soup usually made from?', '[{"id": "A", "text": "Soda", "is_correct": false}, {"id": "B", "text": "Miso paste", "is_correct": true}, {"id": "C", "text": "Chocolate", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Green tea is popular.

What is a common drink in Japan?', '[{"id": "A", "text": "Hot chocolate only", "is_correct": false}, {"id": "B", "text": "Green tea", "is_correct": true}, {"id": "C", "text": "Milkshakes only", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Cherry blossoms are called sakura.

What does sakura mean?', '[{"id": "A", "text": "Cherry blossoms", "is_correct": true}, {"id": "B", "text": "Snowman", "is_correct": false}, {"id": "C", "text": "Thunder", "is_correct": false}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Hanami is viewing cherry blossoms.

What is hanami?', '[{"id": "A", "text": "Watching fireworks only", "is_correct": false}, {"id": "B", "text": "Looking at cherry blossoms", "is_correct": true}, {"id": "C", "text": "Building a sandcastle", "is_correct": false}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'A shrine (jinja) is different from a temple (tera).

Which place is often for Shinto?', '[{"id": "A", "text": "Shrine", "is_correct": true}, {"id": "B", "text": "Library", "is_correct": false}, {"id": "C", "text": "Temple", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Many people take a bath at night.

When might families take a bath?', '[{"id": "A", "text": "Only outside", "is_correct": false}, {"id": "B", "text": "Only at noon", "is_correct": false}, {"id": "C", "text": "In the evening", "is_correct": true}]'::jsonb, 21);


    -- Tourist Lesson 3 (Questions 41-60)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 3', 'Japanese Manners & Customs 3', 10 + 3, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 3', 'Japanese Etiquette 3', 10 + 3) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 3! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Bathing often means washing first, then soaking.

What is a common bath order?', '[{"id": "A", "text": "Soak first, then wash", "is_correct": false}, {"id": "B", "text": "Wear shoes in the tub", "is_correct": false}, {"id": "C", "text": "Wash first, then soak", "is_correct": true}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some toilets have many buttons.

What is a good rule in a new bathroom?', '[{"id": "A", "text": "Press every button fast", "is_correct": false}, {"id": "B", "text": "Ignore instructions", "is_correct": false}, {"id": "C", "text": "Ask or look at signs", "is_correct": true}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gift wrapping is often careful and neat.

Why is gift wrapping often neat?', '[{"id": "A", "text": "It makes gifts louder", "is_correct": false}, {"id": "B", "text": "It makes gifts heavier", "is_correct": false}, {"id": "C", "text": "It shows care", "is_correct": true}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People may refuse a gift once or twice politely.

What might happen when you offer a gift?', '[{"id": "A", "text": "They may say no at first to be polite", "is_correct": true}, {"id": "B", "text": "They will throw it away", "is_correct": false}, {"id": "C", "text": "They will always take it instantly", "is_correct": false}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Indoor shoes vs outdoor shoes are different.

Where should outdoor shoes usually stay?', '[{"id": "A", "text": "On the bed", "is_correct": false}, {"id": "B", "text": "On the dining table", "is_correct": false}, {"id": "C", "text": "Near the entrance", "is_correct": true}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some restaurants use a ticket machine to order.

How might you order at some noodle shops?', '[{"id": "A", "text": "Leave money on the floor", "is_correct": false}, {"id": "B", "text": "Buy a ticket first", "is_correct": true}, {"id": "C", "text": "Yell your order loudly", "is_correct": false}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'You may hear ‘Irasshaimase’ in shops.

What does Irasshaimase often mean?', '[{"id": "A", "text": "Goodbye", "is_correct": false}, {"id": "B", "text": "Welcome", "is_correct": true}, {"id": "C", "text": "Hurry up", "is_correct": false}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People avoid eating while walking in some places.

What is often a better choice with snacks?', '[{"id": "A", "text": "Stop and eat, then walk", "is_correct": true}, {"id": "B", "text": "Throw food on the street", "is_correct": false}, {"id": "C", "text": "Eat while running", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Seasonal foods are enjoyed.

Why do people talk about seasonal foods?', '[{"id": "A", "text": "They are all candy", "is_correct": false}, {"id": "B", "text": "They never change", "is_correct": false}, {"id": "C", "text": "They change with the seasons", "is_correct": true}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'New Year is an important holiday.

What do many families do for New Year?', '[{"id": "A", "text": "Only play soccer", "is_correct": false}, {"id": "B", "text": "Visit family and shrines", "is_correct": true}, {"id": "C", "text": "Ignore the day", "is_correct": false}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Respect for elders is important.

How can you show respect to older people?', '[{"id": "A", "text": "Make fun of them", "is_correct": false}, {"id": "B", "text": "Interrupt a lot", "is_correct": false}, {"id": "C", "text": "Use polite words and listen", "is_correct": true}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Taking turns is valued in groups.

What is a good group habit?', '[{"id": "A", "text": "Wait your turn", "is_correct": true}, {"id": "B", "text": "Grab things first", "is_correct": false}, {"id": "C", "text": "Shout over others", "is_correct": false}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Kawaii means cute.

What does kawaii mean?', '[{"id": "A", "text": "Angry", "is_correct": false}, {"id": "B", "text": "Fast", "is_correct": false}, {"id": "C", "text": "Cute", "is_correct": true}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Anime is Japanese animation.

What is anime?', '[{"id": "A", "text": "A train ticket", "is_correct": false}, {"id": "B", "text": "A kind of sandwich", "is_correct": false}, {"id": "C", "text": "Japanese cartoons/animation", "is_correct": true}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Manga are Japanese comics.

What is manga?', '[{"id": "A", "text": "A sport", "is_correct": false}, {"id": "B", "text": "Japanese comics", "is_correct": true}, {"id": "C", "text": "A fruit", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Ryokan are traditional inns.

What is a ryokan?', '[{"id": "A", "text": "A spaceship", "is_correct": false}, {"id": "B", "text": "A fast food", "is_correct": false}, {"id": "C", "text": "A traditional inn", "is_correct": true}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Futons may be used for sleeping.

What is a futon?', '[{"id": "A", "text": "A soup bowl", "is_correct": false}, {"id": "B", "text": "A bicycle", "is_correct": false}, {"id": "C", "text": "A bed you can fold/roll", "is_correct": true}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Vending machines are common.

Where might you see vending machines?', '[{"id": "A", "text": "Only underwater", "is_correct": false}, {"id": "B", "text": "Many streets and stations", "is_correct": true}, {"id": "C", "text": "Only in forests", "is_correct": false}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Convenience stores are called konbini.

What is a konbini?', '[{"id": "A", "text": "A convenience store", "is_correct": true}, {"id": "B", "text": "A museum", "is_correct": false}, {"id": "C", "text": "A school bus", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Taking a small gift when visiting is common.

What might you bring when visiting someone?', '[{"id": "A", "text": "A small snack or gift", "is_correct": true}, {"id": "B", "text": "A pile of trash", "is_correct": false}, {"id": "C", "text": "A loud horn", "is_correct": false}]'::jsonb, 21);


    -- Tourist Lesson 4 (Questions 61-80)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 4', 'Japanese Manners & Customs 4', 10 + 4, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 4', 'Japanese Etiquette 4', 10 + 4) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 4! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Take off shoes in many homes.

What is a common first step when entering a home?', '[{"id": "A", "text": "Keep your shoes on in the living room", "is_correct": false}, {"id": "B", "text": "Put your shoes on the couch", "is_correct": false}, {"id": "C", "text": "Take off your shoes and place them neatly", "is_correct": true}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Slippers are often used indoors.

Why might a home have slippers for guests?', '[{"id": "A", "text": "To wear outside on the street", "is_correct": false}, {"id": "B", "text": "To use as toys", "is_correct": false}, {"id": "C", "text": "To wear inside instead of shoes", "is_correct": true}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some homes have bathroom-only slippers.

What is special about bathroom slippers?', '[{"id": "A", "text": "They are for running outside", "is_correct": false}, {"id": "B", "text": "They are only for the bathroom area", "is_correct": true}, {"id": "C", "text": "They are for sleeping", "is_correct": false}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People often bow to greet.

What can a small bow show?', '[{"id": "A", "text": "That you want to race", "is_correct": false}, {"id": "B", "text": "That you are bored", "is_correct": false}, {"id": "C", "text": "Respect", "is_correct": true}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Lines are common at trains and stores.

What should you do when others are waiting?', '[{"id": "A", "text": "Stand in line and wait", "is_correct": true}, {"id": "B", "text": "Push past people", "is_correct": false}, {"id": "C", "text": "Cut to the front quickly", "is_correct": false}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Quiet voices are common on trains.

What is a good train behavior?', '[{"id": "A", "text": "Shout across the car", "is_correct": false}, {"id": "B", "text": "Play videos out loud", "is_correct": false}, {"id": "C", "text": "Talk softly", "is_correct": true}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Phones are often on silent in public.

What might you do with your phone on a train?', '[{"id": "A", "text": "Turn the volume up", "is_correct": false}, {"id": "B", "text": "Put it on silent", "is_correct": true}, {"id": "C", "text": "Play a game with sound", "is_correct": false}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Itadakimasu (Ee-tah-dah-KEE-mahs) is said before eating.

When do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id": "A", "text": "Before sleeping", "is_correct": false}, {"id": "B", "text": "Before eating", "is_correct": true}, {"id": "C", "text": "After eating", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gochisousama (Go-chee-SOH-sah-mah) is said after eating.

When do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id": "A", "text": "Before eating", "is_correct": false}, {"id": "B", "text": "After eating", "is_correct": true}, {"id": "C", "text": "When meeting a friend", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Arigatou (Ah-REE-gah-toh) means thank you.

What does Arigatou (Ah-REE-gah-toh) mean?', '[{"id": "A", "text": "Excuse me", "is_correct": false}, {"id": "B", "text": "Thank you", "is_correct": true}, {"id": "C", "text": "Good morning", "is_correct": false}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Sumimasen (Sue-mee-MAH-sen) can mean excuse me.

Why might someone say Sumimasen (Sue-mee-MAH-sen)?', '[{"id": "A", "text": "To say good night", "is_correct": false}, {"id": "B", "text": "To get attention politely", "is_correct": true}, {"id": "C", "text": "To say you are full", "is_correct": false}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Onegaishimasu (Oh-neh-gai-shee-MAH-s) is used when asking politely.

When might you say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id": "A", "text": "When saying goodbye", "is_correct": false}, {"id": "B", "text": "When making a polite request", "is_correct": true}, {"id": "C", "text": "When telling a joke", "is_correct": false}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gomen nasai (Go-men nah-SAI) is an apology.

When might you say Gomen nasai (Go-men nah-SAI)?', '[{"id": "A", "text": "After winning a game", "is_correct": false}, {"id": "B", "text": "After opening a present", "is_correct": false}, {"id": "C", "text": "After bumping into someone", "is_correct": true}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Chopsticks have special manners.

What is a good chopsticks choice?', '[{"id": "A", "text": "Set them down neatly when done", "is_correct": true}, {"id": "B", "text": "Point them at people", "is_correct": false}, {"id": "C", "text": "Stick them upright in rice", "is_correct": false}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Passing items with two hands can be polite.

Why use two hands to give something?', '[{"id": "A", "text": "To make it heavier", "is_correct": false}, {"id": "B", "text": "To show respect", "is_correct": true}, {"id": "C", "text": "To show you are fast", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Trash cans can be rare in public.

What might you do with trash if there is no bin?', '[{"id": "A", "text": "Hide it under a seat", "is_correct": false}, {"id": "B", "text": "Keep it until you find a bin", "is_correct": true}, {"id": "C", "text": "Drop it on the ground", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Recycling and sorting are common.

Why might there be different trash bins?', '[{"id": "A", "text": "For hiding snacks", "is_correct": false}, {"id": "B", "text": "For storing shoes", "is_correct": false}, {"id": "C", "text": "For sorting different kinds of trash", "is_correct": true}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Being on time matters.

What is a good habit for meetings?', '[{"id": "A", "text": "Skip without telling", "is_correct": false}, {"id": "B", "text": "Arrive very late", "is_correct": false}, {"id": "C", "text": "Arrive on time", "is_correct": true}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Personal space is respected.

What is a polite choice in a crowded place?', '[{"id": "A", "text": "Run and weave", "is_correct": false}, {"id": "B", "text": "Push through people", "is_correct": false}, {"id": "C", "text": "Avoid bumping into others", "is_correct": true}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'At shrines, people may rinse hands.

Why rinse hands at a shrine?', '[{"id": "A", "text": "To be respectful", "is_correct": true}, {"id": "B", "text": "To cool candy", "is_correct": false}, {"id": "C", "text": "To wash toys", "is_correct": false}]'::jsonb, 21);


    -- Tourist Lesson 5 (Questions 81-100)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 5', 'Japanese Manners & Customs 5', 10 + 5, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 5', 'Japanese Etiquette 5', 10 + 5) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 5! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'At some shrines, you bow before entering.

When might you bow at a shrine?', '[{"id": "A", "text": "Before going in", "is_correct": true}, {"id": "B", "text": "While eating noodles", "is_correct": false}, {"id": "C", "text": "While tying shoes", "is_correct": false}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Konnichiwa (Kon-NEE-chee-wah) is a daytime greeting.

What does Konnichiwa (Kon-NEE-chee-wah) mean?', '[{"id": "A", "text": "Good night", "is_correct": false}, {"id": "B", "text": "Hello / Good day", "is_correct": true}, {"id": "C", "text": "Goodbye", "is_correct": false}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Ohayou (Oh-HAH-yoh) is a morning greeting.

When do people often say Ohayou (Oh-HAH-yoh)?', '[{"id": "A", "text": "At midnight", "is_correct": false}, {"id": "B", "text": "In the morning", "is_correct": true}, {"id": "C", "text": "After dinner", "is_correct": false}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Konbanwa (Kon-bahn-wah) is an evening greeting.

What does Konbanwa (Kon-bahn-wah) mean?', '[{"id": "A", "text": "Good morning", "is_correct": false}, {"id": "B", "text": "Nice to meet you", "is_correct": false}, {"id": "C", "text": "Good evening", "is_correct": true}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Sayonara (Sah-yoh-NAH-rah) can mean goodbye.

When might you say Sayonara (Sah-yoh-NAH-rah)?', '[{"id": "A", "text": "When waking up", "is_correct": false}, {"id": "B", "text": "When leaving", "is_correct": true}, {"id": "C", "text": "When eating", "is_correct": false}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Inside voices are valued at temples and trains.

Where should you use a quiet voice?', '[{"id": "A", "text": "On a playground", "is_correct": false}, {"id": "B", "text": "On trains and at temples", "is_correct": true}, {"id": "C", "text": "At a loud concert", "is_correct": false}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People often wait for the walk signal.

What is a common street rule?', '[{"id": "A", "text": "Run across any time", "is_correct": false}, {"id": "B", "text": "Cross while texting", "is_correct": false}, {"id": "C", "text": "Wait for the signal to cross", "is_correct": true}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Escalators often have a standing side.

What should you do on an escalator in a busy station?', '[{"id": "A", "text": "Walk backwards", "is_correct": false}, {"id": "B", "text": "Sit on the steps", "is_correct": false}, {"id": "C", "text": "Stand to one side if people pass", "is_correct": true}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Many people carry a small towel/handkerchief.

Why might someone carry a small towel?', '[{"id": "A", "text": "To dry hands", "is_correct": true}, {"id": "B", "text": "To cover a sandwich", "is_correct": false}, {"id": "C", "text": "To play tug-of-war", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'School kids often clean their classroom.

Why might students help clean at school?', '[{"id": "A", "text": "To earn candy", "is_correct": false}, {"id": "B", "text": "To avoid homework forever", "is_correct": false}, {"id": "C", "text": "To take care of shared spaces", "is_correct": true}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Shoes are often removed in some traditional rooms.

Which place might ask you to remove shoes?', '[{"id": "A", "text": "A swimming pool", "is_correct": false}, {"id": "B", "text": "A bus stop", "is_correct": false}, {"id": "C", "text": "A tatami room", "is_correct": true}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Tatami mats are woven floor mats.

What is tatami?', '[{"id": "A", "text": "A kind of floor mat", "is_correct": true}, {"id": "B", "text": "A kind of phone", "is_correct": false}, {"id": "C", "text": "A kind of car", "is_correct": false}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Bento is a packed lunch box.

What is a bento?', '[{"id": "A", "text": "A video game", "is_correct": false}, {"id": "B", "text": "A lunch box with food", "is_correct": true}, {"id": "C", "text": "A type of shoe", "is_correct": false}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Onigiri are rice balls.

What are onigiri?', '[{"id": "A", "text": "Cold soup", "is_correct": false}, {"id": "B", "text": "Sweet donuts", "is_correct": false}, {"id": "C", "text": "Rice balls", "is_correct": true}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Miso soup is common.

What is miso soup usually made from?', '[{"id": "A", "text": "Soda", "is_correct": false}, {"id": "B", "text": "Chocolate", "is_correct": false}, {"id": "C", "text": "Miso paste", "is_correct": true}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Green tea is popular.

What is a common drink in Japan?', '[{"id": "A", "text": "Milkshakes only", "is_correct": false}, {"id": "B", "text": "Green tea", "is_correct": true}, {"id": "C", "text": "Hot chocolate only", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Cherry blossoms are called sakura.

What does sakura mean?', '[{"id": "A", "text": "Snowman", "is_correct": false}, {"id": "B", "text": "Cherry blossoms", "is_correct": true}, {"id": "C", "text": "Thunder", "is_correct": false}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Hanami is viewing cherry blossoms.

What is hanami?', '[{"id": "A", "text": "Watching fireworks only", "is_correct": false}, {"id": "B", "text": "Building a sandcastle", "is_correct": false}, {"id": "C", "text": "Looking at cherry blossoms", "is_correct": true}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'A shrine (jinja) is different from a temple (tera).

Which place is often for Shinto?', '[{"id": "A", "text": "Shrine", "is_correct": true}, {"id": "B", "text": "Library", "is_correct": false}, {"id": "C", "text": "Temple", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Many people take a bath at night.

When might families take a bath?', '[{"id": "A", "text": "Only at noon", "is_correct": false}, {"id": "B", "text": "Only outside", "is_correct": false}, {"id": "C", "text": "In the evening", "is_correct": true}]'::jsonb, 21);


    -- Tourist Lesson 6 (Questions 101-120)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 6', 'Japanese Manners & Customs 6', 10 + 6, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 6', 'Japanese Etiquette 6', 10 + 6) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 6! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Bathing often means washing first, then soaking.

What is a common bath order?', '[{"id": "A", "text": "Soak first, then wash", "is_correct": false}, {"id": "B", "text": "Wash first, then soak", "is_correct": true}, {"id": "C", "text": "Wear shoes in the tub", "is_correct": false}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some toilets have many buttons.

What is a good rule in a new bathroom?', '[{"id": "A", "text": "Press every button fast", "is_correct": false}, {"id": "B", "text": "Ignore instructions", "is_correct": true}, {"id": "C", "text": "Ask or look at signs", "is_correct": false}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gift wrapping is often careful and neat.

Why is gift wrapping often neat?', '[{"id": "A", "text": "It shows care", "is_correct": true}, {"id": "B", "text": "It makes gifts louder", "is_correct": false}, {"id": "C", "text": "It makes gifts heavier", "is_correct": false}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People may refuse a gift once or twice politely.

What might happen when you offer a gift?', '[{"id": "A", "text": "They will throw it away", "is_correct": false}, {"id": "B", "text": "They may say no at first to be polite", "is_correct": true}, {"id": "C", "text": "They will always take it instantly", "is_correct": false}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Indoor shoes vs outdoor shoes are different.

Where should outdoor shoes usually stay?', '[{"id": "A", "text": "On the bed", "is_correct": false}, {"id": "B", "text": "On the dining table", "is_correct": false}, {"id": "C", "text": "Near the entrance", "is_correct": true}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some restaurants use a ticket machine to order.

How might you order at some noodle shops?', '[{"id": "A", "text": "Buy a ticket first", "is_correct": true}, {"id": "B", "text": "Leave money on the floor", "is_correct": false}, {"id": "C", "text": "Yell your order loudly", "is_correct": false}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'You may hear ‘Irasshaimase’ in shops.

What does Irasshaimase often mean?', '[{"id": "A", "text": "Goodbye", "is_correct": false}, {"id": "B", "text": "Welcome", "is_correct": true}, {"id": "C", "text": "Hurry up", "is_correct": false}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People avoid eating while walking in some places.

What is often a better choice with snacks?', '[{"id": "A", "text": "Eat while running", "is_correct": false}, {"id": "B", "text": "Stop and eat, then walk", "is_correct": true}, {"id": "C", "text": "Throw food on the street", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Seasonal foods are enjoyed.

Why do people talk about seasonal foods?', '[{"id": "A", "text": "They change with the seasons", "is_correct": true}, {"id": "B", "text": "They are all candy", "is_correct": false}, {"id": "C", "text": "They never change", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'New Year is an important holiday.

What do many families do for New Year?', '[{"id": "A", "text": "Only play soccer", "is_correct": false}, {"id": "B", "text": "Ignore the day", "is_correct": false}, {"id": "C", "text": "Visit family and shrines", "is_correct": true}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Respect for elders is important.

How can you show respect to older people?', '[{"id": "A", "text": "Make fun of them", "is_correct": false}, {"id": "B", "text": "Interrupt a lot", "is_correct": false}, {"id": "C", "text": "Use polite words and listen", "is_correct": true}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Taking turns is valued in groups.

What is a good group habit?', '[{"id": "A", "text": "Shout over others", "is_correct": false}, {"id": "B", "text": "Grab things first", "is_correct": false}, {"id": "C", "text": "Wait your turn", "is_correct": true}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Kawaii means cute.

What does kawaii mean?', '[{"id": "A", "text": "Angry", "is_correct": false}, {"id": "B", "text": "Cute", "is_correct": true}, {"id": "C", "text": "Fast", "is_correct": false}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Anime is Japanese animation.

What is anime?', '[{"id": "A", "text": "Japanese cartoons/animation", "is_correct": true}, {"id": "B", "text": "A kind of sandwich", "is_correct": false}, {"id": "C", "text": "A train ticket", "is_correct": false}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Manga are Japanese comics.

What is manga?', '[{"id": "A", "text": "A fruit", "is_correct": false}, {"id": "B", "text": "Japanese comics", "is_correct": true}, {"id": "C", "text": "A sport", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Ryokan are traditional inns.

What is a ryokan?', '[{"id": "A", "text": "A spaceship", "is_correct": false}, {"id": "B", "text": "A traditional inn", "is_correct": true}, {"id": "C", "text": "A fast food", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Futons may be used for sleeping.

What is a futon?', '[{"id": "A", "text": "A bicycle", "is_correct": false}, {"id": "B", "text": "A soup bowl", "is_correct": false}, {"id": "C", "text": "A bed you can fold/roll", "is_correct": true}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Vending machines are common.

Where might you see vending machines?', '[{"id": "A", "text": "Only in forests", "is_correct": false}, {"id": "B", "text": "Many streets and stations", "is_correct": true}, {"id": "C", "text": "Only underwater", "is_correct": false}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Convenience stores are called konbini.

What is a konbini?', '[{"id": "A", "text": "A convenience store", "is_correct": true}, {"id": "B", "text": "A school bus", "is_correct": false}, {"id": "C", "text": "A museum", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Taking a small gift when visiting is common.

What might you bring when visiting someone?', '[{"id": "A", "text": "A small snack or gift", "is_correct": true}, {"id": "B", "text": "A loud horn", "is_correct": false}, {"id": "C", "text": "A pile of trash", "is_correct": false}]'::jsonb, 21);


    -- Tourist Lesson 7 (Questions 121-140)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 7', 'Japanese Manners & Customs 7', 10 + 7, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 7', 'Japanese Etiquette 7', 10 + 7) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 7! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Take off shoes in many homes.

What is a common first step when entering a home?', '[{"id": "A", "text": "Take off your shoes and place them neatly", "is_correct": true}, {"id": "B", "text": "Put your shoes on the couch", "is_correct": false}, {"id": "C", "text": "Keep your shoes on in the living room", "is_correct": false}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Slippers are often used indoors.

Why might a home have slippers for guests?', '[{"id": "A", "text": "To wear outside on the street", "is_correct": false}, {"id": "B", "text": "To wear inside instead of shoes", "is_correct": true}, {"id": "C", "text": "To use as toys", "is_correct": false}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some homes have bathroom-only slippers.

What is special about bathroom slippers?', '[{"id": "A", "text": "They are for running outside", "is_correct": false}, {"id": "B", "text": "They are only for the bathroom area", "is_correct": true}, {"id": "C", "text": "They are for sleeping", "is_correct": false}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People often bow to greet.

What can a small bow show?', '[{"id": "A", "text": "That you are bored", "is_correct": false}, {"id": "B", "text": "Respect", "is_correct": true}, {"id": "C", "text": "That you want to race", "is_correct": false}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Lines are common at trains and stores.

What should you do when others are waiting?', '[{"id": "A", "text": "Push past people", "is_correct": false}, {"id": "B", "text": "Stand in line and wait", "is_correct": true}, {"id": "C", "text": "Cut to the front quickly", "is_correct": false}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Quiet voices are common on trains.

What is a good train behavior?', '[{"id": "A", "text": "Shout across the car", "is_correct": false}, {"id": "B", "text": "Talk softly", "is_correct": true}, {"id": "C", "text": "Play videos out loud", "is_correct": false}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Phones are often on silent in public.

What might you do with your phone on a train?', '[{"id": "A", "text": "Turn the volume up", "is_correct": false}, {"id": "B", "text": "Play a game with sound", "is_correct": false}, {"id": "C", "text": "Put it on silent", "is_correct": true}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Itadakimasu (Ee-tah-dah-KEE-mahs) is said before eating.

When do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id": "A", "text": "Before eating", "is_correct": true}, {"id": "B", "text": "Before sleeping", "is_correct": false}, {"id": "C", "text": "After eating", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gochisousama (Go-chee-SOH-sah-mah) is said after eating.

When do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id": "A", "text": "When meeting a friend", "is_correct": false}, {"id": "B", "text": "After eating", "is_correct": true}, {"id": "C", "text": "Before eating", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Arigatou (Ah-REE-gah-toh) means thank you.

What does Arigatou (Ah-REE-gah-toh) mean?', '[{"id": "A", "text": "Thank you", "is_correct": true}, {"id": "B", "text": "Excuse me", "is_correct": false}, {"id": "C", "text": "Good morning", "is_correct": false}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Sumimasen (Sue-mee-MAH-sen) can mean excuse me.

Why might someone say Sumimasen (Sue-mee-MAH-sen)?', '[{"id": "A", "text": "To say good night", "is_correct": false}, {"id": "B", "text": "To say you are full", "is_correct": false}, {"id": "C", "text": "To get attention politely", "is_correct": true}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Onegaishimasu (Oh-neh-gai-shee-MAH-s) is used when asking politely.

When might you say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id": "A", "text": "When saying goodbye", "is_correct": false}, {"id": "B", "text": "When making a polite request", "is_correct": true}, {"id": "C", "text": "When telling a joke", "is_correct": false}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gomen nasai (Go-men nah-SAI) is an apology.

When might you say Gomen nasai (Go-men nah-SAI)?', '[{"id": "A", "text": "After bumping into someone", "is_correct": true}, {"id": "B", "text": "After opening a present", "is_correct": false}, {"id": "C", "text": "After winning a game", "is_correct": false}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Chopsticks have special manners.

What is a good chopsticks choice?', '[{"id": "A", "text": "Stick them upright in rice", "is_correct": false}, {"id": "B", "text": "Set them down neatly when done", "is_correct": true}, {"id": "C", "text": "Point them at people", "is_correct": false}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Passing items with two hands can be polite.

Why use two hands to give something?', '[{"id": "A", "text": "To show respect", "is_correct": true}, {"id": "B", "text": "To make it heavier", "is_correct": false}, {"id": "C", "text": "To show you are fast", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Trash cans can be rare in public.

What might you do with trash if there is no bin?', '[{"id": "A", "text": "Keep it until you find a bin", "is_correct": true}, {"id": "B", "text": "Drop it on the ground", "is_correct": false}, {"id": "C", "text": "Hide it under a seat", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Recycling and sorting are common.

Why might there be different trash bins?', '[{"id": "A", "text": "For storing shoes", "is_correct": false}, {"id": "B", "text": "For hiding snacks", "is_correct": false}, {"id": "C", "text": "For sorting different kinds of trash", "is_correct": true}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Being on time matters.

What is a good habit for meetings?', '[{"id": "A", "text": "Arrive very late", "is_correct": false}, {"id": "B", "text": "Skip without telling", "is_correct": false}, {"id": "C", "text": "Arrive on time", "is_correct": true}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Personal space is respected.

What is a polite choice in a crowded place?', '[{"id": "A", "text": "Run and weave", "is_correct": false}, {"id": "B", "text": "Avoid bumping into others", "is_correct": true}, {"id": "C", "text": "Push through people", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'At shrines, people may rinse hands.

Why rinse hands at a shrine?', '[{"id": "A", "text": "To be respectful", "is_correct": true}, {"id": "B", "text": "To wash toys", "is_correct": false}, {"id": "C", "text": "To cool candy", "is_correct": false}]'::jsonb, 21);


    -- Tourist Lesson 8 (Questions 141-160)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 8', 'Japanese Manners & Customs 8', 10 + 8, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 8', 'Japanese Etiquette 8', 10 + 8) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 8! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'At some shrines, you bow before entering.

When might you bow at a shrine?', '[{"id": "A", "text": "While eating noodles", "is_correct": false}, {"id": "B", "text": "While tying shoes", "is_correct": false}, {"id": "C", "text": "Before going in", "is_correct": true}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Konnichiwa (Kon-NEE-chee-wah) is a daytime greeting.

What does Konnichiwa (Kon-NEE-chee-wah) mean?', '[{"id": "A", "text": "Good night", "is_correct": false}, {"id": "B", "text": "Goodbye", "is_correct": false}, {"id": "C", "text": "Hello / Good day", "is_correct": true}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Ohayou (Oh-HAH-yoh) is a morning greeting.

When do people often say Ohayou (Oh-HAH-yoh)?', '[{"id": "A", "text": "After dinner", "is_correct": false}, {"id": "B", "text": "In the morning", "is_correct": true}, {"id": "C", "text": "At midnight", "is_correct": false}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Konbanwa (Kon-bahn-wah) is an evening greeting.

What does Konbanwa (Kon-bahn-wah) mean?', '[{"id": "A", "text": "Good morning", "is_correct": false}, {"id": "B", "text": "Good evening", "is_correct": true}, {"id": "C", "text": "Nice to meet you", "is_correct": false}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Sayonara (Sah-yoh-NAH-rah) can mean goodbye.

When might you say Sayonara (Sah-yoh-NAH-rah)?', '[{"id": "A", "text": "When waking up", "is_correct": false}, {"id": "B", "text": "When leaving", "is_correct": true}, {"id": "C", "text": "When eating", "is_correct": false}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Inside voices are valued at temples and trains.

Where should you use a quiet voice?', '[{"id": "A", "text": "On a playground", "is_correct": false}, {"id": "B", "text": "At a loud concert", "is_correct": false}, {"id": "C", "text": "On trains and at temples", "is_correct": true}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People often wait for the walk signal.

What is a common street rule?', '[{"id": "A", "text": "Wait for the signal to cross", "is_correct": true}, {"id": "B", "text": "Cross while texting", "is_correct": false}, {"id": "C", "text": "Run across any time", "is_correct": false}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Escalators often have a standing side.

What should you do on an escalator in a busy station?', '[{"id": "A", "text": "Walk backwards", "is_correct": false}, {"id": "B", "text": "Sit on the steps", "is_correct": false}, {"id": "C", "text": "Stand to one side if people pass", "is_correct": true}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Many people carry a small towel/handkerchief.

Why might someone carry a small towel?', '[{"id": "A", "text": "To dry hands", "is_correct": true}, {"id": "B", "text": "To cover a sandwich", "is_correct": false}, {"id": "C", "text": "To play tug-of-war", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'School kids often clean their classroom.

Why might students help clean at school?', '[{"id": "A", "text": "To take care of shared spaces", "is_correct": true}, {"id": "B", "text": "To earn candy", "is_correct": false}, {"id": "C", "text": "To avoid homework forever", "is_correct": false}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Shoes are often removed in some traditional rooms.

Which place might ask you to remove shoes?', '[{"id": "A", "text": "A tatami room", "is_correct": true}, {"id": "B", "text": "A swimming pool", "is_correct": false}, {"id": "C", "text": "A bus stop", "is_correct": false}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Tatami mats are woven floor mats.

What is tatami?', '[{"id": "A", "text": "A kind of phone", "is_correct": false}, {"id": "B", "text": "A kind of floor mat", "is_correct": true}, {"id": "C", "text": "A kind of car", "is_correct": false}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Bento is a packed lunch box.

What is a bento?', '[{"id": "A", "text": "A type of shoe", "is_correct": false}, {"id": "B", "text": "A video game", "is_correct": false}, {"id": "C", "text": "A lunch box with food", "is_correct": true}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Onigiri are rice balls.

What are onigiri?', '[{"id": "A", "text": "Sweet donuts", "is_correct": false}, {"id": "B", "text": "Rice balls", "is_correct": true}, {"id": "C", "text": "Cold soup", "is_correct": false}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Miso soup is common.

What is miso soup usually made from?', '[{"id": "A", "text": "Miso paste", "is_correct": true}, {"id": "B", "text": "Chocolate", "is_correct": false}, {"id": "C", "text": "Soda", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Green tea is popular.

What is a common drink in Japan?', '[{"id": "A", "text": "Green tea", "is_correct": true}, {"id": "B", "text": "Hot chocolate only", "is_correct": false}, {"id": "C", "text": "Milkshakes only", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Cherry blossoms are called sakura.

What does sakura mean?', '[{"id": "A", "text": "Thunder", "is_correct": false}, {"id": "B", "text": "Cherry blossoms", "is_correct": true}, {"id": "C", "text": "Snowman", "is_correct": false}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Hanami is viewing cherry blossoms.

What is hanami?', '[{"id": "A", "text": "Building a sandcastle", "is_correct": false}, {"id": "B", "text": "Looking at cherry blossoms", "is_correct": true}, {"id": "C", "text": "Watching fireworks only", "is_correct": false}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'A shrine (jinja) is different from a temple (tera).

Which place is often for Shinto?', '[{"id": "A", "text": "Shrine", "is_correct": true}, {"id": "B", "text": "Library", "is_correct": false}, {"id": "C", "text": "Temple", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Many people take a bath at night.

When might families take a bath?', '[{"id": "A", "text": "Only at noon", "is_correct": false}, {"id": "B", "text": "Only outside", "is_correct": false}, {"id": "C", "text": "In the evening", "is_correct": true}]'::jsonb, 21);


    -- Tourist Lesson 9 (Questions 161-180)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 9', 'Japanese Manners & Customs 9', 10 + 9, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 9', 'Japanese Etiquette 9', 10 + 9) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 9! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Bathing often means washing first, then soaking.

What is a common bath order?', '[{"id": "A", "text": "Wear shoes in the tub", "is_correct": false}, {"id": "B", "text": "Wash first, then soak", "is_correct": true}, {"id": "C", "text": "Soak first, then wash", "is_correct": false}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some toilets have many buttons.

What is a good rule in a new bathroom?', '[{"id": "A", "text": "Press every button fast", "is_correct": false}, {"id": "B", "text": "Ignore instructions", "is_correct": false}, {"id": "C", "text": "Ask or look at signs", "is_correct": true}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gift wrapping is often careful and neat.

Why is gift wrapping often neat?', '[{"id": "A", "text": "It makes gifts louder", "is_correct": false}, {"id": "B", "text": "It shows care", "is_correct": true}, {"id": "C", "text": "It makes gifts heavier", "is_correct": false}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People may refuse a gift once or twice politely.

What might happen when you offer a gift?', '[{"id": "A", "text": "They will throw it away", "is_correct": false}, {"id": "B", "text": "They may say no at first to be polite", "is_correct": true}, {"id": "C", "text": "They will always take it instantly", "is_correct": false}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Indoor shoes vs outdoor shoes are different.

Where should outdoor shoes usually stay?', '[{"id": "A", "text": "Near the entrance", "is_correct": true}, {"id": "B", "text": "On the bed", "is_correct": false}, {"id": "C", "text": "On the dining table", "is_correct": false}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some restaurants use a ticket machine to order.

How might you order at some noodle shops?', '[{"id": "A", "text": "Yell your order loudly", "is_correct": false}, {"id": "B", "text": "Leave money on the floor", "is_correct": false}, {"id": "C", "text": "Buy a ticket first", "is_correct": true}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'You may hear ‘Irasshaimase’ in shops.

What does Irasshaimase often mean?', '[{"id": "A", "text": "Hurry up", "is_correct": false}, {"id": "B", "text": "Goodbye", "is_correct": false}, {"id": "C", "text": "Welcome", "is_correct": true}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People avoid eating while walking in some places.

What is often a better choice with snacks?', '[{"id": "A", "text": "Throw food on the street", "is_correct": false}, {"id": "B", "text": "Stop and eat, then walk", "is_correct": true}, {"id": "C", "text": "Eat while running", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Seasonal foods are enjoyed.

Why do people talk about seasonal foods?', '[{"id": "A", "text": "They never change", "is_correct": false}, {"id": "B", "text": "They change with the seasons", "is_correct": true}, {"id": "C", "text": "They are all candy", "is_correct": false}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'New Year is an important holiday.

What do many families do for New Year?', '[{"id": "A", "text": "Only play soccer", "is_correct": false}, {"id": "B", "text": "Visit family and shrines", "is_correct": true}, {"id": "C", "text": "Ignore the day", "is_correct": false}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Respect for elders is important.

How can you show respect to older people?', '[{"id": "A", "text": "Interrupt a lot", "is_correct": false}, {"id": "B", "text": "Make fun of them", "is_correct": false}, {"id": "C", "text": "Use polite words and listen", "is_correct": true}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Taking turns is valued in groups.

What is a good group habit?', '[{"id": "A", "text": "Wait your turn", "is_correct": true}, {"id": "B", "text": "Shout over others", "is_correct": false}, {"id": "C", "text": "Grab things first", "is_correct": false}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Kawaii means cute.

What does kawaii mean?', '[{"id": "A", "text": "Angry", "is_correct": false}, {"id": "B", "text": "Cute", "is_correct": true}, {"id": "C", "text": "Fast", "is_correct": false}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Anime is Japanese animation.

What is anime?', '[{"id": "A", "text": "A train ticket", "is_correct": false}, {"id": "B", "text": "Japanese cartoons/animation", "is_correct": true}, {"id": "C", "text": "A kind of sandwich", "is_correct": false}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Manga are Japanese comics.

What is manga?', '[{"id": "A", "text": "A fruit", "is_correct": false}, {"id": "B", "text": "A sport", "is_correct": false}, {"id": "C", "text": "Japanese comics", "is_correct": true}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Ryokan are traditional inns.

What is a ryokan?', '[{"id": "A", "text": "A traditional inn", "is_correct": true}, {"id": "B", "text": "A spaceship", "is_correct": false}, {"id": "C", "text": "A fast food", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Futons may be used for sleeping.

What is a futon?', '[{"id": "A", "text": "A soup bowl", "is_correct": false}, {"id": "B", "text": "A bicycle", "is_correct": false}, {"id": "C", "text": "A bed you can fold/roll", "is_correct": true}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Vending machines are common.

Where might you see vending machines?', '[{"id": "A", "text": "Only underwater", "is_correct": false}, {"id": "B", "text": "Many streets and stations", "is_correct": true}, {"id": "C", "text": "Only in forests", "is_correct": false}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Convenience stores are called konbini.

What is a konbini?', '[{"id": "A", "text": "A museum", "is_correct": false}, {"id": "B", "text": "A convenience store", "is_correct": true}, {"id": "C", "text": "A school bus", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Taking a small gift when visiting is common.

What might you bring when visiting someone?', '[{"id": "A", "text": "A small snack or gift", "is_correct": true}, {"id": "B", "text": "A pile of trash", "is_correct": false}, {"id": "C", "text": "A loud horn", "is_correct": false}]'::jsonb, 21);


    -- Tourist Lesson 10 (Questions 181-200)
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 10', 'Japanese Manners & Customs 10', 10 + 10, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 10', 'Japanese Etiquette 10', 10 + 10) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 10! Master these scenarios.', null, 1);
    
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Take off shoes in many homes.

What is a common first step when entering a home?', '[{"id": "A", "text": "Take off your shoes and place them neatly", "is_correct": true}, {"id": "B", "text": "Put your shoes on the couch", "is_correct": false}, {"id": "C", "text": "Keep your shoes on in the living room", "is_correct": false}]'::jsonb, 2);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Slippers are often used indoors.

Why might a home have slippers for guests?', '[{"id": "A", "text": "To wear outside on the street", "is_correct": false}, {"id": "B", "text": "To wear inside instead of shoes", "is_correct": true}, {"id": "C", "text": "To use as toys", "is_correct": false}]'::jsonb, 3);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Some homes have bathroom-only slippers.

What is special about bathroom slippers?', '[{"id": "A", "text": "They are for running outside", "is_correct": false}, {"id": "B", "text": "They are for sleeping", "is_correct": false}, {"id": "C", "text": "They are only for the bathroom area", "is_correct": true}]'::jsonb, 4);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'People often bow to greet.

What can a small bow show?', '[{"id": "A", "text": "That you are bored", "is_correct": false}, {"id": "B", "text": "That you want to race", "is_correct": false}, {"id": "C", "text": "Respect", "is_correct": true}]'::jsonb, 5);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Lines are common at trains and stores.

What should you do when others are waiting?', '[{"id": "A", "text": "Push past people", "is_correct": false}, {"id": "B", "text": "Stand in line and wait", "is_correct": true}, {"id": "C", "text": "Cut to the front quickly", "is_correct": false}]'::jsonb, 6);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Quiet voices are common on trains.

What is a good train behavior?', '[{"id": "A", "text": "Talk softly", "is_correct": true}, {"id": "B", "text": "Shout across the car", "is_correct": false}, {"id": "C", "text": "Play videos out loud", "is_correct": false}]'::jsonb, 7);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Phones are often on silent in public.

What might you do with your phone on a train?', '[{"id": "A", "text": "Play a game with sound", "is_correct": false}, {"id": "B", "text": "Put it on silent", "is_correct": true}, {"id": "C", "text": "Turn the volume up", "is_correct": false}]'::jsonb, 8);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Itadakimasu (Ee-tah-dah-KEE-mahs) is said before eating.

When do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id": "A", "text": "Before sleeping", "is_correct": false}, {"id": "B", "text": "Before eating", "is_correct": true}, {"id": "C", "text": "After eating", "is_correct": false}]'::jsonb, 9);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gochisousama (Go-chee-SOH-sah-mah) is said after eating.

When do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id": "A", "text": "When meeting a friend", "is_correct": false}, {"id": "B", "text": "Before eating", "is_correct": false}, {"id": "C", "text": "After eating", "is_correct": true}]'::jsonb, 10);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Arigatou (Ah-REE-gah-toh) means thank you.

What does Arigatou (Ah-REE-gah-toh) mean?', '[{"id": "A", "text": "Thank you", "is_correct": true}, {"id": "B", "text": "Excuse me", "is_correct": false}, {"id": "C", "text": "Good morning", "is_correct": false}]'::jsonb, 11);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Sumimasen (Sue-mee-MAH-sen) can mean excuse me.

Why might someone say Sumimasen (Sue-mee-MAH-sen)?', '[{"id": "A", "text": "To get attention politely", "is_correct": true}, {"id": "B", "text": "To say you are full", "is_correct": false}, {"id": "C", "text": "To say good night", "is_correct": false}]'::jsonb, 12);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Onegaishimasu (Oh-neh-gai-shee-MAH-s) is used when asking politely.

When might you say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id": "A", "text": "When saying goodbye", "is_correct": false}, {"id": "B", "text": "When telling a joke", "is_correct": false}, {"id": "C", "text": "When making a polite request", "is_correct": true}]'::jsonb, 13);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Gomen nasai (Go-men nah-SAI) is an apology.

When might you say Gomen nasai (Go-men nah-SAI)?', '[{"id": "A", "text": "After opening a present", "is_correct": false}, {"id": "B", "text": "After winning a game", "is_correct": false}, {"id": "C", "text": "After bumping into someone", "is_correct": true}]'::jsonb, 14);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Chopsticks have special manners.

What is a good chopsticks choice?', '[{"id": "A", "text": "Point them at people", "is_correct": false}, {"id": "B", "text": "Stick them upright in rice", "is_correct": false}, {"id": "C", "text": "Set them down neatly when done", "is_correct": true}]'::jsonb, 15);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Passing items with two hands can be polite.

Why use two hands to give something?', '[{"id": "A", "text": "To show respect", "is_correct": true}, {"id": "B", "text": "To show you are fast", "is_correct": false}, {"id": "C", "text": "To make it heavier", "is_correct": false}]'::jsonb, 16);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Trash cans can be rare in public.

What might you do with trash if there is no bin?', '[{"id": "A", "text": "Drop it on the ground", "is_correct": false}, {"id": "B", "text": "Keep it until you find a bin", "is_correct": true}, {"id": "C", "text": "Hide it under a seat", "is_correct": false}]'::jsonb, 17);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Recycling and sorting are common.

Why might there be different trash bins?', '[{"id": "A", "text": "For storing shoes", "is_correct": false}, {"id": "B", "text": "For sorting different kinds of trash", "is_correct": true}, {"id": "C", "text": "For hiding snacks", "is_correct": false}]'::jsonb, 18);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Being on time matters.

What is a good habit for meetings?', '[{"id": "A", "text": "Arrive on time", "is_correct": true}, {"id": "B", "text": "Arrive very late", "is_correct": false}, {"id": "C", "text": "Skip without telling", "is_correct": false}]'::jsonb, 19);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'Personal space is respected.

What is a polite choice in a crowded place?', '[{"id": "A", "text": "Run and weave", "is_correct": false}, {"id": "B", "text": "Avoid bumping into others", "is_correct": true}, {"id": "C", "text": "Push through people", "is_correct": false}]'::jsonb, 20);
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'At shrines, people may rinse hands.

Why rinse hands at a shrine?', '[{"id": "A", "text": "To cool candy", "is_correct": false}, {"id": "B", "text": "To wash toys", "is_correct": false}, {"id": "C", "text": "To be respectful", "is_correct": true}]'::jsonb, 21);

END $$;