/**
 * playlistPage.tsx
 * ----------------
 * Displays a playlist detail page with playback and management actions.
 *
 * The page resolves playlist metadata, enriches track IDs with full track
 * objects, and allows owners to edit cover art and remove tracks.
 */
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useOutletContext } from 'react-router-dom';
import api from '../api/axios';

type ContextType = {
    tracks: any[];
    handlePlayTrack: (track: any) => void;
    currentTrack: any;
    isPlaying: boolean;
};

const TrackDuration = ({ audioUrl }: { audioUrl: string }) => {
    const [duration, setDuration] = useState<string>('--:--');

    /** Loads metadata from the audio source to derive track duration text. */
    useEffect(() => {
        if (!audioUrl) return;
        const audio = new Audio(audioUrl);
        audio.onloadedmetadata = () => {
            const mins = Math.floor(audio.duration / 60);
            const secs = Math.floor(audio.duration % 60).toString().padStart(2, '0');
            setDuration(`${mins}:${secs}`);
        };
    }, [audioUrl]);

    return <span>{duration}</span>;
};

export const PlaylistPage = () => {
    const { id } = useParams(); // Reads the playlist ID from the URL (e.g. /playlist/1 -> id=1)
    const { tracks, handlePlayTrack, currentTrack, isPlaying } = useOutletContext<ContextType>();

    const [playlist, setPlaylist] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [myUserId, setMyUserId] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    /** Updates the playlist cover image when the owner selects a new file. */
    const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const token = localStorage.getItem('access');
            const formData = new FormData();
            formData.append('cover_image', file);
            try {
                const res = await api.patch(`playlists/${id}/`, formData, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPlaylist((prev: any) => ({ ...prev, cover_image: res.data.cover_image }));
            } catch (err) {
                console.error('Error updating cover', err);
            }
        }
    };

    /** Retrieves playlist data and resolves the currently authenticated user. */
    useEffect(() => {
        const fetchPlaylist = async () => {
            const token = localStorage.getItem('access');
            
            try {
                // Send the token in the Authorization header to authenticate the request.
                const response = await api.get(`playlists/${id}/`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setPlaylist(response.data);

                if (token) {
                    try {
                        const profileRes = await api.get('profile/me/', { headers: { 'Authorization': `Bearer ${token}` } });
                        setMyUserId(profileRes.data.user);
                    } catch (_) {}
                }
            } catch (error) {
                console.error("Failed to load playlist", error);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) fetchPlaylist();
    }, [id]);

    if (isLoading) return <div className="p-8 font-bold">Loading playlist...</div>;
    if (!playlist) return <div className="p-8 font-bold text-red-500">Playlist not found.</div>;

    // Cross-reference the playlist's track ID list with the full track objects held in memory.
    const playlistTracks = playlist.tracks && Array.isArray(playlist.tracks)
        ? Array.from(new Set(playlist.tracks)).map((tid: any) => tracks.find(t => t.id === tid)).filter(Boolean)
        : [];

    /** Removes a track from the playlist after user confirmation. */
    const handleRemoveTrack = async (trackIdToRemove: number) => {
        if (!window.confirm("Are you sure you want to remove this track from the playlist?")) return;
        try {
            const token = localStorage.getItem('access');
            const newTracks = playlist.tracks.filter((tid: number) => tid !== trackIdToRemove);
            
            await api.patch(`playlists/${id}/`, { tracks: newTracks }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update the local playlist state to reflect the removal immediately.
            setPlaylist({ ...playlist, tracks: newTracks });
        } catch (error) {
            console.error("Failed to remove track", error);
            alert("Could not remove the track. Please verify your permissions.");
        }
    };

    const isOwner = myUserId !== null && myUserId === playlist?.user;

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col pb-24">
            
            {/* Playlist header: cover image and metadata */}
            <div className="flex flex-col md:flex-row items-center md:items-end text-center md:text-left gap-6 md:gap-8 mb-8 md:mb-12 mt-4 md:mt-8 px-4">
                {/* Large cover image square */}
                <div
                    className={`w-56 h-56 bg-gradient-to-br from-orange-100 to-yellow-100 dark:from-zinc-800 dark:to-zinc-700 border-2 border-orange-200 dark:border-zinc-600 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-orange-100/50 dark:shadow-none relative overflow-hidden ${isOwner ? 'cursor-pointer group' : ''}`}
                    onClick={() => isOwner && fileInputRef.current?.click()}
                >
                    {playlist.cover_image ? (
                        <img src={playlist.cover_image} className="w-full h-full object-cover transition-opacity group-hover:opacity-80" />
                    ) : (
                        <span className="text-7xl opacity-50 drop-shadow-sm">💿</span>
                    )}
                    {isOwner && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
                            <span className="text-white font-bold text-lg drop-shadow-md bg-black/50 px-4 py-2 rounded-full border border-white/20">Edit Cover</span>
                        </div>
                    )}
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleCoverChange} className="hidden" />
                </div>
                
                <div className="flex flex-col gap-4 flex-1">
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Playlist</p>
                    <h1 className="text-6xl font-extrabold text-gray-800 dark:text-zinc-100 tracking-tight">{playlist.title}</h1>
                    <p className="text-sm font-bold text-gray-500 dark:text-zinc-400">
                        {playlistTracks.length} tracks • {playlist.is_public ? 'Public' : 'Private'}
                    </p>
                    
                    {/* Action buttons */}
                    <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                        <button 
                            onClick={() => { if (playlistTracks.length > 0) handlePlayTrack(playlistTracks[0]); }}
                            className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-full px-8 py-3 font-bold flex items-center gap-2 hover:scale-105 hover:shadow-lg transition-all shadow-md">
                            <div className="flex items-center gap-2">
                                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                                <span>Play All</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Track list table */}
            <div className="flex flex-col w-full">
                {/* Table header row */}
                <div className="flex items-center text-xs font-bold text-gray-500 dark:text-zinc-400 border-y border-gray-300 dark:border-zinc-700 py-2 px-4 uppercase tracking-wider mb-2">
                    <div className="hidden sm:block w-8">#</div>
                    <div className="flex-1">Title</div>
                    <div className="hidden md:block w-1/3">Artist</div>
                    <div className="w-20 md:w-24 text-right">⏱ <span className="hidden sm:inline">Duration</span></div>
                </div>

                {/* Track rows */}
                {playlistTracks.length === 0 ? (
                    <div className="py-8 text-center text-gray-500 dark:text-zinc-500 italic">
                        This playlist is empty.
                    </div>
                ) : (
                    playlistTracks.map((track: any, index: number) => (
                        <div 
                            key={`pt-${track.id}`} 
                            onClick={() => handlePlayTrack(track)}
                            className="flex items-center text-sm py-3 px-4 border-b border-gray-100 dark:border-zinc-800 hover:bg-orange-50/50 dark:hover:bg-zinc-800/80 transition-all cursor-pointer group"
                        >
                            {/* Row number that turns into a play icon on hover */}
                            <div className="hidden sm:block w-8 text-gray-500 font-medium group-hover:text-orange-500 transition-colors">
                                <span className="group-hover:hidden">{index + 1}</span>
                                <span className="hidden group-hover:inline text-orange-500 font-bold">
                                    {(currentTrack?.id === track.id && isPlaying) ? (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 inline-block -mt-1"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 inline-block ml-0.5 -mt-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                                    )}
                                </span>
                            </div>
                            
                            {/* Track title with thumbnail */}
                            <div className="flex-1 flex items-center gap-3 pr-2 md:pr-4">
                                <div className="w-10 h-10 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-md flex-shrink-0 overflow-hidden shadow-sm">
                                    {track.cover_image ? (
                                        <img src={track.cover_image} alt="cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="flex items-center justify-center w-full h-full text-xs opacity-50">🎵</span>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold truncate group-hover:text-orange-600 dark:text-zinc-200 transition-colors text-sm">{track.title}</span>
                                    <span className="md:hidden text-xs text-gray-500 truncate">{track.artist}</span>
                                </div>
                            </div>
                            
                            {/* Artist name column, hidden on small screens */}
                            <div className="hidden md:block w-1/3 text-gray-600 dark:text-zinc-400 truncate pr-4">{track.artist}</div>
                            
                            {/* Track duration column */}
                            <div className="w-20 md:w-24 text-right text-gray-500 dark:text-zinc-400 font-medium text-xs md:text-sm">
                                <TrackDuration audioUrl={track.audio_file} />
                            </div>

                            {/* Remove track button */}
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleRemoveTrack(track.id); }}
                                className="w-8 h-8 ml-2 md:ml-4 flex items-center justify-center rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all font-bold shrink-0"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PlaylistPage;