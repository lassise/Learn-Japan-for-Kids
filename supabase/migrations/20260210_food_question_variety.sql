DO $$
DECLARE
    japan_id UUID;
    v1_id UUID;
    food_branch_id UUID;
    yes_first JSONB := '[{"id":"1","text":"Yes","is_correct":true},{"id":"2","text":"No","is_correct":false}]'::jsonb;
    no_first JSONB := '[{"id":"1","text":"Yes","is_correct":false},{"id":"2","text":"No","is_correct":true}]'::jsonb;
    food_questions TEXT[] := ARRAY[
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
    food_answers BOOLEAN[] := ARRAY[
        true, false, true, true, true, true, true, true, true, false,
        true, true, true, true, true, true, true, true, true, true,
        false, true, false, true, true, true, true, true, true, true
    ];
BEGIN
    SELECT id INTO japan_id FROM public.countries WHERE code = 'JP';
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

    WITH targets AS (
        SELECT
            a.id AS activity_id,
            ((a.order_index - 2 + GREATEST(l.order_index - 11, 0)) % 30) + 1 AS question_idx
        FROM public.activities a
        JOIN public.lessons les ON les.id = a.lesson_id
        JOIN public.levels l ON l.id = les.level_id
        WHERE l.branch_id = food_branch_id
          AND a.type = 'multiple_choice'
          AND a.order_index BETWEEN 2 AND 31
          AND a.question_text LIKE 'Food Item #%: Is Ramen delicious?'
    )
    UPDATE public.activities a
    SET
        question_text = food_questions[t.question_idx],
        options = CASE
            WHEN food_answers[t.question_idx] THEN yes_first
            ELSE no_first
        END
    FROM targets t
    WHERE a.id = t.activity_id;
END $$;
