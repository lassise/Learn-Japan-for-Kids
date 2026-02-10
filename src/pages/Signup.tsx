import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';

export default function Signup() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // 1. Sign up the user
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        if (authData.user) {
            // 2. Create the profile (handled by trigger ideally, but we can do it manually if trigger fails or for v1)
            // Actually, we'll let the user sign in and then create profile if missing, or use a trigger.
            // For now, let's assume successful signup redirects or logs them in.

            // We should check if they have a profile, if not create one.
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([{ id: authData.user.id, email: authData.user.email }]);

            if (profileError) {
                // Ignore "duplicate key" error if it's already there from trigger
                if (profileError.code !== '23505') {
                    console.error('Error creating profile:', profileError);
                }
            }

            // 3. Create a default Family
            const { data: familyData, error: familyError } = await supabase
                .from('families')
                .insert([{
                    name: `${email.split('@')[0]}'s Family`,
                    created_by: authData.user.id
                }])
                .select()
                .single();

            if (familyError) {
                console.error('Error creating family:', familyError);
            } else if (familyData) {
                // 4. Add user to family_members
                const { error: memberError } = await supabase
                    .from('family_members')
                    .insert([{
                        family_id: familyData.id,
                        profile_id: authData.user.id,
                        role: 'admin'
                    }]);

                if (memberError) console.error('Error adding to family_members:', memberError);
            }

            navigate('/');
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div>
                    <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                        Create a Parent Account
                    </h2>
                    <p className="mt-2 text-center text-sm text-gray-600">
                        Or{' '}
                        <Link to="/login" className="font-medium text-brand-blue hover:text-brand-blue/80">
                            sign in to existing account
                        </Link>
                    </p>
                </div>
                <form className="mt-8 space-y-6" onSubmit={handleSignup}>
                    <div className="-space-y-px rounded-md shadow-sm">
                        <div>
                            <label htmlFor="email-address" className="sr-only">
                                Email address
                            </label>
                            <input
                                id="email-address"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                className="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-blue focus:outline-none focus:ring-brand-blue sm:text-sm"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="sr-only">
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                className="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-brand-blue focus:outline-none focus:ring-brand-blue sm:text-sm"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="group relative flex w-full justify-center rounded-md border border-transparent bg-brand-blue px-4 py-2 text-sm font-medium text-white hover:bg-brand-blue/90 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:ring-offset-2"
                        >
                            {loading ? 'Creating account...' : 'Sign up'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
