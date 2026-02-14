-- Add Quest Segment Stamps to rewards table
INSERT INTO public.rewards (id, name, description, icon_url, type, cost_points) VALUES
('b0000000-0000-0000-0000-000000000001', 'Train Stamp', 'Earned during a Japan Adventure segment!', '🚄', 'badge', 0),
('b0000000-0000-0000-0000-000000000002', 'Food Stamp', 'Earned during a Japan Adventure segment!', '🍱', 'badge', 0),
('b0000000-0000-0000-0000-000000000003', 'Temple Stamp', 'Earned during a Japan Adventure segment!', '⛩️', 'badge', 0),
('b0000000-0000-0000-0000-000000000004', 'School Stamp', 'Earned during a Japan Adventure segment!', '🎒', 'badge', 0),
('b0000000-0000-0000-0000-000000000005', 'Phrase Stamp', 'Earned during a Japan Adventure segment!', '🗣️', 'badge', 0),
('b0000000-0000-0000-0000-000000000006', 'Culture Stamp', 'Earned during a Japan Adventure segment!', '🎎', 'badge', 0),
('b0000000-0000-0000-0000-000000000007', 'Nature Stamp', 'Earned during a Japan Adventure segment!', '🏔️', 'badge', 0),
('b0000000-0000-0000-0000-000000000008', 'Friendship Stamp', 'Earned during a Japan Adventure segment!', '🤝', 'badge', 0)
ON CONFLICT (id) DO NOTHING;
