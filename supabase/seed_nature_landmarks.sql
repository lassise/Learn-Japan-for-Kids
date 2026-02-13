-- NATURE & LANDMARKS CONTENT SEED
DO $$
DECLARE
    japan_id UUID;
    v1_id UUID;
    nature_branch_id UUID;
    level_id UUID;
    lesson_id UUID;
BEGIN
    -- Get Meta IDs
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
    SELECT id INTO v1_id FROM public.country_versions WHERE country_id = japan_id AND version_number = 1;

    -- Create/Get Nature Branch
    INSERT INTO public.branches (country_version_id, name, description, order_index)
    VALUES (v1_id, 'Nature & Landmarks', 'Explore Japan''s mountains, animals, and famous places.', 6)
    ON CONFLICT DO NOTHING
    RETURNING id INTO nature_branch_id;

    IF nature_branch_id IS NULL THEN
        SELECT id INTO nature_branch_id FROM public.branches WHERE country_version_id = v1_id AND name = 'Nature & Landmarks';
    END IF;

    -- Create Level 1
    INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level)
    VALUES (nature_branch_id, 'Nature Level 1', 'Mountains and Animals', 1, 1)
    RETURNING id INTO level_id;

    -- Create Lesson 1
    INSERT INTO public.lessons (level_id, title, description, order_index)
    VALUES (level_id, 'Japan''s Natural Wonders', 'Learn about Mt. Fuji and the snow monkeys!', 1)
    RETURNING id INTO lesson_id;

    -- 1. Info Slide
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index)
    VALUES (lesson_id, 'info', 'Welcome to Nature & Landmarks! Let''s explore the wild side of Japan.', null, 1);

    -- 2-31. 30 Questions (Captain Mode)
    INSERT INTO public.activities (lesson_id, type, question_text, options, order_index) VALUES
    (lesson_id, 'multiple_choice', 'What is the tallest and most famous mountain in Japan?', '[{"id":"A","text":"Mt. Fuji","is_correct":true}, {"id":"B","text":"Mt. Everest","is_correct":false}, {"id":"C","text":"Mt. Cook","is_correct":false}]'::jsonb, 2),
    (lesson_id, 'multiple_choice', 'Is Mt. Fuji an active volcano?', '[{"id":"A","text":"Yes, it is!","is_correct":true}, {"id":"B","text":"No, it is just a hill","is_correct":false}]'::jsonb, 3),
    (lesson_id, 'multiple_choice', 'Which animals are famous for bathing in hot springs in Nagano?', '[{"id":"A","text":"Snow Monkeys","is_correct":true}, {"id":"B","text":"Polar Bears","is_correct":false}, {"id":"C","text":"Penguins","is_correct":false}]'::jsonb, 4),
    (nature_branch_id, 'multiple_choice', 'What animal is famous for bowing to people in Nara Park?', '[{"id":"A","text":"Deer","is_correct":true}, {"id":"B","text":"Cats","is_correct":false}, {"id":"C","text":"Dogs","is_correct":false}]'::jsonb, 5),
    (lesson_id, 'multiple_choice', 'What is the Japanese word for the four seasons?', '[{"id":"A","text":"Shiki","is_correct":true}, {"id":"B","text":"Sushi","is_correct":false}, {"id":"C","text":"Sayonara","is_correct":false}]'::jsonb, 6),
    (lesson_id, 'multiple_choice', 'Which tree has beautiful pink flowers that bloom in the spring?', '[{"id":"A","text":"Cherry Blossom (Sakura)","is_correct":true}, {"id":"B","text":"Pine Tree","is_correct":false}, {"id":"C","text":"Oak Tree","is_correct":false}]'::jsonb, 7),
    (lesson_id, 'multiple_choice', 'How many main large islands make up the country of Japan?', '[{"id":"A","text":"4","is_correct":true}, {"id":"B","text":"10","is_correct":false}, {"id":"C","text":"1","is_correct":false}]'::jsonb, 8),
    (lesson_id, 'multiple_choice', 'What is the name of the largest main island where Tokyo is located?', '[{"id":"A","text":"Honshu","is_correct":true}, {"id":"B","text":"Hokkaido","is_correct":false}, {"id":"C","text":"Kyushu","is_correct":false}]'::jsonb, 9),
    (lesson_id, 'multiple_choice', 'Which southern islands are known for beautiful tropical beaches and coral?', '[{"id":"A","text":"Okinawa","is_correct":true}, {"id":"B","text":"Alaska","is_correct":false}, {"id":"C","text":"Hokkaido","is_correct":false}]'::jsonb, 10),
    (lesson_id, 'multiple_choice', 'Which northern island is famous for having lots of snow and world-class skiing?', '[{"id":"A","text":"Hokkaido","is_correct":true}, {"id":"B","text":"Shikoku","is_correct":false}, {"id":"C","text":"Kyushu","is_correct":false}]'::jsonb, 11),
    (lesson_id, 'multiple_choice', 'What is the "Golden Pavilion" temple in Kyoto covered in?', '[{"id":"A","text":"Real Gold Leaf","is_correct":true}, {"id":"B","text":"Yellow Paint","is_correct":false}, {"id":"C","text":"Sand","is_correct":false}]'::jsonb, 12),
    (lesson_id, 'multiple_choice', 'Where can you walk through a giant forest of very tall green bamboo stalks?', '[{"id":"A","text":"Arashiyama Bamboo Grove","is_correct":true}, {"id":"B","text":"Central Park","is_correct":false}, {"id":"C","text":"The Sahara Desert","is_correct":false}]'::jsonb, 13),
    (lesson_id, 'multiple_choice', 'What color are the giant "Torii" gates often found at the entrance of Shinto shrines?', '[{"id":"A","text":"Bright Red (Vermillion)","is_correct":true}, {"id":"B","text":"Deep Blue","is_correct":false}, {"id":"C","text":"Purple","is_correct":false}]'::jsonb, 14),
    (lesson_id, 'multiple_choice', 'Which city is famous for its 1,000+ friendly deer that live in the park?', '[{"id":"A","text":"Nara","is_correct":true}, {"id":"B","text":"Osaka","is_correct":false}, {"id":"C","text":"Hiroshima","is_correct":false}]'::jsonb, 15),
    (lesson_id, 'multiple_choice', 'What do people call the red-crowned cranes that are symbols of luck in Japan?', '[{"id":"A","text":"Tancho","is_correct":true}, {"id":"B","text":"Flamingos","is_correct":false}, {"id":"C","text":"Pigeons","is_correct":false}]'::jsonb, 16),
    (lesson_id, 'multiple_choice', 'True or False: Japan has over 100 active volcanoes.', '[{"id":"A","text":"True","is_correct":true}, {"id":"B","text":"False","is_correct":false}]'::jsonb, 17),
    (lesson_id, 'multiple_choice', 'Which sea forest is known as the "Sea of Trees" near Mt. Fuji?', '[{"id":"A","text":"Aokigahara Forest","is_correct":true}, {"id":"B","text":"Amazon Rainforest","is_correct":false}, {"id":"C","text":"Sherwood Forest","is_correct":false}]'::jsonb, 18),
    (lesson_id, 'multiple_choice', 'What is the name of the traditional Japanese "dry" gardens made of rocks and sand?', '[{"id":"A","text":"Zen Gardens","is_correct":true}, {"id":"B","text":"Water Parks","is_correct":false}, {"id":"C","text":"Sandcastles","is_correct":false}]'::jsonb, 19),
    (lesson_id, 'multiple_choice', 'Which city is known for its beautiful "Floating" Torii gate in the sea?', '[{"id":"A","text":"Miyajima (near Hiroshima)","is_correct":true}, {"id":"B","text":"Nagoya","is_correct":false}, {"id":"C","text":"Sapporo","is_correct":false}]'::jsonb, 20),
    (lesson_id, 'multiple_choice', 'What animal is a Giant Salamander? (Japan has some of the biggest!)', '[{"id":"A","text":"An Amphibian","is_correct":true}, {"id":"B","text":"A Mammal","is_correct":false}, {"id":"C","text":"A Bird","is_correct":false}]'::jsonb, 21),
    (lesson_id, 'multiple_choice', 'Which flower is the symbol of the Japanese Emperor?', '[{"id":"A","text":"Chrysanthemum","is_correct":true}, {"id":"B","text":"Rose","is_correct":false}, {"id":"C","text":"Tulip","is_correct":false}]'::jsonb, 22),
    (lesson_id, 'multiple_choice', 'True or False: Japan is an archipelago (a group of islands).', '[{"id":"A","text":"True","is_correct":true}, {"id":"B","text":"False","is_correct":false}]'::jsonb, 23),
    (lesson_id, 'multiple_choice', 'What is "Momijigari"?', '[{"id":"A","text":"Autumn leaf viewing","is_correct":true}, {"id":"B","text":"Snowball fighting","is_correct":false}, {"id":"C","text":"Eating ice cream","is_correct":false}]'::jsonb, 24),
    (lesson_id, 'multiple_choice', 'Which castle is known as the "White Heron Castle" because of its white color?', '[{"id":"A","text":"Himeji Castle","is_correct":true}, {"id":"B","text":"Osaka Castle","is_correct":false}, {"id":"C","text":"Disney Castle","is_correct":false}]'::jsonb, 25),
    (lesson_id, 'multiple_choice', 'What is the name of the active volcano on the island of Kyushu that constantly puffs smoke?', '[{"id":"A","text":"Sakurajima","is_correct":true}, {"id":"B","text":"Vesuvius","is_correct":false}, {"id":"C","text":"Krakatoa","is_correct":false}]'::jsonb, 26),
    (lesson_id, 'multiple_choice', 'What are "Onsen"?', '[{"id":"A","text":"Natural hot springs","is_correct":true}, {"id":"B","text":"Fast trains","is_correct":false}, {"id":"C","text":"Spicy noodles","is_correct":false}]'::jsonb, 27),
    (lesson_id, 'multiple_choice', 'In Hokkaido, what is the "Blue Pond" famous for?', '[{"id":"A","text":"Its bright blue color","is_correct":true}, {"id":"B","text":"Having rubber ducks","is_correct":false}, {"id":"C","text":"Being made of soda","is_correct":false}]'::jsonb, 28),
    (lesson_id, 'multiple_choice', 'Which city is the best place to see the giant Ghibli Museum clock or "Big Clock"?', '[{"id":"A","text":"Tokyo","is_correct":true}, {"id":"B","text":"Kyoto","is_correct":false}, {"id":"C","text":"Sendai","is_correct":false}]'::jsonb, 29),
    (lesson_id, 'multiple_choice', 'What are the small statues with red bibs often seen along mountain paths called?', '[{"id":"A","text":"Jizo Statues","is_correct":true}, {"id":"B","text":"Garden Gnomes","is_correct":false}, {"id":"C","text":"Action Figures","is_correct":false}]'::jsonb, 30),
    (nature_branch_id, 'multiple_choice', 'True or False: You can see wild cats on Tashirojima, also known as "Cat Island".', '[{"id":"A","text":"True","is_correct":true}, {"id":"B","text":"False","is_correct":false}]'::jsonb, 31);

END $$;
