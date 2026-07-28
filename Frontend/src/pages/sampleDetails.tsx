/**
 * sampleDetails.tsx
 * -----------------
 * Renders the detail view for a single sample.
 *
 * The page combines metadata, comments, and likes, and exposes interaction
 * flows for playback, sharing, commenting, and playlist assignment.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import api from '../api/axios';

type ContextType = {
    tracks: any[];
    handlePlayTrack: (track: any) => void;
    currentTrack: any;
    isPlaying: boolean;
    openPlaylistModal: (track: any) => void;
    refreshTracks: () => void;
};

export const SampleDetails = () => {
    const { id } = useParams(); 
    const navigate = useNavigate();
    const { handlePlayTrack, currentTrack, isPlaying, openPlaylistModal, refreshTracks } = useOutletContext<ContextType>();

    const [track, setTrack] = useState<any>(null);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    /** State variables for the like system and the share dropdown. */
    const [likes, setLikes] = useState<any[]>([]);
    const [myUserId, setMyUserId] = useState<number | null>(null);
    const [isShareOpen, setIsShareOpen] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** Updates the sample cover image for the owner. */
    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const token = localStorage.getItem('access');
            const formData = new FormData();
            formData.append('cover_image', file);
            try {
                const res = await api.patch(`tracks/${id}/`, formData, {
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' }
                });
                setTrack(res.data);
                if (refreshTracks) refreshTracks();
            } catch (err) {
                console.error('Error updating cover', err);
            }
        }
    };

    /** Fetches sample metadata, comments, likes, and current user context. */
    useEffect(() => {
        const fetchDetails = async () => {
            try {
                const trackRes = await api.get(`tracks/${id}/`);
                setTrack(trackRes.data);

                // Fetch comments filtered by the current track ID.
                const commentsRes = await api.get(`comments/?track=${id}`);
                setComments(commentsRes.data);

                const likesRes = await api.get(`likes/?track=${id}`);
                setLikes(likesRes.data);

                const token = localStorage.getItem('access');
                if (token) {
                    try {
                        const profileResponse = await api.get('profile/me/', { headers: { 'Authorization': `Bearer ${token}` } });
                        setMyUserId(profileResponse.data.user);
                    } catch (e) {
                        // ignore fetch profile errors
                    }
                }
            } catch (error) {
                console.error("Failed to load sample", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchDetails();
    }, [id]);

    /** Submits a new comment for the current sample. */
    const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const token = localStorage.getItem('access');
        if (!token) {
            alert("You must log in to comment.");
            navigate('/login');
            return;
        }

        try {
            const res = await api.post(`comments/`, 
                { 
                    content: newComment,
                    track: id 
                }, 
                { headers: { 'Authorization': `Bearer ${token}` }}
            );
            
            setComments([res.data, ...comments]);
            setNewComment('');
        } catch (error) {
            alert("Failed to post comment.");
            console.error(error);
        }
    };

    /** Toggles the authenticated user's like state for this sample. */
    const handleLike = async () => {
        const token = localStorage.getItem('access');
        if (!token) {
            alert('You must log in to like tracks.');
            navigate('/login');
            return;
        }
        const myLike = likes.find(l => l.user === myUserId);
        try {
            if (myLike) {
                // Remove the existing like.
                await api.delete(`likes/${myLike.id}/`, { headers: { 'Authorization': `Bearer ${token}` } });
                setLikes(likes.filter(l => l.id !== myLike.id));
            } else {
                // Add a new like.
                if (track) {
                    const res = await api.post('likes/', { track: track.id }, { headers: { 'Authorization': `Bearer ${token}` } });
                    setLikes([...likes, res.data]);
                }
            }
        } catch (error) {
            console.error('Error toggling like', error);
        }
    };

    if (isLoading) return <div className="p-8 font-bold text-center">Loading sample...</div>;
    if (!track) return <div className="p-8 font-bold text-red-500 text-center">Sample not found.</div>;

    // Generate random bar heights to simulate a static waveform visualisation.
    const waveformBars = Array.from({ length: 60 }).map(() => Math.floor(Math.random() * 80) + 20);

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col pb-32 pt-8">
            
            {/* Upper section: cover image, waveform visualiser, and action buttons */}
            <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                
                {/* Cover image (left column) */}
                <div 
                    onClick={() => {
                        if (myUserId === track.user) {
                            fileInputRef.current?.click();
                        }
                    }}
                    className={`w-64 h-64 mx-auto md:mx-0 bg-gray-200 dark:bg-zinc-800 border border-gray-400 dark:border-zinc-700 flex-shrink-0 relative overflow-hidden shadow-sm ${myUserId === track.user ? 'cursor-pointer group' : ''}`}
                >
                    {track.cover_image ? (
                        <img src={track.cover_image} alt={track.title} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" />
                    ) : (
                        <span className="w-full h-full flex items-center justify-center text-6xl opacity-30">🎵</span>
                    )}
                    
                    {/* Edit cover overlay, visible only to the track owner */}
                    {myUserId === track.user && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                            <span className="text-white font-bold text-lg drop-shadow-md bg-black/50 px-4 py-2 rounded-full border border-white/20">Edit Cover</span>
                        </div>
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleCoverChange} className="hidden" />
                </div>

                {/* Track details (right column) */}
                <div className="flex-1 flex flex-col w-full text-center md:text-left">
                    <div className="mb-4 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-0">
                        <div>
                            <h1 className="text-3xl md:text-4xl font-extrabold mb-1 text-gray-800 dark:text-zinc-100">{track.title}</h1>
                            <p className="text-lg text-orange-500 font-bold">{track.artist}</p>
                        </div>
                        <button 
                            onClick={() => handlePlayTrack(track)}
                            className="w-16 h-16 bg-gradient-to-r from-orange-500 to-yellow-500 rounded-full flex items-center justify-center text-white text-3xl shadow-lg hover:scale-110 transition-transform flex-shrink-0"
                            title={(currentTrack?.id === track.id && isPlaying) ? 'Pause' : 'Play'}
                        >
                            {(currentTrack?.id === track.id && isPlaying) ? (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                            )}
                        </button>
                    </div>

                    {/* Static waveform visualiser that doubles as a play button */}
                    <div className="w-full h-24 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg flex items-center justify-between px-2 mb-6 cursor-pointer hover:bg-orange-50/50 dark:hover:bg-zinc-700 hover:border-orange-300 transition-all shadow-inner" onClick={() => handlePlayTrack(track)}>
                        {waveformBars.map((height, i) => (
                            <div 
                                key={i} 
                                className={`w-1.5 rounded-full transition-all ${
                                    (currentTrack?.id === track.id && isPlaying) ? 'bg-gradient-to-t from-orange-500 to-yellow-500 animate-pulse' : 'bg-gray-300 dark:bg-zinc-600'
                                }`}
                                style={{ height: `${height}%` }}
                            ></div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                            <button 
                                onClick={handleLike}
                                className={`w-12 h-12 flex items-center justify-center rounded-full text-2xl transition-all shadow-sm ${
                                    likes.find(l => l.user === myUserId) 
                                    ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-500 border-2 border-orange-300 hover:bg-orange-100 hover:scale-110' 
                                    : 'bg-white dark:bg-zinc-800 border-2 border-gray-200 dark:border-zinc-700 text-gray-400 dark:text-zinc-500 hover:bg-orange-50 dark:hover:bg-zinc-700 hover:text-orange-500 dark:hover:text-orange-400 hover:border-orange-300 hover:scale-110'
                                }`}
                                title={likes.find(l => l.user === myUserId) ? 'Unlike' : 'Like'}
                            >
                                {likes.find(l => l.user === myUserId) ? '♥' : '♡'}
                            </button>
                            <span className="font-bold text-gray-700 dark:text-zinc-300 mr-2">{likes.length} likes</span>
                            <button 
                                onClick={() => openPlaylistModal(track)}
                                className="border-2 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-300 transition-all shadow-sm"
                            >
                                + Add to Playlist
                            </button>
                            
                            <div className="relative">
                                <button onClick={() => setIsShareOpen(!isShareOpen)} className="border-2 border-gray-200 dark:border-zinc-700 text-gray-800 dark:text-zinc-200 px-5 py-2 rounded-full text-sm font-bold flex items-center gap-2 hover:bg-orange-50 dark:hover:bg-zinc-800 hover:text-orange-600 hover:border-orange-300 dark:hover:text-orange-500 dark:hover:border-orange-500 transition-all shadow-sm">
                                    ➦ Share
                                </button>
                                {isShareOpen && (
                                    <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-700 rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
                                        <button onClick={() => {
                                            navigator.clipboard.writeText(window.location.href);
                                            alert('Link copied to clipboard!');
                                            setIsShareOpen(false);
                                        }} className="px-4 py-3 text-left text-sm font-bold text-gray-700 dark:text-zinc-200 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-zinc-800 transition-colors">
                                            Copy Link
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs font-bold text-gray-500 dark:text-zinc-400">
                        </div>
                    </div>
                </div>
            </div>

            <hr className="border-t border-black dark:border-zinc-700 mb-10 opacity-20 dark:opacity-100" />

            {/* Lower section: comments */}
            <div className="flex flex-col gap-8">
                <h2 className="text-2xl font-bold">Comments</h2>

                <div className="flex gap-4 items-start">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full border border-gray-400 dark:border-zinc-700 flex-shrink-0 flex items-center justify-center text-xl font-bold text-gray-500 dark:text-zinc-400">
                        {localStorage.getItem('username')?.charAt(0).toUpperCase() || '👤'}
                    </div>
                    <form onSubmit={handlePostComment} className="flex-1 flex flex-col sm:flex-row gap-2">
                        <input 
                            type="text" 
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            placeholder="Write a comment..." 
                            className="flex-1 bg-gray-50 dark:bg-zinc-800/50 border-2 border-gray-200 dark:border-zinc-700 rounded-xl p-3 text-sm focus:outline-none focus:border-orange-500 dark:focus:border-orange-500 focus:bg-white dark:focus:bg-zinc-900 focus:ring-0 transition-colors duration-300 dark:text-zinc-100"
                        />
                        <button type="submit" className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white px-8 py-3 sm:py-0 rounded-xl font-bold text-sm hover:shadow-lg hover:scale-105 transition-all">
                            Post
                        </button>
                    </form>
                </div>

                <div className="flex flex-col gap-6 mt-4">
                    {comments.length === 0 ? (
                        <p className="text-gray-500 dark:text-zinc-500 italic">Be the first to comment!</p>
                    ) : (
                        comments.map((comment, index) => (
                            <div key={`comment-${comment.id || index}`} className="flex gap-4">
                                <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full border border-gray-400 dark:border-zinc-700 flex-shrink-0 flex items-center justify-center text-gray-500 dark:text-zinc-500 font-bold">
                                    {comment.username?.charAt(0).toUpperCase() || '?'}
                                </div>
                                <div className="flex flex-col flex-1 pb-4 border-b border-gray-200 dark:border-zinc-800">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-sm dark:text-zinc-200">{comment.username || 'User'}</span>
                                        <span className="text-xs text-gray-400 dark:text-zinc-500">🕒 at {comment.posted_at ? new Date(comment.posted_at).toLocaleTimeString() : 'now'}</span>
                                    </div>
                                    <p className="text-sm text-gray-800 dark:text-zinc-300">{comment.content}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

        </div>
    );
};

export default SampleDetails;