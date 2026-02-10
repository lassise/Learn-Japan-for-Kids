export interface Skill {
    id: string;
    name: string;
    type: 'phonics' | 'math' | 'vocab' | 'grammar' | 'other';
    description?: string;
    created_at: string;
}

export interface LessonSkill {
    id: string;
    lesson_id: string;
    skill_id: string;
    weight: number;
}

export interface ChildSkillMastery {
    id: string;
    child_id: string;
    skill_id: string;
    mastery_level: number; // 0-100
    last_practiced_at?: string;
    created_at: string;
}

export interface MasteryGate {
    id: string;
    level_id: string;
    required_skill_id: string;
    required_mastery: number;
    created_at: string;
}

export interface ChildProfile {
    id: string;
    family_id: string;
    name: string;
    avatar_url?: string;
    pin_code?: string;
    age_group: 'K-2' | '3-5' | '6-8' | '9-12';
    created_at: string;
    streak_count: number;
    last_active_date?: string;
    total_points: number;
    mastery_gating_enabled: boolean;
}
