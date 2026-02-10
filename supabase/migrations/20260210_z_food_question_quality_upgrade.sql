DO $$
DECLARE
    japan_id UUID;
    v1_id UUID;
    food_branch_id UUID;
BEGIN
    SELECT id INTO japan_id
    FROM public.countries
    WHERE code = 'JP';

    IF japan_id IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO v1_id
    FROM public.country_versions
    WHERE country_id = japan_id
      AND version_number = 1;

    IF v1_id IS NULL THEN
        RETURN;
    END IF;

    SELECT id INTO food_branch_id
    FROM public.branches
    WHERE country_version_id = v1_id
      AND name = 'Food & Dining';

    IF food_branch_id IS NULL THEN
        RETURN;
    END IF;

    WITH food_bank (question_idx, question_text, options) AS (
        VALUES
            (1, 'Sora ate a warm bowl at a noodle shop. What is ramen?', '[{"id":"A","text":"Noodles in soup","is_correct":true,"explanation":"Ramen is usually noodles served in broth."},{"id":"B","text":"Fried chicken","is_correct":false,"explanation":"Fried chicken is not ramen."},{"id":"C","text":"Steak on a plate","is_correct":false,"explanation":"Steak is not ramen."}]'::jsonb),
            (2, 'Mina opened a lunch box at school. What is a bento?', '[{"id":"A","text":"A packed lunch box","is_correct":true,"explanation":"A bento is a packed meal in a box."},{"id":"B","text":"A dessert cake","is_correct":false,"explanation":"A dessert cake is not a bento."},{"id":"C","text":"A type of drink","is_correct":false,"explanation":"A drink is not a bento."}]'::jsonb),
            (3, 'Ken held a triangle snack wrapped in seaweed. What is onigiri?', '[{"id":"A","text":"A rice ball","is_correct":true,"explanation":"Onigiri is a rice ball, often wrapped with seaweed."},{"id":"B","text":"A noodle soup","is_correct":false,"explanation":"Noodle soup is not onigiri."},{"id":"C","text":"A grilled steak","is_correct":false,"explanation":"Steak is not onigiri."}]'::jsonb),
            (4, 'Aiko dipped food into a small bowl of dark sauce. What is soy sauce?', '[{"id":"A","text":"A salty sauce for food","is_correct":true,"explanation":"Soy sauce is a salty seasoning sauce."},{"id":"B","text":"A sweet ice cream topping","is_correct":false,"explanation":"Soy sauce is savory, not an ice cream topping."},{"id":"C","text":"A spicy candy","is_correct":false,"explanation":"Soy sauce is not candy."}]'::jsonb),
            (5, 'Haru ordered fish on top of rice. What is sushi?', '[{"id":"A","text":"Rice with fish or other toppings","is_correct":true,"explanation":"Sushi is made with seasoned rice and toppings or fillings."},{"id":"B","text":"Chicken with fries","is_correct":false,"explanation":"Chicken and fries is not sushi."},{"id":"C","text":"Bread with cheese","is_correct":false,"explanation":"Bread with cheese is not sushi."}]'::jsonb),
            (6, 'Yuna ate rice and fish wrapped in seaweed. What is a sushi roll?', '[{"id":"A","text":"Rice and fillings rolled in seaweed","is_correct":true,"explanation":"Sushi rolls are fillings wrapped with rice and seaweed."},{"id":"B","text":"A bowl of soup","is_correct":false,"explanation":"Soup is not a sushi roll."},{"id":"C","text":"A grilled steak","is_correct":false,"explanation":"Steak is not a sushi roll."}]'::jsonb),
            (7, 'Taro ate a crispy golden piece from a plate. What is tempura?', '[{"id":"A","text":"Lightly battered and fried food","is_correct":true,"explanation":"Tempura is food dipped in light batter and fried."},{"id":"B","text":"Boiled noodles only","is_correct":false,"explanation":"Tempura is fried, not boiled noodles."},{"id":"C","text":"Raw vegetables only","is_correct":false,"explanation":"Tempura is cooked in batter."}]'::jsonb),
            (8, 'Mei slurped thick noodles in hot broth. What is udon?', '[{"id":"A","text":"Thick wheat noodles","is_correct":true,"explanation":"Udon are thick wheat flour noodles."},{"id":"B","text":"Thin rice crackers","is_correct":false,"explanation":"Rice crackers are not udon."},{"id":"C","text":"Chicken nuggets","is_correct":false,"explanation":"Chicken nuggets are not udon."}]'::jsonb),
            (9, 'Riku tasted a small green paste with sushi. What is wasabi?', '[{"id":"A","text":"A spicy paste","is_correct":true,"explanation":"Wasabi is a spicy condiment often served with sushi."},{"id":"B","text":"A sweet jam","is_correct":false,"explanation":"Wasabi is not sweet jam."},{"id":"C","text":"A type of cheese","is_correct":false,"explanation":"Wasabi is not cheese."}]'::jsonb),
            (10, 'Nana drank a hot cup that smelled like leaves. What is green tea?', '[{"id":"A","text":"Tea made from tea leaves","is_correct":true,"explanation":"Green tea is brewed from tea leaves."},{"id":"B","text":"Milk with chocolate","is_correct":false,"explanation":"Chocolate milk is not green tea."},{"id":"C","text":"Orange juice","is_correct":false,"explanation":"Orange juice is not green tea."}]'::jsonb),
            (11, 'Daichi ate thin slices of tuna without rice. What is sashimi?', '[{"id":"A","text":"Rice with fish on top","is_correct":false,"explanation":"Rice with fish is closer to sushi, not sashimi."},{"id":"B","text":"Raw fish served without rice","is_correct":true,"explanation":"Sashimi is sliced raw fish without rice."},{"id":"C","text":"Fried chicken in batter","is_correct":false,"explanation":"Fried chicken is not sashimi."}]'::jsonb),
            (12, 'Emi ordered a bowl with beef and rice. What is gyudon?', '[{"id":"A","text":"Noodles in broth","is_correct":false,"explanation":"Noodles in broth is not gyudon."},{"id":"B","text":"Beef over rice","is_correct":true,"explanation":"Gyudon is a beef rice bowl."},{"id":"C","text":"Sweet bean cake","is_correct":false,"explanation":"Sweet bean cake is not gyudon."}]'::jsonb),
            (13, 'Kaito mixed a salty paste into soup. What is miso?', '[{"id":"A","text":"Seaweed paper","is_correct":false,"explanation":"Seaweed paper is nori, not miso."},{"id":"B","text":"Green tea powder","is_correct":false,"explanation":"Green tea powder is matcha, not miso."},{"id":"C","text":"Fermented soybean paste","is_correct":true,"explanation":"Miso is a paste made from fermented soybeans."}]'::jsonb),
            (14, 'Hina bought a fish shaped pastry with sweet filling. What is taiyaki?', '[{"id":"A","text":"A fish shaped cake, often with red bean filling","is_correct":true,"explanation":"Taiyaki is a fish shaped pastry, often filled with sweet bean paste."},{"id":"B","text":"A spicy noodle soup","is_correct":false,"explanation":"Taiyaki is a pastry, not noodle soup."},{"id":"C","text":"A grilled chicken skewer","is_correct":false,"explanation":"Grilled chicken skewers are yakitori."}]'::jsonb),
            (15, 'Ren shared grilled skewers at a festival. What is yakitori?', '[{"id":"A","text":"Rice ball wrapped in seaweed","is_correct":false,"explanation":"Rice balls are onigiri."},{"id":"B","text":"Grilled chicken on skewers","is_correct":true,"explanation":"Yakitori means grilled chicken skewers."},{"id":"C","text":"A bowl of curry rice","is_correct":false,"explanation":"Curry rice is not yakitori."}]'::jsonb),
            (16, 'Yui packed crispy fried chicken bites for lunch. What is karaage?', '[{"id":"A","text":"Raw fish slices","is_correct":false,"explanation":"Raw fish slices are sashimi."},{"id":"B","text":"Thick wheat noodles","is_correct":false,"explanation":"Thick wheat noodles are udon."},{"id":"C","text":"Japanese style fried chicken pieces","is_correct":true,"explanation":"Karaage is Japanese style fried chicken."}]'::jsonb),
            (17, 'Sho tried noodles made mostly from buckwheat. What are soba noodles?', '[{"id":"A","text":"Noodles made mostly from buckwheat flour","is_correct":true,"explanation":"Soba noodles are traditionally made from buckwheat."},{"id":"B","text":"Rice crackers","is_correct":false,"explanation":"Rice crackers are senbei."},{"id":"C","text":"Sweet mochi balls","is_correct":false,"explanation":"Mochi is a rice cake, not soba noodles."}]'::jsonb),
            (18, 'Momo learned many soups start with dashi. What is dashi?', '[{"id":"A","text":"A dessert topping","is_correct":false,"explanation":"Dashi is savory, not a dessert topping."},{"id":"B","text":"A savory soup stock","is_correct":true,"explanation":"Dashi is a key broth used in many Japanese dishes."},{"id":"C","text":"A fruit drink","is_correct":false,"explanation":"Dashi is not a fruit drink."}]'::jsonb),
            (19, 'Akari cooked a savory pancake with cabbage and sauce. What is okonomiyaki?', '[{"id":"A","text":"A cold noodle salad","is_correct":false,"explanation":"Okonomiyaki is not a noodle salad."},{"id":"B","text":"A sweet cookie","is_correct":false,"explanation":"Okonomiyaki is savory, not a cookie."},{"id":"C","text":"A savory Japanese pancake","is_correct":true,"explanation":"Okonomiyaki is a savory pancake with mixed ingredients."}]'::jsonb),
            (20, 'Kota says Itadakimasu before eating. Why?', '[{"id":"A","text":"To show thanks before a meal","is_correct":true,"explanation":"Itadakimasu expresses gratitude before eating."},{"id":"B","text":"To ask for the check","is_correct":false,"explanation":"This phrase is not used for asking the check."},{"id":"C","text":"To say goodbye","is_correct":false,"explanation":"Itadakimasu is not a goodbye phrase."}]'::jsonb),
            (21, 'Nao says Gochisosama after dinner. What does it express?', '[{"id":"A","text":"I am still hungry","is_correct":false,"explanation":"Gochisosama is not used to ask for more food."},{"id":"B","text":"Thanks for the meal","is_correct":true,"explanation":"Gochisosama is said after eating to show appreciation."},{"id":"C","text":"Please bring water","is_correct":false,"explanation":"This phrase is not a request for water."}]'::jsonb),
            (22, 'What food is made by pounding sticky rice into a chewy cake?', '[{"id":"A","text":"Tempura","is_correct":false,"explanation":"Tempura is battered and fried food."},{"id":"B","text":"Udon","is_correct":false,"explanation":"Udon is a noodle."},{"id":"C","text":"Mochi","is_correct":true,"explanation":"Mochi is a chewy rice cake made from pounded rice."}]'::jsonb),
            (23, 'Which ingredient is powdered green tea used in drinks and sweets?', '[{"id":"A","text":"Matcha","is_correct":true,"explanation":"Matcha is finely ground green tea powder."},{"id":"B","text":"Soy sauce","is_correct":false,"explanation":"Soy sauce is a salty condiment."},{"id":"C","text":"Vinegar","is_correct":false,"explanation":"Vinegar is not powdered tea."}]'::jsonb),
            (24, 'Which food is famous for sticky fermented soybeans?', '[{"id":"A","text":"Bento","is_correct":false,"explanation":"Bento is a meal box, not one food ingredient."},{"id":"B","text":"Natto","is_correct":true,"explanation":"Natto is fermented soybeans with a sticky texture."},{"id":"C","text":"Miso soup","is_correct":false,"explanation":"Miso soup is different from natto."}]'::jsonb),
            (25, 'In shabu shabu, how do you cook thin meat slices?', '[{"id":"A","text":"Bake them like bread","is_correct":false,"explanation":"Shabu shabu is cooked in broth, not baked."},{"id":"B","text":"Freeze them before eating","is_correct":false,"explanation":"The meat is cooked fresh in hot broth."},{"id":"C","text":"Swish them in hot broth","is_correct":true,"explanation":"You cook shabu shabu by swishing thin slices in hot broth."}]'::jsonb),
            (26, 'Which dish is a hot pot with thin beef, tofu, and sweet savory sauce?', '[{"id":"A","text":"Sukiyaki","is_correct":true,"explanation":"Sukiyaki is a sweet savory hot pot dish."},{"id":"B","text":"Onigiri","is_correct":false,"explanation":"Onigiri is a rice ball."},{"id":"C","text":"Taiyaki","is_correct":false,"explanation":"Taiyaki is a pastry."}]'::jsonb),
            (27, 'What are tsukemono in a Japanese meal?', '[{"id":"A","text":"Fresh fruit juice","is_correct":false,"explanation":"Tsukemono are not drinks."},{"id":"B","text":"Pickled vegetables","is_correct":true,"explanation":"Tsukemono are Japanese pickled vegetables."},{"id":"C","text":"Fried noodles","is_correct":false,"explanation":"Fried noodles are a different dish."}]'::jsonb),
            (28, 'Which snack is usually a crunchy rice cracker?', '[{"id":"A","text":"Dorayaki","is_correct":false,"explanation":"Dorayaki is a sweet pancake sandwich."},{"id":"B","text":"Yakitori","is_correct":false,"explanation":"Yakitori is grilled chicken skewers."},{"id":"C","text":"Senbei","is_correct":true,"explanation":"Senbei are crunchy rice crackers."}]'::jsonb),
            (29, 'What is anpan?', '[{"id":"A","text":"Soft bread filled with sweet red bean paste","is_correct":true,"explanation":"Anpan is sweet bread often filled with red bean paste."},{"id":"B","text":"A spicy fish soup","is_correct":false,"explanation":"Anpan is bread, not soup."},{"id":"C","text":"A salty soy dip","is_correct":false,"explanation":"Anpan is not a dip."}]'::jsonb),
            (30, 'When you are not using chopsticks, where should they go?', '[{"id":"A","text":"Stuck upright in rice","is_correct":false,"explanation":"Do not stick chopsticks upright in rice."},{"id":"B","text":"On a chopstick rest or neatly on the bowl edge","is_correct":true,"explanation":"Place chopsticks neatly when not in use."},{"id":"C","text":"Hidden under the plate","is_correct":false,"explanation":"Chopsticks should stay visible and tidy."}]'::jsonb)
    ),
    targets AS (
        SELECT
            a.id AS activity_id,
            fb.question_text,
            fb.options
        FROM public.activities a
        JOIN public.lessons les ON les.id = a.lesson_id
        JOIN public.levels l ON l.id = les.level_id
        JOIN food_bank fb
          ON fb.question_idx = (
                (
                    a.order_index - 2
                    + (
                        COALESCE(
                            NULLIF(regexp_replace(les.title, '[^0-9]', '', 'g'), ''),
                            '1'
                        )::INT - 1
                    )
                ) % 30
            ) + 1
        WHERE l.branch_id = food_branch_id
          AND les.title LIKE 'Food Lesson %'
          AND a.type = 'multiple_choice'
          AND a.order_index BETWEEN 2 AND 31
    )
    UPDATE public.activities a
    SET
        question_text = t.question_text,
        options = t.options
    FROM targets t
    WHERE a.id = t.activity_id;
END $$;
