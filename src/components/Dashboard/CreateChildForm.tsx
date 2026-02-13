import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/useAuth';

interface CreateChildFormProps {
    onChildCreated: () => void;
}

export default function CreateChildForm({ onChildCreated }: CreateChildFormProps) {
    const { familyId, user } = useAuth();
    const [name, setName] = useState('');
    const [ageGroup, setAgeGroup] = useState('K-2');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const resolveFamilyId = async () => {
        if (familyId) return familyId;
        if (!user) return null;

        // Ensure profile exists first so family/member inserts don't fail on FK constraints.
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert([{ id: user.id, email: user.email || null }], { onConflict: 'id' });

        if (profileError && profileError.code !== '23505') {
            console.error('Error ensuring profile:', profileError);
        }

        const { data: memberships, error: membershipError } = await supabase
            .from('family_members')
            .select('family_id')
            .eq('profile_id', user.id)
            .limit(1);

        if (membershipError) {
            console.error('Error fetching family membership:', membershipError);
        }

        if (memberships && memberships.length > 0) {
            return memberships[0].family_id;
        }

        const { data: ownedFamilies, error: ownedFamiliesError } = await supabase
            .from('families')
            .select('id')
            .eq('created_by', user.id)
            .limit(1);

        if (ownedFamiliesError) {
            console.error('Error fetching owned family:', ownedFamiliesError);
        }

        if (ownedFamilies && ownedFamilies.length > 0) {
            const existingFamilyId = ownedFamilies[0].id;
            const { error: linkError } = await supabase
                .from('family_members')
                .insert([{ family_id: existingFamilyId, profile_id: user.id, role: 'admin' }]);

            if (linkError && linkError.code !== '23505') {
                console.error('Error linking existing family:', linkError);
            }

            return existingFamilyId;
        }

        const familyName = user.email ? `${user.email.split('@')[0]}'s Family` : 'My Family';

        const { data: createdFamily, error: familyError } = await supabase
            .from('families')
            .insert([{ name: familyName, created_by: user.id }])
            .select('id')
            .single();

        if (familyError) {
            console.error('Error creating family:', familyError);
            return null;
        }

        const { error: memberError } = await supabase
            .from('family_members')
            .insert([{ family_id: createdFamily.id, profile_id: user.id, role: 'admin' }]);

        if (memberError && memberError.code !== '23505') {
            console.error('Error linking new family:', memberError);
        }

        return createdFamily.id;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        setLoading(true);
        setError(null);

        const targetFamilyId = await resolveFamilyId();
        if (!targetFamilyId) {
            setError('Account setup permissions are missing. Apply the latest Supabase migration, then try again.');
            setLoading(false);
            return;
        }

        const { error } = await supabase.from('child_profiles').insert([
            {
                family_id: targetFamilyId,
                name,
                age_group: ageGroup,
                pin_code: pin || null,
            },
        ]);

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            setLoading(false);
            setName('');
            setPin('');
            onChildCreated();
        }
    };

    return (
        <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Add a Child Profile</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Name
                    </label>
                    <input
                        type="text"
                        id="name"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
                    />
                </div>

                <div>
                    <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700">
                        Age Group
                    </label>
                    <select
                        id="ageGroup"
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
                    >
                        <option value="K-2">K-2 (approx 5-7)</option>
                        <option value="3-5">3-5 (approx 8-10)</option>
                        <option value="6-8">6-8 (approx 11-13)</option>
                        <option value="9-12">9-12 (approx 14-18)</option>
                    </select>
                </div>

                <div>
                    <label htmlFor="pin" className="block text-sm font-medium text-gray-700">
                        PIN (Optional)
                    </label>
                    <input
                        type="text"
                        id="pin"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        maxLength={4}
                        pattern="\d*"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-brand-blue focus:ring-brand-blue sm:text-sm"
                        placeholder="4-digit PIN"
                    />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    {loading ? 'Creating...' : 'Create Profile'}
                </button>
            </form>
        </div>
    );
}
