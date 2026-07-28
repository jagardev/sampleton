/**
 * upload.tsx
 * ----------
 * Provides the upload workflow for creating a new track.
 *
 * The page validates the selected audio file, pre-fills artist metadata from
 * the authenticated profile, and submits multipart form data to the API.
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import api from '../api/axios';

export const Upload = () => {
    const navigate = useNavigate();
    const { refreshTracks } = useOutletContext<any>();

    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState(''); 
    const [genre, setGenre] = useState('');
    const [audioFile, setAudioFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null); 
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    /** Redirects unauthenticated users and preloads the artist display name. */
    useEffect(() => {
        const token = localStorage.getItem('access');
        if (!token) navigate('/login');
        else {
            api.get('profile/me/', {
                headers: { 'Authorization': `Bearer ${token}` }
            }).then(response => {
                setArtist(response.data.display_name || response.data.username);
            }).catch(err => console.log(err));
        }
    }, [navigate]);

    /**
     * Validates that the selected file is an audio asset before storing it.
     */
    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.type.startsWith('audio/')) {
                setAudioFile(file);
                setError('');
            } else {
                setAudioFile(null);
                setError('Please select a valid audio file (.mp3, .wav).');
            }
        }
    };

    /** Stores the selected cover image file, if provided. */
    const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) setCoverFile(e.target.files[0]);
    };

    /**
     * Submits a new track payload as multipart form data.
     * Includes optional cover art when available.
     */
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        if (!audioFile) {
            setError('You must upload an audio file.');
            return;
        }
        setIsLoading(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('artist', artist);
            formData.append('genre', genre || 'Other');
            formData.append('audio_file', audioFile);
            if (coverFile) formData.append('cover_image', coverFile);

            const token = localStorage.getItem('access');
            await api.post('tracks/', formData, {
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data'}
            });
            alert('Sample uploaded successfully!');
            if (refreshTracks) await refreshTracks();
            navigate('/dashboard'); 
        } catch (err: any) {
            const apiError = err?.response?.data?.detail;
            setError(apiError || 'Failed to upload the sample. Please check your connection.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto p-8 mt-4">
            <h1 className="text-3xl font-bold mb-8 dark:text-zinc-100">Upload Sample</h1>
            {error && <p className="text-red-600 bg-red-100 p-3 rounded text-sm mb-6 border border-red-300 font-bold">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                <div className="relative border-2 border-dashed border-orange-200 dark:border-zinc-700 py-16 px-4 flex flex-col items-center justify-center bg-white dark:bg-zinc-800/50 hover:bg-orange-50/50 dark:hover:bg-zinc-800 transition-colors rounded-2xl cursor-pointer group">
                    {audioFile ? (
                        <div className="text-xl font-bold text-orange-500 flex flex-col items-center gap-2">
                            <span>✅ File selected:</span>
                            <span className="text-black dark:text-zinc-200">{audioFile.name}</span>
                        </div>
                    ) : (
                        <>
                            <div className="w-16 h-16 border-2 border-orange-400 text-orange-500 rounded-full flex items-center justify-center mb-6 bg-white dark:bg-zinc-900 group-hover:scale-110 shadow-sm group-hover:shadow-md transition-all"><span className="text-3xl font-light">↑</span></div>
                            <div className="h-4 bg-orange-100 dark:bg-zinc-700 w-64 mb-3 rounded-full"></div>
                            <div className="h-4 bg-orange-50 dark:bg-zinc-800 w-48 mb-8 rounded-full"></div>
                            <div className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-8 rounded-full text-sm cursor-pointer shadow-md transition-colors">Choose File</div>
                        </>
                    )}
                    <input type="file" accept="audio/*" onChange={handleAudioChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                </div>
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm dark:text-zinc-200">Sample Title *</label>
                        <input type="text" placeholder="Enter sample title" value={title} onChange={(e) => setTitle(e.target.value)} className="p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 transition-colors duration-300 dark:text-zinc-100" required/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm dark:text-zinc-200">Artist Name *</label>
                        <input type="text" placeholder="Auto-filled artist name" value={artist} readOnly className="p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-100 dark:bg-zinc-800 text-sm focus:outline-none transition-all dark:text-zinc-400 cursor-not-allowed" required/>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm dark:text-zinc-200">Genre *</label>
                        <select value={genre} onChange={(e) => setGenre(e.target.value)} className="p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900/50 text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:ring-0 transition-colors duration-300 appearance-none cursor-pointer dark:text-zinc-100" required>
                            <option value="" disabled>Select a genre</option>
                            <option value="Lo-Fi">Lo-Fi</option><option value="Electronic">Electronic</option>
                            <option value="Hip-Hop">Hip-Hop</option><option value="Rock">Rock</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="font-bold text-sm dark:text-zinc-200">Cover Image</label>
                        <div className="relative border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl w-32 h-32 flex items-center justify-center bg-gray-50 dark:bg-zinc-900/50 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:border-orange-300 transition-all cursor-pointer">
                            {coverFile ? <span className="text-xs font-bold text-center p-2 break-all text-orange-600">{coverFile.name}</span> : <span className="text-gray-400 dark:text-zinc-500 text-sm">Upload</span>}
                            <input type="file" accept="image/*" onChange={handleCoverChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                        </div>
                    </div>
                </div>
                <div className="pt-4 pb-12 flex justify-end">
                    <button type="submit" disabled={isLoading} className={`bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl font-bold py-3 px-8 text-sm transition-all shadow-md ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-lg'}`}>
                        {isLoading ? 'Uploading...' : 'Publish Sample'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default Upload;