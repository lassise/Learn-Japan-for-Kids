-- INSERT COUNTRIES
INSERT INTO public.countries (name, code, flag_url, description, is_published) VALUES
('Japan', 'JP', 'https://flagcdn.com/w320/jp.png', 'Land of the Rising Sun', TRUE),
('Peru', 'PE', 'https://flagcdn.com/w320/pe.png', 'Land of the Incas', TRUE),
('Greece', 'GR', 'https://flagcdn.com/w320/gr.png', 'Cradle of Western Civilization', TRUE)
ON CONFLICT (code) DO NOTHING;

-- INSERT VERSIONS (v1)
INSERT INTO public.country_versions (country_id, version_number, status, published_at)
SELECT id, 1, 'published', NOW() FROM public.countries WHERE code IN ('JP', 'PE', 'GR')
ON CONFLICT (country_id, version_number) DO NOTHING;

-- INSERT BRANCHES FOR JAPAN v1
WITH version AS (SELECT id FROM public.country_versions WHERE country_id = (SELECT id FROM public.countries WHERE code = 'JP') AND version_number = 1)
INSERT INTO public.branches (country_version_id, name, description, order_index) VALUES
((SELECT id FROM version), 'Tourist Essentials', 'What you will see and do', 1),
((SELECT id FROM version), 'Food & Dining', 'Sushi, Ramen, and Etiquette', 2),
((SELECT id FROM version), 'Transport', 'Trains, Subways, and Walking', 3),
((SELECT id FROM version), 'Language Basics', 'Greetings and Politeness', 4);

-- INSERT BRANCHES FOR PERU v1
WITH version AS (SELECT id FROM public.country_versions WHERE country_id = (SELECT id FROM public.countries WHERE code = 'PE') AND version_number = 1)
INSERT INTO public.branches (country_version_id, name, description, order_index) VALUES
((SELECT id FROM version), 'Tourist Essentials', 'Machu Picchu and more', 1),
((SELECT id FROM version), 'Food & Markets', 'Ceviche and Corn', 2),
((SELECT id FROM version), 'Transport', 'Buses and Trains', 3),
((SELECT id FROM version), 'Language Basics', 'Spanish Phrases', 4);

-- INSERT BRANCHES FOR GREECE v1
WITH version AS (SELECT id FROM public.country_versions WHERE country_id = (SELECT id FROM public.countries WHERE code = 'GR') AND version_number = 1)
INSERT INTO public.branches (country_version_id, name, description, order_index) VALUES
((SELECT id FROM version), 'Tourist Essentials', 'Acropolis and Islands', 1),
((SELECT id FROM version), 'Food & Tavernas', 'Gyros, Feta, and Olives', 2),
((SELECT id FROM version), 'Transport', 'Ferries and Walking', 3),
((SELECT id FROM version), 'Language Basics', 'Greek Greetings', 4);

-- INSERT LEVELS FOR JAPAN TOURIST BRANCH
WITH branch AS (SELECT id FROM public.branches WHERE name = 'Tourist Essentials' AND country_version_id = (SELECT id FROM public.country_versions WHERE country_id = (SELECT id FROM public.countries WHERE code = 'JP') AND version_number = 1))
INSERT INTO public.levels (branch_id, title, description, order_index, difficulty_level) VALUES
((SELECT id FROM branch), 'Arrival in Tokyo', 'Your first steps in Japan', 1, 1),
((SELECT id FROM branch), 'Shrines & Temples', 'Understanding the difference', 2, 1),
((SELECT id FROM branch), 'Convenience Stores', 'The magic of Konbini', 3, 1);
