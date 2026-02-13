import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function InternalAdmin() {
    const [countries, setCountries] = useState<{ id: string, name: string }[]>([]);
    const [selectedCountryId, setSelectedCountryId] = useState<string | null>(null);
    const [lessons, setLessons] = useState<{ id: string, title: string, description: string }[]>([]);
    const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
    const [activities, setActivities] = useState<{ id: string, question_text: string, type: string, options: any }[]>([]);

    // Forms
    const [isAddingActivity, setIsAddingActivity] = useState(false);
    const [newActivityQuestion, setNewActivityQuestion] = useState('');

    async function fetchCountries() {
        const { data } = await supabase.from('countries').select('*');
        setCountries(data || []);
    }

    async function fetchLessons(countryId: string) {
        // Find v1 version ID for this country
        const { data: v1 } = await supabase
            .from('country_versions')
            .select('id')
            .eq('country_id', countryId)
            .eq('version_number', 1)
            .single();

        if (!v1) return;

        const { data } = await supabase
            .from('lessons')
            .select(`
                *,
                levels!inner (
                    title,
                    branches!inner (
                        country_version_id
                    )
                )
            `)
            .eq('levels.branches.country_version_id', v1.id)
            .order('title');

        setLessons(data || []);
    }

    async function fetchActivities(lessonId: string) {
        const { data } = await supabase
            .from('activities')
            .select('*')
            .eq('lesson_id', lessonId)
            .order('order_index');
        setActivities(data || []);
    }

    useEffect(() => {
        fetchCountries();
    }, []);

    useEffect(() => {
        if (selectedCountryId) {
            fetchLessons(selectedCountryId);
            setSelectedLessonId(null);
        }
    }, [selectedCountryId]);

    useEffect(() => {
        if (selectedLessonId) fetchActivities(selectedLessonId);
    }, [selectedLessonId]);

    const handleAddActivity = async () => {
        if (!selectedLessonId) return;

        const newOrder = activities.length + 1;
        const { error } = await supabase.from('activities').insert({
            lesson_id: selectedLessonId,
            type: 'info', // Defaulting to info for simplicity
            question_text: newActivityQuestion,
            order_index: newOrder,
        });

        if (error) {
            alert('Error creating activity: ' + error.message);
        } else {
            setNewActivityQuestion('');
            setIsAddingActivity(false);
            fetchActivities(selectedLessonId);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <h1 className="mb-8 text-3xl font-bold text-gray-900">TripLearn Content Admin</h1>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
                {/* Sidebar: Countries */}
                <div className="rounded-lg bg-white p-6 shadow">
                    <h2 className="mb-4 text-xl font-bold">Countries</h2>
                    <ul className="space-y-2">
                        {countries.map(c => (
                            <li key={c.id}>
                                <button
                                    onClick={() => setSelectedCountryId(c.id)}
                                    className={`w-full rounded p-2 text-left ${selectedCountryId === c.id ? 'bg-brand-blue text-white' : 'hover:bg-gray-50'}`}
                                >
                                    {c.name}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Main Content: Lessons */}
                <div className="col-span-3 space-y-8">
                    {/* Lessons List */}
                    <div className="rounded-lg bg-white p-6 shadow">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold">Lessons</h2>
                            {selectedCountryId && (
                                <button
                                    onClick={() => alert('Not implemented in MVP')}
                                    className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
                                >
                                    + New Lesson
                                </button>
                            )}
                        </div>

                        {selectedCountryId ? (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {lessons.map(lesson => (
                                    <div
                                        key={lesson.id}
                                        onClick={() => setSelectedLessonId(lesson.id)}
                                        className={`cursor-pointer rounded border p-4 hover:bg-brand-blue/5 ${selectedLessonId === lesson.id ? 'border-brand-blue ring-1 ring-brand-blue' : 'border-gray-200'}`}
                                    >
                                        <h3 className="font-bold text-gray-900">{lesson.title}</h3>
                                        <p className="text-sm text-gray-600">{lesson.description}</p>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-500">Select a country to view lessons.</p>
                        )}
                    </div>

                    {/* Activities Editor (if lesson selected) */}
                    {selectedLessonId && (
                        <div className="rounded-lg bg-white p-6 shadow">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="text-xl font-bold">Activities</h2>
                                <button
                                    onClick={() => setIsAddingActivity(true)}
                                    className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                                >
                                    + Add Info Slide
                                </button>
                            </div>

                            <div className="space-y-4">
                                {activities.map((activity, index) => (
                                    <div key={activity.id} className="flex items-start space-x-4 rounded bg-gray-50 p-4">
                                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-xs font-bold text-gray-600">
                                            {index + 1}
                                        </span>
                                        <div>
                                            <span className="mb-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 uppercase">
                                                {activity.type}
                                            </span>
                                            <p className="text-gray-900">{activity.question_text}</p>
                                        </div>
                                    </div>
                                ))}
                                {activities.length === 0 && <p className="text-gray-500">No activities yet.</p>}
                            </div>

                            {isAddingActivity && (
                                <div className="mt-6 rounded border border-gray-200 bg-gray-50 p-4">
                                    <h3 className="mb-2 font-bold text-gray-900">New Info Slide</h3>
                                    <input
                                        type="text"
                                        value={newActivityQuestion}
                                        onChange={(e) => setNewActivityQuestion(e.target.value)}
                                        placeholder="Enter content/text..."
                                        className="mb-2 w-full rounded border p-2"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={() => setIsAddingActivity(false)}
                                            className="px-4 py-2 text-gray-600"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleAddActivity}
                                            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
