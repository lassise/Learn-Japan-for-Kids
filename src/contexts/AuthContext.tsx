import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
    session: Session | null;
    user: User | null;
    loading: boolean;
    profile: any | null;
    familyId: string | null;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user);
            else setLoading(false);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user);
            else {
                setProfile(null);
                setFamilyId(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (authUser: User) => {
        const userId = authUser.id;
        const userEmail = authUser.email || null;

        try {
            const { data: existingProfile, error: profileFetchError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (profileFetchError) {
                console.error('Error fetching profile:', profileFetchError);
            }

            let profileData = existingProfile;
            if (!profileData) {
                const { data: createdProfile, error: createProfileError } = await supabase
                    .from('profiles')
                    .insert([{ id: userId, email: userEmail }])
                    .select('*')
                    .single();

                if (createProfileError) {
                    // If another process created it between calls, fetch once more.
                    if (createProfileError.code === '23505') {
                        const { data: retryProfile } = await supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', userId)
                            .maybeSingle();
                        profileData = retryProfile;
                    } else {
                        console.error('Error creating profile:', createProfileError);
                    }
                } else {
                    profileData = createdProfile;
                }
            }

            setProfile(profileData);

            const { data: memberships, error: membershipError } = await supabase
                .from('family_members')
                .select('family_id')
                .eq('profile_id', userId);

            if (membershipError) {
                console.error('Error fetching family memberships:', membershipError);
            }

            let resolvedFamilyId: string | null = null;
            const membershipRows = memberships || [];

            if (membershipRows.length > 0) {
                if (membershipRows.length === 1) {
                    resolvedFamilyId = membershipRows[0].family_id;
                } else {
                    // Prefer the family with the most child profiles to preserve existing progress context.
                    const scoredFamilies = await Promise.all(
                        membershipRows.map(async (membership) => {
                            const { count, error } = await supabase
                                .from('child_profiles')
                                .select('*', { count: 'exact', head: true })
                                .eq('family_id', membership.family_id);

                            if (error) {
                                console.error('Error counting children for family:', error);
                            }

                            return {
                                familyId: membership.family_id,
                                childCount: count || 0
                            };
                        })
                    );

                    scoredFamilies.sort((a, b) => b.childCount - a.childCount);
                    resolvedFamilyId = scoredFamilies[0]?.familyId || membershipRows[0].family_id;
                }
            } else {
                const { data: ownedFamilies, error: ownedFamiliesError } = await supabase
                    .from('families')
                    .select('id')
                    .eq('created_by', userId)
                    .order('created_at', { ascending: true })
                    .limit(1);

                if (ownedFamiliesError) {
                    console.error('Error fetching owned families:', ownedFamiliesError);
                }

                if (ownedFamilies && ownedFamilies.length > 0) {
                    resolvedFamilyId = ownedFamilies[0].id;

                    const { error: linkExistingError } = await supabase
                        .from('family_members')
                        .insert([{
                            family_id: ownedFamilies[0].id,
                            profile_id: userId,
                            role: 'admin'
                        }]);

                    if (linkExistingError && linkExistingError.code !== '23505') {
                        console.error('Error linking existing family membership:', linkExistingError);
                    }
                }
            }

            if (!resolvedFamilyId) {
                const defaultFamilyName = userEmail
                    ? `${userEmail.split('@')[0]}'s Family`
                    : 'My Family';

                const { data: createdFamily, error: familyCreateError } = await supabase
                    .from('families')
                    .insert([{ name: defaultFamilyName, created_by: userId }])
                    .select('id')
                    .single();

                if (familyCreateError) {
                    console.error('Error creating default family:', familyCreateError);
                    setFamilyId(null);
                    return;
                }

                resolvedFamilyId = createdFamily.id;

                const { error: memberCreateError } = await supabase
                    .from('family_members')
                    .insert([{
                        family_id: resolvedFamilyId,
                        profile_id: userId,
                        role: 'admin'
                    }]);

                if (memberCreateError && memberCreateError.code !== '23505') {
                    console.error('Error linking user to family:', memberCreateError);
                }
            }

            setFamilyId(resolvedFamilyId);
        } catch (error) {
            console.error('Error in fetchProfile:', error);
            setFamilyId(null);
        } finally {
            setLoading(false);
        }
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setFamilyId(null);
    };

    return (
        <AuthContext.Provider value={{ session, user, loading, profile, familyId, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
