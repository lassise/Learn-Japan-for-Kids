-- Create Skills Table
CREATE TABLE public.skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL, -- e.g. "Phoneme 'ka'", "Basic Addition"
    type TEXT, -- 'phonics', 'math', 'vocab', 'grammar'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link Skills to Lessons (Many-to-Many)
CREATE TABLE public.lesson_skills (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    weight INT DEFAULT 1, -- How much this lesson contributes to skill mastery
    UNIQUE(lesson_id, skill_id)
);

-- Track Child Mastery per Skill
CREATE TABLE public.child_skill_mastery (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    child_id UUID REFERENCES public.child_profiles(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    mastery_level INT DEFAULT 0, -- 0-100%
    last_practiced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(child_id, skill_id)
);

-- Mastery Gates (Prerequisites for Levels)
CREATE TABLE public.mastery_gates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    level_id UUID REFERENCES public.levels(id) ON DELETE CASCADE,
    required_skill_id UUID REFERENCES public.skills(id) ON DELETE CASCADE,
    required_mastery INT DEFAULT 80, -- Must have >80 mastery to unlock level
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Skills viewable by auth" ON public.skills FOR SELECT TO authenticated USING (true);

ALTER TABLE public.lesson_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lesson Skills viewable by auth" ON public.lesson_skills FOR SELECT TO authenticated USING (true);

ALTER TABLE public.child_skill_mastery ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view family mastery" ON public.child_skill_mastery FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.child_profiles cp
        JOIN public.families f ON cp.family_id = f.id
        JOIN public.family_members fm ON f.id = fm.family_id
        WHERE cp.id = public.child_skill_mastery.child_id AND fm.profile_id = auth.uid()
    )
);
CREATE POLICY "Users can update family mastery" ON public.child_skill_mastery FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.child_profiles cp
        JOIN public.families f ON cp.family_id = f.id
        JOIN public.family_members fm ON f.id = fm.family_id
        WHERE cp.id = public.child_skill_mastery.child_id AND fm.profile_id = auth.uid()
    )
);

ALTER TABLE public.mastery_gates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Mastery Gates viewable by auth" ON public.mastery_gates FOR SELECT TO authenticated USING (true);

-- Add Mastery Gating Toggle to Child Profile
ALTER TABLE public.child_profiles ADD COLUMN IF NOT EXISTS mastery_gating_enabled BOOLEAN DEFAULT TRUE;
