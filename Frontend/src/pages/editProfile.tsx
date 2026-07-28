/**
 * editProfile.tsx
 * ---------------
 * Provides a form for the authenticated user to update their profile information.
 *
 * On mount the component fetches the current profile and pre-populates all
 * editable fields. Username and email are shown as read-only. A temporary
 * object URL is generated for the avatar preview so the user can see the
 * result before saving.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

export const EditProfile = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    /** Holds the current values of all editable fields in the form. */
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        display_name: '',
        bio: '',
        location: '',
        avatar_file: null as string | null
    });

    /** Holds the File object for the new avatar, if the user has selected one. */
    const [newAvatar, setNewAvatar] = useState<File | null>(null);

    /**
     * Fetches the authenticated user's profile on component mount.
     * Redirects to login if no access token is present.
     */
    useEffect(() => {
        const fetchProfile = async () => {
            const token = localStorage.getItem('access');
            if (!token) { navigate('/login'); return; }
            try {
                const response = await api.get('profile/me/', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setFormData({
                    username: response.data.username,
                    email: response.data.email,
                    display_name: response.data.display_name || '',
                    bio: response.data.bio || '',
                    location: response.data.location || '',
                    avatar_file: response.data.avatar_file
                });
            } catch (err) {
                console.error("Error loading profile", err);
                setError('Could not load profile data.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [navigate]);

    /**
     * Stores the selected avatar file and generates a temporary preview URL.
     * @param e - The change event from the file input element.
     */
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setNewAvatar(e.target.files[0]);
            setFormData({ ...formData, avatar_file: URL.createObjectURL(e.target.files[0]) });
        }
    };

    /**
     * Submits the updated profile data via a PATCH request.
     * The avatar file is only included when the user has selected a new one.
     * A success message is shown for three seconds after a successful save.
     * @param e - The form submission event.
     */
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess(false);
        try {
            const submitData = new FormData();
            submitData.append('display_name', formData.display_name);
            submitData.append('bio', formData.bio);
            submitData.append('location', formData.location);
            if (newAvatar) submitData.append('avatar_file', newAvatar);
            const token = localStorage.getItem('access');
            await api.patch('profile/me/', submitData, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
            });
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err: any) {
            console.error(err);
            const apiMessage = err?.response?.data?.detail || "Could not save changes.";
            setError(apiMessage);
        }
    };

    if (isLoading) return <div className="p-8 text-center font-bold">Loading profile...</div>;

    const isDemoAccount = formData.username === 'demo';

    return (
        <div className="w-full max-w-3xl mx-auto p-8 relative">
            <button onClick={() => navigate('/')} className="absolute top-8 right-8 border-2 border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 w-10 h-10 rounded-full flex items-center justify-center hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-300 transition-all font-bold shadow-sm">✕</button>
            <h1 className="text-3xl font-extrabold mb-4 text-gray-800 dark:text-zinc-100">Edit Profile</h1>
            
            {isDemoAccount && (
                <div className="bg-orange-50 dark:bg-zinc-800/80 border border-orange-200 dark:border-zinc-700 rounded-xl p-4 mb-6 flex items-center gap-3 text-sm font-semibold text-orange-700 dark:text-orange-400 shadow-sm">
                    <span className="text-lg">ℹ️</span>
                    <span>The demo account profile is protected in public showcase mode to maintain a consistent review experience for everyone.</span>
                </div>
            )}

            {error && <p className="text-red-600 bg-red-100 p-3 mb-6 border border-red-300 font-bold rounded-xl">{error}</p>}
            {success && <p className="text-green-700 bg-green-100 p-3 mb-6 border border-green-300 font-bold rounded-xl">Profile updated successfully.</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-10">
                {/* Profile picture section */}
                <div className="flex items-center gap-8">
                    <div className="w-32 h-32 bg-orange-50/50 dark:bg-zinc-800 rounded-full flex-shrink-0 border-2 border-orange-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center relative shadow-inner">
                        {formData.avatar_file ? (<img src={formData.avatar_file} alt="Avatar" className="w-full h-full object-cover" />) : (<span className="text-4xl text-gray-400 dark:text-zinc-500">👤</span>)}
                        <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Change profile picture" />
                    </div>
                    <div className="flex flex-col gap-3">
                        <span className="font-bold text-sm dark:text-zinc-200">Profile Picture</span>
                        <div className="flex items-center gap-4">
                            <div className="relative border-2 border-orange-500 text-orange-500 rounded-full px-5 py-2 text-sm font-bold hover:bg-gradient-to-r hover:from-orange-500 hover:to-yellow-500 hover:text-white hover:border-transparent transition-all shadow-sm cursor-pointer">
                                Upload New Photo
                                <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                            </div>
                        </div>
                    </div>
                </div>
                {/* Editable text fields */}
                <div className="border border-gray-200 dark:border-zinc-700 rounded-2xl shadow-sm p-8 flex flex-col gap-6 bg-white dark:bg-zinc-800">
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm text-gray-500 dark:text-zinc-400">Username (Cannot be changed)</label>
                        <input type="text" value={formData.username} disabled className="p-3 bg-gray-200 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-sm cursor-not-allowed text-gray-500 dark:text-zinc-500"/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm text-gray-500 dark:text-zinc-400">Email (Cannot be changed)</label>
                        <input type="email" value={formData.email} disabled className="p-3 bg-gray-200 dark:bg-zinc-900 border border-gray-300 dark:border-zinc-700 text-sm cursor-not-allowed text-gray-500 dark:text-zinc-500"/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm dark:text-zinc-200">Display Name</label>
                        <input type="text" value={formData.display_name} onChange={(e) => setFormData({...formData, display_name: e.target.value})} placeholder="Enter display name" className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 transition-colors duration-300 text-gray-800 dark:text-zinc-100" />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm dark:text-zinc-200">Bio</label>
                        <textarea value={formData.bio} onChange={(e) => setFormData({...formData, bio: e.target.value})} placeholder="Tell us about yourself..." rows={4} className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 transition-colors duration-300 text-gray-800 dark:text-zinc-100 resize-none"></textarea>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm dark:text-zinc-200">Location</label>
                        <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} placeholder="e.g. Madrid, Spain" className="p-3 bg-gray-50 dark:bg-zinc-900/50 border border-gray-300 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 transition-colors duration-300 dark:text-zinc-100" />
                    </div>
                </div>
                {/* Save button */}
                <div className="flex justify-end pb-12">
                    <button type="submit" className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl px-10 py-3 font-bold hover:scale-105 hover:shadow-lg transition-all shadow-md">Save Changes</button>
                </div>
            </form>
        </div>
    );
};

export default EditProfile;