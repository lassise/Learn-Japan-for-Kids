-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ROLES & PROFILES
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.families (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id)
);

CREATE TABLE public.family_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'admin',
    UNIQUE(family_id, profile_id)
);

CREATE TABLE public.child_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    family_id UUID REFERENCES public.families(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    avatar_url TEXT,
    pin_code TEXT, -- Simple pin for child login if needed
    age_group TEXT CHECK (age_group IN ('K-2', '3-5', '6-8', '9-12')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    streak_count INT DEFAULT 0,
    last_active_date DATE,
    total_points INT DEFAULT 0
);

-- CONTENT STRUCTURE
CREATE TABLE public.countries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE, -- e.g., 'Japan'
    code TEXT NOT NULL UNIQUE, -- e.g., 'JP'
    flag_url TEXT,
    description TEXT,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.country_versions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    country_id UUID REFERENCES public.countries(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    status TEXT CHECK (status IN ('draft', 'published', 'archived')) DEFAULT 'draft',
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(country_id, version_number)
);

CREATE TABLE public.branches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    country_version_id UUID REFERENCES public.country_versions(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Tourist', 'Food', 'Transport', 'Language', 'Culture', 'History', 'Math'
    description TEXT,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.levels (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    difficulty_level INT DEFAULT 1,
    mastery_threshold INT DEFAULT 80, -- Percent needed to pass
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.lessons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT DEFAULT 0,
    content_json JSONB, -- Flexible content for the lesson intro/outro
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.activities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'image_choice', 'map_click', 'scenario', 'flashcard')),
    question_text TEXT NOT NULL,
    media_url TEXT,
    options JSONB, -- Array of {id, text, is_correct, image_url, explanation}
    correct_explanation TEXT,
    difficulty INT DEFAULT 1,
    order_index INT DEFAULT 0,
    citation_source TEXT,
    citation_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PROGRESS TRACKING
CREATE TABLE public.lesson_completions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT NOW(),
    score INT,
    duration_seconds INT
);

CREATE TABLE public.daily_streaks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, date)
);

-- REWARDS
CREATE TABLE public.rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('badge', 'costume', 'item')),
    image_url TEXT,
    cost_points INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_rewards (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family/Auth Setup RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles select own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "Profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Families select member or owner" ON public.families FOR SELECT TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = public.families.id
          AND fm.profile_id = auth.uid()
    )
);
CREATE POLICY "Families insert own" ON public.families FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Families update owner" ON public.families FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Family members select own" ON public.family_members FOR SELECT TO authenticated USING (profile_id = auth.uid());
CREATE POLICY "Family members insert self into own family" ON public.family_members FOR INSERT TO authenticated WITH CHECK (
    profile_id = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.families f
        WHERE f.id = public.family_members.family_id
          AND f.created_by = auth.uid()
    )
);

ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Child profiles family read" ON public.child_profiles FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = public.child_profiles.family_id
          AND fm.profile_id = auth.uid()
    )
);
CREATE POLICY "Child profiles family insert" ON public.child_profiles FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = public.child_profiles.family_id
          AND fm.profile_id = auth.uid()
    )
);
CREATE POLICY "Child profiles family update" ON public.child_profiles FOR UPDATE TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = public.child_profiles.family_id
          AND fm.profile_id = auth.uid()
    )
) WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.family_members fm
        WHERE fm.family_id = public.child_profiles.family_id
          AND fm.profile_id = auth.uid()
    )
);


-- Public Content (read-only for authenticated)
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public content is viewable by authenticated users" ON public.countries FOR SELECT TO authenticated USING (true);

ALTER TABLE public.country_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Versions viewable by auth" ON public.country_versions FOR SELECT TO authenticated USING (true);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branches viewable by auth" ON public.branches FOR SELECT TO authenticated USING (true);

ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Levels viewable by auth" ON public.levels FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lessons viewable by auth" ON public.lessons FOR SELECT TO authenticated USING (true);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Activities viewable by auth" ON public.activities FOR SELECT TO authenticated USING (true);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Rewards viewable by auth" ON public.rewards FOR SELECT TO authenticated USING (true);

-- User Progress RLS
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view family completions" ON public.lesson_completions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.child_profiles cp
        JOIN public.families f ON cp.family_id = f.id
        JOIN public.family_members fm ON f.id = fm.family_id
        WHERE cp.id = public.lesson_completions.child_id AND fm.profile_id = auth.uid()
    )
);
CREATE POLICY "Users can insert completions for family" ON public.lesson_completions FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.child_profiles cp
        JOIN public.families f ON cp.family_id = f.id
        JOIN public.family_members fm ON f.id = fm.family_id
        WHERE cp.id = child_id AND fm.profile_id = auth.uid()
    )
);

ALTER TABLE public.daily_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view/edit family streaks" ON public.daily_streaks FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.child_profiles cp
        JOIN public.families f ON cp.family_id = f.id
        JOIN public.family_members fm ON f.id = fm.family_id
        WHERE cp.id = public.daily_streaks.child_id AND fm.profile_id = auth.uid()
    )
);

ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view/edit family rewards" ON public.user_rewards FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.child_profiles cp
        JOIN public.families f ON cp.family_id = f.id
        JOIN public.family_members fm ON f.id = fm.family_id
        WHERE cp.id = public.user_rewards.child_id AND fm.profile_id = auth.uid()
    )
);

