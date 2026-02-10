import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import ChildSelector from '../components/Dashboard/ChildSelector';
import CreateChildForm from '../components/Dashboard/CreateChildForm';
import ChildDashboard from '../components/Dashboard/ChildDashboard';

export default function Dashboard() {
    const { familyId, user, loading: authLoading, signOut } = useAuth();
    const navigate = useNavigate();
    const [children, setChildren] = useState<any[]>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const [loadingChildren, setLoadingChildren] = useState(true);
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (authLoading) {
            setLoadingChildren(true);
            return;
        }

        fetchChildren();
    }, [familyId, user?.id, authLoading]);

    const fetchChildren = async () => {
        setLoadingChildren(true);

        let familyIds: string[] = [];

        if (familyId) {
            familyIds = [familyId];
        } else if (user?.id) {
            const { data: memberships, error: memberError } = await supabase
                .from('family_members')
                .select('family_id')
                .eq('profile_id', user.id);

            if (memberError) {
                console.error('Error fetching family memberships:', memberError);
            }

            familyIds = (memberships || []).map((m: any) => m.family_id);

            if (familyIds.length === 0) {
                const { data: ownedFamilies, error: ownedFamiliesError } = await supabase
                    .from('families')
                    .select('id')
                    .eq('created_by', user.id);

                if (ownedFamiliesError) {
                    console.error('Error fetching owned families:', ownedFamiliesError);
                }

                familyIds = (ownedFamilies || []).map((f: any) => f.id);
            }
        }

        if (familyIds.length === 0) {
            setChildren([]);
            setLoadingChildren(false);
            return;
        }

        const { data, error } = await supabase
            .from('child_profiles')
            .select('*')
            .in('family_id', familyIds)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Error fetching children:', error);
        } else {
            setChildren(data || []);
        }
        setLoadingChildren(false);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    const handleChildCreated = () => {
        setIsCreating(false);
        fetchChildren();
    };

    if (selectedChildId) {
        return <ChildDashboard childId={selectedChildId} onExit={() => setSelectedChildId(null)} />;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 justify-between">
                        <div className="flex">
                            <div className="flex flex-shrink-0 items-center">
                                <span className="text-xl font-bold text-brand-blue">TripLearn</span>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {/* Parent Admin Link - Placeholder */}
                            <button
                                onClick={() => navigate('/parent-admin')}
                                className="text-sm font-medium text-gray-500 hover:text-gray-900"
                            >
                                Parent Settings
                            </button>
                            <button
                                onClick={handleSignOut}
                                className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
                            >
                                Sign out
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    {authLoading || loadingChildren ? (
                        <div className="flex justify-center p-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-t-transparent"></div>
                        </div>
                    ) : isCreating ? (
                        <div className="mx-auto max-w-md">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="mb-4 text-sm text-gray-500 hover:text-gray-700"
                            >
                                &larr; Back to selection
                            </button>
                            <CreateChildForm onChildCreated={handleChildCreated} />
                        </div>
                    ) : children.length === 0 ? (
                        <div className="mx-auto max-w-md text-center">
                            <h2 className="text-xl font-bold text-gray-900">Welcome to TripLearn!</h2>
                            <p className="mt-2 text-gray-600">To get started, create a profile for your child.</p>
                            <div className="mt-6">
                                <CreateChildForm onChildCreated={handleChildCreated} />
                            </div>
                        </div>
                    ) : (
                        <ChildSelector
                            childrenProfiles={children}
                            onSelect={setSelectedChildId}
                            onCreateNew={() => setIsCreating(true)}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
