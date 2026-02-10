-- CULTURE CONTENT (User Provided)
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
    food_questions TEXT[];
    food_answers BOOLEAN[];
    transport_questions TEXT[];
    transport_answers BOOLEAN[];
    language_questions TEXT[];
    language_answers BOOLEAN[];
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;

    SELECT id INTO tourist_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Tourist Essentials';
    SELECT id INTO food_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Food & Dining';
    SELECT id INTO transport_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Transport';
    SELECT id INTO lang_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Language Basics';

    -- CLEANUP: Delete levels created by previous expansions (indices > 10)
    DELETE FROM public.levels WHERE branch_id = tourist_branch_id AND order_index > 10;
    
    DELETE FROM public.levels WHERE branch_id IN (food_branch_id, transport_branch_id, lang_branch_id) AND order_index > 10;

    -- RE-GENERATE TOURIST (20 Lessons, 30 Questions each from User List)

    -- Tourist Lesson 1
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 1', 'Learn manners and customs 1', 10 + 1, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 1', 'Japanese Etiquette 1', 10 + 1) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 1! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Wear his shoes inside","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear outside in the rain","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Excuse me","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Anger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘Happy birthday''","is_correct":false},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before eating","is_correct":false},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At night","is_correct":false},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"Hello","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Yell and clap loudly","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When telling a joke","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear outside in the rain","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":true},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Talk softly","is_correct":true},{"id":"B","text":"Run in the aisle","is_correct":false},{"id":"C","text":"Play music out loud","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 2
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 2', 'Learn manners and customs 2', 10 + 2, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 2', 'Japanese Etiquette 2', 10 + 2) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 2! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Play a loud game","is_correct":false},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Hunger","is_correct":false},{"id":"B","text":"Sleepiness","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Run far ahead alone","is_correct":false},{"id":"C","text":"Hide from adults","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When telling a joke","is_correct":false},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Take off his shoes by the door","is_correct":true},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear inside the house","is_correct":true},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before brushing teeth","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"The number two","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To be clean and respectful","is_correct":true},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"After eating","is_correct":true},{"id":"C","text":"Before eating","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At night","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To hide toys","is_correct":false},{"id":"B","text":"To make more noise","is_correct":false},{"id":"C","text":"To keep places clean","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 3
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 3', 'Learn manners and customs 3', 10 + 3, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 3', 'Japanese Etiquette 3', 10 + 3) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 3! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Take off his shoes by the door","is_correct":true},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear inside the house","is_correct":true},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Thank you","is_correct":true}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Run in the aisle","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To dry their shoes","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To get attention politely","is_correct":true},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To say ‘Happy birthday''","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Hello","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When saying goodbye","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Wear his shoes inside","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":true},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Thank you","is_correct":true}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To be clean and respectful","is_correct":true},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 4
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 4', 'Learn manners and customs 4', 10 + 4, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 4', 'Japanese Etiquette 4', 10 + 4) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 4! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"Before eating","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At a wedding","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"I''m sorry","is_correct":true},{"id":"B","text":"Hello","is_correct":false},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Yell and clap loudly","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Following the rules","is_correct":true}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Hide from adults","is_correct":false},{"id":"B","text":"Stay with your group","is_correct":true},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Take off his shoes by the door","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear outside in the rain","is_correct":false},{"id":"B","text":"To wear in the bath","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before eating","is_correct":true},{"id":"B","text":"Before sleeping","is_correct":false},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Talk softly","is_correct":true},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Eat a big meal now","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘Happy birthday''","is_correct":false},{"id":"B","text":"To get attention politely","is_correct":true},{"id":"C","text":"To say ‘I am sleepy''","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At night","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good morning","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Play a loud game","is_correct":false},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Hide from adults","is_correct":false},{"id":"B","text":"Stay with your group","is_correct":true},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When saying goodbye","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 5
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 5', 'Learn manners and customs 5', 10 + 5, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 5', 'Japanese Etiquette 5', 10 + 5) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 5! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before brushing teeth","is_correct":false},{"id":"B","text":"Before sleeping","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Play music out loud","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To dry their shoes","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To get attention politely","is_correct":true},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To say ‘Happy birthday''","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before eating","is_correct":false},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Hello","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Run far ahead alone","is_correct":false},{"id":"C","text":"Hide from adults","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Anger","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To cool off a phone","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 6
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 6', 'Learn manners and customs 6', 10 + 6, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 6', 'Japanese Etiquette 6', 10 + 6) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 6! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good evening","is_correct":true},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Play a loud game","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Anger","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Wait to eat later","is_correct":true},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To cool off a phone","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good morning","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Play a loud game","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Hunger","is_correct":false},{"id":"B","text":"Sleepiness","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 7
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 7', 'Learn manners and customs 7', 10 + 7, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 7', 'Japanese Etiquette 7', 10 + 7) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 7! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Wear his shoes inside","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear outside in the rain","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Excuse me","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Anger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘Happy birthday''","is_correct":false},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before eating","is_correct":false},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At night","is_correct":false},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"Hello","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Yell and clap loudly","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When telling a joke","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear outside in the rain","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":true},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Talk softly","is_correct":true},{"id":"B","text":"Run in the aisle","is_correct":false},{"id":"C","text":"Play music out loud","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 8
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 8', 'Learn manners and customs 8', 10 + 8, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 8', 'Japanese Etiquette 8', 10 + 8) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 8! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Play a loud game","is_correct":false},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Hunger","is_correct":false},{"id":"B","text":"Sleepiness","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Run far ahead alone","is_correct":false},{"id":"C","text":"Hide from adults","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When telling a joke","is_correct":false},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Take off his shoes by the door","is_correct":true},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear inside the house","is_correct":true},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before brushing teeth","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"The number two","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To be clean and respectful","is_correct":true},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"After eating","is_correct":true},{"id":"C","text":"Before eating","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At night","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To hide toys","is_correct":false},{"id":"B","text":"To make more noise","is_correct":false},{"id":"C","text":"To keep places clean","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 9
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 9', 'Learn manners and customs 9', 10 + 9, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 9', 'Japanese Etiquette 9', 10 + 9) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 9! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Take off his shoes by the door","is_correct":true},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear inside the house","is_correct":true},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Thank you","is_correct":true}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Run in the aisle","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To dry their shoes","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To get attention politely","is_correct":true},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To say ‘Happy birthday''","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Hello","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When saying goodbye","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Wear his shoes inside","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":true},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Thank you","is_correct":true}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To be clean and respectful","is_correct":true},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 10
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 10', 'Learn manners and customs 10', 10 + 10, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 10', 'Japanese Etiquette 10', 10 + 10) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 10! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"Before eating","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At a wedding","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"I''m sorry","is_correct":true},{"id":"B","text":"Hello","is_correct":false},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Yell and clap loudly","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Following the rules","is_correct":true}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Hide from adults","is_correct":false},{"id":"B","text":"Stay with your group","is_correct":true},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Take off his shoes by the door","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear outside in the rain","is_correct":false},{"id":"B","text":"To wear in the bath","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before eating","is_correct":true},{"id":"B","text":"Before sleeping","is_correct":false},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Talk softly","is_correct":true},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Eat a big meal now","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘Happy birthday''","is_correct":false},{"id":"B","text":"To get attention politely","is_correct":true},{"id":"C","text":"To say ‘I am sleepy''","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At night","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good morning","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Play a loud game","is_correct":false},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Hide from adults","is_correct":false},{"id":"B","text":"Stay with your group","is_correct":true},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When saying goodbye","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 11
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 11', 'Learn manners and customs 11', 10 + 11, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 11', 'Japanese Etiquette 11', 10 + 11) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 11! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before brushing teeth","is_correct":false},{"id":"B","text":"Before sleeping","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Play music out loud","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To dry their shoes","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To get attention politely","is_correct":true},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To say ‘Happy birthday''","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before eating","is_correct":false},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Hello","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Run far ahead alone","is_correct":false},{"id":"C","text":"Hide from adults","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Anger","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To cool off a phone","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 12
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 12', 'Learn manners and customs 12', 10 + 12, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 12', 'Japanese Etiquette 12', 10 + 12) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 12! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good evening","is_correct":true},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Play a loud game","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Anger","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Wait to eat later","is_correct":true},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To cool off a phone","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good morning","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Play a loud game","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Hunger","is_correct":false},{"id":"B","text":"Sleepiness","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 13
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 13', 'Learn manners and customs 13', 10 + 13, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 13', 'Japanese Etiquette 13', 10 + 13) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 13! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Wear his shoes inside","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear outside in the rain","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Excuse me","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Anger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘Happy birthday''","is_correct":false},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before eating","is_correct":false},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At night","is_correct":false},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"Hello","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Yell and clap loudly","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When telling a joke","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear outside in the rain","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":true},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Talk softly","is_correct":true},{"id":"B","text":"Run in the aisle","is_correct":false},{"id":"C","text":"Play music out loud","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 14
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 14', 'Learn manners and customs 14', 10 + 14, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 14', 'Japanese Etiquette 14', 10 + 14) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 14! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Play a loud game","is_correct":false},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Hunger","is_correct":false},{"id":"B","text":"Sleepiness","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Run far ahead alone","is_correct":false},{"id":"C","text":"Hide from adults","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When telling a joke","is_correct":false},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Take off his shoes by the door","is_correct":true},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear inside the house","is_correct":true},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before brushing teeth","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"The number two","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To be clean and respectful","is_correct":true},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"After eating","is_correct":true},{"id":"C","text":"Before eating","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At night","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To hide toys","is_correct":false},{"id":"B","text":"To make more noise","is_correct":false},{"id":"C","text":"To keep places clean","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 15
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 15', 'Learn manners and customs 15', 10 + 15, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 15', 'Japanese Etiquette 15', 10 + 15) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 15! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Take off his shoes by the door","is_correct":true},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear inside the house","is_correct":true},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Thank you","is_correct":true}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Run in the aisle","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To dry their shoes","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To get attention politely","is_correct":true},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To say ‘Happy birthday''","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Hello","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When saying goodbye","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Wear his shoes inside","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":true},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Thank you","is_correct":true}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To be clean and respectful","is_correct":true},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 16
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 16', 'Learn manners and customs 16', 10 + 16, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 16', 'Japanese Etiquette 16', 10 + 16) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 16! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"Before eating","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At a wedding","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"I''m sorry","is_correct":true},{"id":"B","text":"Hello","is_correct":false},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Yell and clap loudly","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Following the rules","is_correct":true}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Hide from adults","is_correct":false},{"id":"B","text":"Stay with your group","is_correct":true},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Take off his shoes by the door","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear outside in the rain","is_correct":false},{"id":"B","text":"To wear in the bath","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before eating","is_correct":true},{"id":"B","text":"Before sleeping","is_correct":false},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Talk softly","is_correct":true},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Eat a big meal now","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘Happy birthday''","is_correct":false},{"id":"B","text":"To get attention politely","is_correct":true},{"id":"C","text":"To say ‘I am sleepy''","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At night","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good morning","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Play a loud game","is_correct":false},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Hide from adults","is_correct":false},{"id":"B","text":"Stay with your group","is_correct":true},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When saying goodbye","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 17
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 17', 'Learn manners and customs 17', 10 + 17, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 17', 'Japanese Etiquette 17', 10 + 17) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 17! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before brushing teeth","is_correct":false},{"id":"B","text":"Before sleeping","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Play music out loud","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Respect","is_correct":true},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Wait your turn","is_correct":true},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To dry their shoes","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To get attention politely","is_correct":true},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To say ‘Happy birthday''","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before eating","is_correct":false},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Hello","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Run far ahead alone","is_correct":false},{"id":"C","text":"Hide from adults","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Anger","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Grab the mic","is_correct":false},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Drop crumbs on the floor","is_correct":false},{"id":"B","text":"Wait to eat later","is_correct":true},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To cool off a phone","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 18
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 18', 'Learn manners and customs 18', 10 + 18, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 18', 'Japanese Etiquette 18', 10 + 18) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 18! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good evening","is_correct":true},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Play a loud game","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear inside the house","is_correct":true}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Excuse me","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Run in the aisle","is_correct":false},{"id":"B","text":"Play music out loud","is_correct":false},{"id":"C","text":"Talk softly","is_correct":true}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Anger","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Shout answers","is_correct":false},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Wait your turn","is_correct":true}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Wait to eat later","is_correct":true},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Eat a big meal now","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To cool off a phone","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good morning","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"I''m sorry","is_correct":true},{"id":"C","text":"Thank you","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Play a loud game","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Hunger","is_correct":false},{"id":"B","text":"Sleepiness","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    -- Tourist Lesson 19
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 19', 'Learn manners and customs 19', 10 + 19, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 19', 'Japanese Etiquette 19', 10 + 19) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 19! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Put his shoes on the table","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Wear his shoes inside","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear in the bath","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear outside in the rain","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before brushing teeth","is_correct":false},{"id":"C","text":"Before eating","is_correct":true}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Excuse me","is_correct":false},{"id":"B","text":"Thank you","is_correct":true},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Boredom","is_correct":false},{"id":"B","text":"Anger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To cool off a phone","is_correct":false},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To be clean and respectful","is_correct":true}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘Happy birthday''","is_correct":false},{"id":"B","text":"To say ‘I am sleepy''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before eating","is_correct":false},{"id":"B","text":"Before a test","is_correct":false},{"id":"C","text":"After eating","is_correct":true}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At night","is_correct":false},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Good morning","is_correct":false},{"id":"B","text":"Goodbye","is_correct":false},{"id":"C","text":"Good evening","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Thank you","is_correct":false},{"id":"B","text":"Hello","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Use a quiet voice","is_correct":true},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Yell and clap loudly","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Sleepiness","is_correct":false},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Following the rules","is_correct":true},{"id":"B","text":"Playing tag","is_correct":false},{"id":"C","text":"Trying to race","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Run far ahead alone","is_correct":false},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Stay with your group","is_correct":true}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When telling a joke","is_correct":false},{"id":"B","text":"When asking politely","is_correct":true},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Wear his shoes inside","is_correct":false},{"id":"B","text":"Take off his shoes by the door","is_correct":true},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear outside in the rain","is_correct":false},{"id":"B","text":"To wear inside the house","is_correct":true},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":true},{"id":"C","text":"Before brushing teeth","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Talk softly","is_correct":true},{"id":"B","text":"Run in the aisle","is_correct":false},{"id":"C","text":"Play music out loud","is_correct":false}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Anger","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Grab the mic","is_correct":false},{"id":"C","text":"Shout answers","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To dry their shoes","is_correct":false},{"id":"B","text":"To be clean and respectful","is_correct":true},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 31);
    -- Tourist Lesson 20
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (tourist_branch_id, 'Culture Level 20', 'Learn manners and customs 20', 10 + 20, 1) RETURNING id INTO level_id;

    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Culture Lesson 20', 'Japanese Etiquette 20', 10 + 20) RETURNING id INTO lesson_id;

    -- Intro
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'info', 'Welcome to Culture Lesson 20! Master these 30 scenarios.', null, 1);
    
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"After eating","is_correct":true},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before a test","is_correct":false}]'::jsonb, 2);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"In the morning","is_correct":true},{"id":"B","text":"At a wedding","is_correct":false},{"id":"C","text":"At night","is_correct":false}]'::jsonb, 3);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 4);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 5);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Play a loud game","is_correct":false},{"id":"B","text":"Yell and clap loudly","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 6);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Hunger","is_correct":false},{"id":"B","text":"Sleepiness","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 7);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 8);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To make more noise","is_correct":false},{"id":"B","text":"To keep places clean","is_correct":true},{"id":"C","text":"To hide toys","is_correct":false}]'::jsonb, 9);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Run far ahead alone","is_correct":false},{"id":"C","text":"Hide from adults","is_correct":false}]'::jsonb, 10);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When telling a joke","is_correct":false},{"id":"C","text":"When saying goodbye","is_correct":false}]'::jsonb, 11);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Kai went into a house in Japan and saw shoes by the door.\n\nWhat should Kai do next?', '[{"id":"A","text":"Take off his shoes by the door","is_correct":true},{"id":"B","text":"Wear his shoes inside","is_correct":false},{"id":"C","text":"Put his shoes on the table","is_correct":false}]'::jsonb, 12);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Mia saw slippers in a basket near the entrance.\n\nWhy are slippers there?', '[{"id":"A","text":"To wear inside the house","is_correct":true},{"id":"B","text":"To wear outside in the rain","is_correct":false},{"id":"C","text":"To wear in the bath","is_correct":false}]'::jsonb, 13);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Before eating, Yuki''s family said Itadakimasu (Ee-tah-dah-KEE-mahs).\n\nWhen do people often say Itadakimasu (Ee-tah-dah-KEE-mahs)?', '[{"id":"A","text":"Before sleeping","is_correct":false},{"id":"B","text":"Before eating","is_correct":false},{"id":"C","text":"Before brushing teeth","is_correct":true}]'::jsonb, 14);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After dinner, Ben said Arigatou (Ah-REE-gah-toh).\n\nWhat does Arigatou (Ah-REE-gah-toh) mean?', '[{"id":"A","text":"Thank you","is_correct":true},{"id":"B","text":"Excuse me","is_correct":false},{"id":"C","text":"Goodbye","is_correct":false}]'::jsonb, 15);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a train, Hana noticed most people were quiet.\n\nWhat is a good choice on many trains in Japan?', '[{"id":"A","text":"Play music out loud","is_correct":false},{"id":"B","text":"Talk softly","is_correct":true},{"id":"C","text":"Run in the aisle","is_correct":false}]'::jsonb, 16);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a store, Sora handed money with two hands.\n\nWhat does using two hands often show?', '[{"id":"A","text":"The number two","is_correct":false},{"id":"B","text":"Boredom","is_correct":false},{"id":"C","text":"Respect","is_correct":true}]'::jsonb, 17);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In a classroom, Aki took turns speaking.\n\nWhat is a good group rule?', '[{"id":"A","text":"Wait your turn","is_correct":true},{"id":"B","text":"Shout answers","is_correct":false},{"id":"C","text":"Grab the mic","is_correct":false}]'::jsonb, 18);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Rin saw a sign that said ‘No eating'' on the train.\n\nWhat should Rin do?', '[{"id":"A","text":"Eat a big meal now","is_correct":false},{"id":"B","text":"Drop crumbs on the floor","is_correct":false},{"id":"C","text":"Wait to eat later","is_correct":true}]'::jsonb, 19);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a shrine, Ken washed his hands at a water station.\n\nWhy do people wash hands at shrines?', '[{"id":"A","text":"To be clean and respectful","is_correct":true},{"id":"B","text":"To dry their shoes","is_correct":false},{"id":"C","text":"To cool off a phone","is_correct":false}]'::jsonb, 20);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a restaurant, Emi said Sumimasen (Sue-mee-MAH-sen) to get help.\n\nWhy might Emi say Sumimasen (Sue-mee-MAH-sen)?', '[{"id":"A","text":"To say ‘I am sleepy''","is_correct":false},{"id":"B","text":"To say ‘Happy birthday''","is_correct":false},{"id":"C","text":"To get attention politely","is_correct":true}]'::jsonb, 21);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'After eating, Taro said Gochisousama (Go-chee-SOH-sah-mah).\n\nWhen do people often say Gochisousama (Go-chee-SOH-sah-mah)?', '[{"id":"A","text":"Before a test","is_correct":false},{"id":"B","text":"After eating","is_correct":true},{"id":"C","text":"Before eating","is_correct":false}]'::jsonb, 22);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In the morning, Aya said Ohayou (Oh-HAH-yoh).\n\nWhen do people often say Ohayou (Oh-HAH-yoh)?', '[{"id":"A","text":"At night","is_correct":false},{"id":"B","text":"In the morning","is_correct":true},{"id":"C","text":"At a wedding","is_correct":false}]'::jsonb, 23);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At night, Koji said Konbanwa (Kon-bahn-wah).\n\nWhat does Konbanwa (Kon-bahn-wah) mean?', '[{"id":"A","text":"Goodbye","is_correct":false},{"id":"B","text":"Good evening","is_correct":true},{"id":"C","text":"Good morning","is_correct":false}]'::jsonb, 24);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'Nina bumped into someone and said Gomen nasai (Go-men nah-SAI).\n\nWhat does Gomen nasai (Go-men nah-SAI) mean?', '[{"id":"A","text":"Hello","is_correct":false},{"id":"B","text":"Thank you","is_correct":false},{"id":"C","text":"I''m sorry","is_correct":true}]'::jsonb, 25);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'A sign at the temple said ‘Quiet please.''\n\nWhat should you do there?', '[{"id":"A","text":"Yell and clap loudly","is_correct":false},{"id":"B","text":"Play a loud game","is_correct":false},{"id":"C","text":"Use a quiet voice","is_correct":true}]'::jsonb, 26);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'In Japan, Leo saw people bow a little when greeting.\n\nWhat can a small bow show?', '[{"id":"A","text":"Respect","is_correct":true},{"id":"B","text":"Hunger","is_correct":false},{"id":"C","text":"Sleepiness","is_correct":false}]'::jsonb, 27);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a crosswalk, Mika waited even though no cars were coming.\n\nWhat is Mika doing?', '[{"id":"A","text":"Trying to race","is_correct":false},{"id":"B","text":"Following the rules","is_correct":true},{"id":"C","text":"Playing tag","is_correct":false}]'::jsonb, 28);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a park, Haru put trash in the right bin.\n\nWhy sort trash?', '[{"id":"A","text":"To hide toys","is_correct":false},{"id":"B","text":"To make more noise","is_correct":false},{"id":"C","text":"To keep places clean","is_correct":true}]'::jsonb, 29);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'On a school trip, Mei stayed close to her group.\n\nWhat is a safe choice?', '[{"id":"A","text":"Stay with your group","is_correct":true},{"id":"B","text":"Hide from adults","is_correct":false},{"id":"C","text":"Run far ahead alone","is_correct":false}]'::jsonb, 30);
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'multiple_choice', 'At a café, a kid said Onegaishimasu (Oh-neh-gai-shee-MAH-s).\n\nWhen might someone say Onegaishimasu (Oh-neh-gai-shee-MAH-s)?', '[{"id":"A","text":"When asking politely","is_correct":true},{"id":"B","text":"When saying goodbye","is_correct":false},{"id":"C","text":"When telling a joke","is_correct":false}]'::jsonb, 31);
    food_questions := ARRAY[
        'Is sushi a common food in Japan?',
        'Is miso soup usually sweet like candy?',
        'Is ramen a noodle dish?',
        'Is tempura made by deep-frying battered food?',
        'Is matcha a type of green tea?',
        'Is mochi made from pounded rice?',
        'Is wasabi known for a spicy kick?',
        'Is soy sauce called shoyu in Japanese?',
        'Is onigiri a rice ball snack?',
        'Is udon thinner than somen noodles?',
        'Is sashimi served without rice?',
        'Is takoyaki often filled with octopus?',
        'Is okonomiyaki a savory pancake?',
        'Is natto known for a strong smell and sticky texture?',
        'Is bento a lunch box meal?',
        'Is tonkatsu usually a breaded pork cutlet?',
        'Is yakitori grilled chicken on skewers?',
        'Is daifuku a mochi dessert?',
        'Is karaage Japanese-style fried chicken?',
        'Is dashi a soup stock used in many dishes?',
        'Is soba always made with zero buckwheat?',
        'Is an izakaya more like a casual pub than a museum?',
        'Is oden usually served cold like ice cream?',
        'Is taiyaki a fish-shaped pastry?',
        'Is shabu-shabu cooked by dipping thin meat in hot broth?',
        'Is gyudon a beef rice bowl?',
        'Is yakisoba a stir-fried noodle dish?',
        'Is dorayaki often filled with sweet red bean paste?',
        'Is senbei a type of Japanese rice cracker?',
        'Is anpan often filled with sweet red bean paste?'
    ];

    food_answers := ARRAY[
        true, false, true, true, true, true, true, true, true, false,
        true, true, true, true, true, true, true, true, true, true,
        false, true, false, true, true, true, true, true, true, true
    ];

    -- RE-GENERATE FOOD
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (food_branch_id, 'Foodie Level ' || i, 'Yummy treats ' || i, 10 + i, 1) RETURNING id INTO level_id;
        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Food Lesson ' || i, 'Delicious food ' || i, 10 + i) RETURNING id INTO lesson_id;
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Food Lesson ' || i || ' intro.', null, 1);
        FOR q IN 1..30 LOOP
            IF food_answers[((q + i - 2) % 30) + 1] THEN
                option_json := '[{"id":"1","text":"Yes","is_correct":true}, {"id":"2","text":"No","is_correct":false}]'::jsonb;
            ELSE
                option_json := '[{"id":"1","text":"Yes","is_correct":false}, {"id":"2","text":"No","is_correct":true}]'::jsonb;
            END IF;

            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', food_questions[((q + i - 2) % 30) + 1], option_json, 1 + q);
        END LOOP;
    END LOOP;

    transport_questions := ARRAY[
        'Is the Shinkansen known as the bullet train?',
        'Should riders line up before boarding many trains?',
        'Is it polite to let people exit the train before you board?',
        'Is speaking loudly on a packed commuter train recommended?',
        'Do many train stations show signs in Japanese and English?',
        'Can an IC card like Suica or PASMO be used for many trains and buses?',
        'Is the JR Pass a type of dessert sold in stations?',
        'Do priority seats exist for elderly passengers and people who need support?',
        'Should you block the train doors while deciding where to stand?',
        'Is platform safety behind the yellow line an important rule?',
        'Do local trains usually stop at more stations than express trains?',
        'Is it okay to play videos out loud on public transport?',
        'Can station lockers help travelers store luggage temporarily?',
        'Are taxi doors in Japan often opened automatically by the driver?',
        'Do many buses require exact change or an IC tap when paying?',
        'Should you run across tracks to catch a departing train?',
        'Is checking the last-train time important at night?',
        'Do women-only cars exist on some lines during certain hours?',
        'Is smoking allowed in every train car today?',
        'Are transfer signs used to guide passengers between lines?',
        'Is it polite to move backpacks to avoid hitting others in crowded cars?',
        'Do all trains in Japan require seat reservations?',
        'Is the Yamanote Line a loop line in Tokyo?',
        'Should escalator etiquette in stations be ignored completely?',
        'Can rural areas have less frequent train service than major cities?',
        'Is it normal to eat a full hot meal on very crowded rush-hour trains?',
        'Are bus stop names and next-stop announcements commonly provided?',
        'Is standing on the correct side of platform lines part of orderly boarding?',
        'Can high-speed rail significantly reduce travel time between major cities?',
        'Should you force train doors open after the closing chime?'
    ];

    transport_answers := ARRAY[
        true, true, true, false, true, true, false, true, false, true,
        true, false, true, true, true, false, true, true, false, true,
        true, false, true, false, true, false, true, true, true, false
    ];

    -- RE-GENERATE TRANSPORT
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (transport_branch_id, 'Trains Level ' || i, 'Ride the rails ' || i, 10 + i, 1) RETURNING id INTO level_id;
        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Transport Lesson ' || i, 'Moving around ' || i, 10 + i) RETURNING id INTO lesson_id;
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Transport Lesson ' || i || ' intro.', null, 1);
        FOR q IN 1..30 LOOP
            IF transport_answers[((q + i - 2) % 30) + 1] THEN
                option_json := '[{"id":"1","text":"Yes","is_correct":true}, {"id":"2","text":"No","is_correct":false}]'::jsonb;
            ELSE
                option_json := '[{"id":"1","text":"Yes","is_correct":false}, {"id":"2","text":"No","is_correct":true}]'::jsonb;
            END IF;

            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', transport_questions[((q + i - 2) % 30) + 1], option_json, 1 + q);
        END LOOP;
    END LOOP;

    language_questions := ARRAY[
        'Does Konnichiwa mean hello or good day?',
        'Does Arigatou mean thank you?',
        'Does Ohayou usually mean good morning?',
        'Does Konbanwa mean good evening?',
        'Does Sayonara usually mean goodbye?',
        'Is Sumimasen used for excuse me or sorry?',
        'Is Onegaishimasu used to make polite requests?',
        'Is Gomen nasai an apology phrase?',
        'Is Itadakimasu said before eating?',
        'Is Gochisousama often said after finishing a meal?',
        'Does Hai mean yes?',
        'Does Iie mean no?',
        'Does Doko ask where something is?',
        'Does Nani ask what?',
        'Does Ikura ask how much something costs?',
        'Is Sensei a word for teacher?',
        'Is Tomodachi a word for friend?',
        'Does Eki mean train station?',
        'Does Mizu mean water?',
        'Does Neko mean dog?',
        'Does Inu mean dog?',
        'Is Oyasumi used around bedtime or good night?',
        'Is Kudasai often used like please when asking for something?',
        'Does Daijoubu often mean it is okay?',
        'Does Wakarimasen mean I do not understand?',
        'Is Yasai the word for vegetables?',
        'Does Denwa mean telephone?',
        'Is Kuruma the word for car?',
        'Does Sakana mean fish?',
        'Does Tokei mean mountain?'
    ];

    language_answers := ARRAY[
        true, true, true, true, true, true, true, true, true, true,
        true, true, true, true, true, true, true, true, true, false,
        true, true, true, true, true, true, true, true, true, false
    ];

    -- RE-GENERATE LANGUAGE
    FOR i IN 1..20 LOOP
        INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
        VALUES (lang_branch_id, 'Language Level ' || i, 'Speak up ' || i, 10 + i, 1) RETURNING id INTO level_id;
        INSERT INTO public.lessons (level_id, title, description, order_index)
        VALUES (level_id, 'Word ' || i, 'Vocabulary ' || i, 10 + i) RETURNING id INTO lesson_id;
        INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
        (lesson_id, 'info', 'Language Lesson ' || i || ' intro.', null, 1);
        FOR q IN 1..30 LOOP
            IF language_answers[((q + i - 2) % 30) + 1] THEN
                option_json := '[{"id":"1","text":"Yes","is_correct":true}, {"id":"2","text":"No","is_correct":false}]'::jsonb;
            ELSE
                option_json := '[{"id":"1","text":"Yes","is_correct":false}, {"id":"2","text":"No","is_correct":true}]'::jsonb;
            END IF;

            INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
            (lesson_id, 'multiple_choice', language_questions[((q + i - 2) % 30) + 1], option_json, 1 + q);
        END LOOP;
    END LOOP;

END $$;
