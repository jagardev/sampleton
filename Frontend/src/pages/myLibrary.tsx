/**
 * myLibrary.tsx
 * -------------
 * Renders the authenticated user's personal library view.
 *
 * This page aggregates profile data, user-owned tracks, playlists, and liked
 * tracks, then exposes contextual actions such as playback, deletion, and
 * adding tracks to playlists.
 */
import { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../api/axios';

type ContextType = {
    tracks?: any[];
    handlePlayTrack?: (track: any) => void;
    currentTrack?: any;
    isPlaying?: boolean;
    openPlaylistModal?: (track: any) => void;
};

export const MyLibrary = () => {
    const navigate = useNavigate();
    const context = useOutletContext<ContextType>();
    
    const [profile, setProfile] = useState<any>(null);
    const [playlists, setPlaylists] = useState<any[]>([]);
    const [myTracks, setMyTracks] = useState<any[]>([]); 
    const [likedTracks, setLikedTracks] = useState<any[]>([]); 
    const [activeTab, setActiveTab] = useState('Samples'); 
    const [isLoading, setIsLoading] = useState(true);

    /** Tracks which contextual menu is open, identified by a unique string key. */
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    /** Counts valid playlist tracks that are currently available in memory. */
    const getPlaylistTrackCount = (pl: any) => {
        if (!context?.tracks || !pl.tracks) return 0;
        return Array.from(new Set(pl.tracks)).filter((tid: any) => context.tracks!.some(t => t.id === tid)).length;
    };

    /** Fetches and normalizes profile, playlist, track, and like datasets. */
    const fetchData = async () => {
        const token = localStorage.getItem('access');
        const username = localStorage.getItem('username');
        if (!token) return navigate('/login');
        
        try {
            const [profileRes, playlistsRes, tracksRes, likesRes] = await Promise.all([
                api.get('profile/me/', { headers: { 'Authorization': `Bearer ${token}` } }),
                api.get('playlists/', { headers: { 'Authorization': `Bearer ${token}` } }),
                api.get('tracks/'),
                api.get('likes/', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            setProfile(profileRes.data);
            setPlaylists(playlistsRes.data);
            // Only keep tracks that belong to the authenticated user.
            setMyTracks(tracksRes.data.filter((t: any) => t.user === profileRes.data.user || t.artist === username));
            
            // Filter tracks to those the current user has liked.
            setLikedTracks(tracksRes.data.filter((t: any) => likesRes.data.some((l: any) => l.track === t.id)));
            
        } catch (error) {  
            console.error("Failed to load library:", error); 
        } finally { 
            setIsLoading(false); 
        }
    };

    useEffect(() => { fetchData(); }, [navigate]);

    /** Subscribes to global playlist refresh events emitted by other pages. */
    useEffect(() => {
        const handleRefresh = () => fetchData();
        window.addEventListener('playlistRefresh', handleRefresh);
        return () => window.removeEventListener('playlistRefresh', handleRefresh);
    }, []);

    /**
     * Deletes a track or playlist after the user confirms the action.
     * Reloads the library automatically once the deletion succeeds.
     */
    const handleDelete = async (id: number, type: 'track' | 'playlist') => {
        if (!window.confirm(`Are you sure you want to delete this ${type}? This action cannot be undone.`)) return;
        
        const token = localStorage.getItem('access');
        try {
            const endpoint = type === 'track' ? `tracks/${id}/` : `playlists/${id}/`;
            await api.delete(endpoint, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setOpenMenuId(null);
            fetchData(); // Reload the list automatically after deletion.
        } catch (error) { 
            alert("Failed to delete. Please verify your permissions."); 
            console.error(error);
        }
    };

    if (isLoading) return <div className="p-8 font-bold text-center">Loading your library...</div>;

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col animate-fadeIn">
            
            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 mb-6 md:mb-10 mt-4 text-center md:text-left">
                <div className="w-24 h-24 md:w-40 md:h-40 bg-gray-200 dark:bg-zinc-800 rounded-full border border-gray-400 dark:border-zinc-600 overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {profile?.avatar_file ? <img src={profile.avatar_file} alt="Avatar" className="w-full h-full object-cover" /> : <span className="text-5xl md:text-6xl text-gray-400 dark:text-zinc-500">👤</span>}
                </div>
                <div className="flex flex-col gap-1 md:gap-2 flex-1">
                    <h1 className="text-3xl md:text-4xl font-bold dark:text-zinc-100">{profile?.display_name || profile?.username || 'User'}</h1>
                    <p className="text-gray-500 dark:text-zinc-400 font-medium">@{profile?.username}</p>
                    {profile?.bio && <p className="text-sm mt-2 max-w-2xl text-gray-700 dark:text-zinc-300">{profile.bio}</p>}
                </div>
            </div>

            <div className="flex gap-8 border-b border-gray-200 dark:border-zinc-800 mb-6">
                {['Samples', 'Playlists', 'Likes'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-2 font-bold text-sm transition-all ${activeTab === tab ? 'border-b-4 border-orange-500 text-orange-600' : 'text-gray-500 dark:text-zinc-400 hover:text-orange-500'}`}>{tab}</button>
                ))}
            </div>

            <div className="pb-24">
                
                {/* Samples tab */}
                {activeTab === 'Samples' && (
                    <div className="flex flex-col gap-3">
                        <div onClick={() => navigate('/upload')} className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-all group bg-gray-50 dark:bg-zinc-800/30 hover:bg-orange-50/30 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-orange-500 mb-2">
                            <div className="w-16 h-16 flex items-center justify-center text-4xl mb-1 transition-transform group-hover:scale-110">+</div>
                            <div className="font-bold text-lg">Upload New Sample</div>
                        </div>

                        {myTracks.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 dark:text-zinc-500 italic border-2 border-dashed border-gray-200 dark:border-zinc-700">You haven't uploaded any samples yet.</div>
                        ) : (
                            myTracks.map((track: any) => (
                                <div key={`lib-track-${track.id}`} onClick={() => navigate(`/sample/${track.id}`)} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-zinc-800 rounded-lg transition-all group relative cursor-pointer hover:bg-orange-50/50 dark:hover:bg-zinc-800/80 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md">
                                    <button onClick={(e) => { e.stopPropagation(); context?.handlePlayTrack?.(track); }} className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center hover:bg-gradient-to-r hover:from-orange-500 hover:to-yellow-500 hover:text-white hover:scale-105 transition-all shadow-sm flex-shrink-0">
                                        {(context?.currentTrack?.id === track.id && context?.isPlaying) ? (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                                        )}
                                    </button>
                                    
                                    <div className="w-12 h-12 bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 rounded-md">
                                        {track.cover_image ? <img src={track.cover_image} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full opacity-50">🎵</span>}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="font-bold text-sm group-hover:text-orange-600 transition-colors">{track.title}</div>
                                        <div className="text-xs text-gray-500 group-hover:text-gray-700 transition-colors">{track.artist}</div>
                                    </div>
                                    
                                    <div className="relative flex items-center">
                                        <button onClick={(e) => { e.stopPropagation(); context?.openPlaylistModal?.(track); }} className="mr-2 w-8 h-8 border-2 border-gray-200 dark:border-zinc-700 rounded-full flex items-center justify-center font-bold text-gray-400 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-500 hover:border-orange-500 dark:hover:border-orange-500 transition-colors bg-white dark:bg-zinc-800 shadow-sm" title="Add to Playlist">+</button>
                                        
                                        {/* Three-dot options menu for a track */}
                                        <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `t-${track.id}` ? null : `t-${track.id}`); }} className="p-2 w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full font-bold text-xl transition-colors dark:text-zinc-300">⋮</button>
                                        
                                        {openMenuId === `t-${track.id}` && (
                                            <div className="absolute right-0 top-10 w-36 bg-white dark:bg-zinc-800 border border-black dark:border-zinc-700 shadow-lg z-50 overflow-hidden rounded-md">
                                                <button onClick={(e) => { e.stopPropagation(); handleDelete(track.id, 'track'); }} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete Sample</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Playlists tab */}
                {activeTab === 'Playlists' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div onClick={() => context?.openPlaylistModal?.(null)} className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-all group bg-gray-50 dark:bg-zinc-800/30 hover:bg-orange-50/30 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-orange-500">
                            <div className="w-16 h-16 flex items-center justify-center text-4xl mb-1 transition-transform group-hover:scale-110">+</div>
                            <div className="font-bold text-lg">Create New Playlist</div>
                        </div>

                        {playlists.map((pl: any) => (
                            <div key={`lib-pl-${pl.id}`} className="flex items-center gap-4 p-4 border border-gray-200 dark:border-zinc-800 rounded-xl cursor-pointer hover:border-orange-500 dark:hover:border-orange-500 transition-all group shadow-sm bg-white dark:bg-zinc-800/50 hover:shadow-md hover:bg-orange-50/20 dark:hover:bg-zinc-800" onClick={() => navigate(`/playlist/${pl.id}`)}>
                                <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-800 dark:to-zinc-700 border border-gray-200 dark:border-zinc-600 rounded-lg flex items-center justify-center overflow-hidden group-hover:border-orange-500 transition-all text-2xl shadow-sm">
                                    {pl.cover_image ? (
                                        <img src={pl.cover_image} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>💿</span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-lg group-hover:text-orange-600 dark:text-zinc-100 transition-colors">{pl.title}</div>
                                    <div className="text-xs text-gray-400 dark:text-zinc-500 font-bold uppercase tracking-widest group-hover:text-gray-500 transition-colors">{getPlaylistTrackCount(pl)} Tracks</div>
                                </div>
                                
                                <div className="relative">
                                    {/* Three-dot options menu for a playlist */}
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === `p-${pl.id}` ? null : `p-${pl.id}`); }} className="p-2 w-8 h-8 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-full font-bold text-xl transition-colors dark:text-zinc-300">⋮</button>
                                    
                                    {openMenuId === `p-${pl.id}` && (
                                        <div className="absolute right-0 top-10 w-40 bg-white dark:bg-zinc-800 border border-black dark:border-zinc-700 shadow-lg z-50 overflow-hidden rounded-md">
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(pl.id, 'playlist'); }} className="w-full text-left px-4 py-3 text-sm text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">Delete Playlist</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Likes tab */}
                {activeTab === 'Likes' && (
                    <div className="flex flex-col gap-3">
                        {likedTracks.length === 0 ? (
                            <div className="py-8 text-center text-gray-500 dark:text-zinc-500 italic border-2 border-dashed border-gray-200 dark:border-zinc-700">Your liked tracks will appear here.</div>
                        ) : (
                            likedTracks.map((track: any) => (
                                <div key={`lib-like-${track.id}`} onClick={() => navigate(`/sample/${track.id}`)} className="flex items-center gap-4 p-3 border border-gray-200 dark:border-zinc-800 rounded-lg transition-all group relative cursor-pointer hover:bg-orange-50/50 dark:hover:bg-zinc-800/80 hover:border-orange-500 dark:hover:border-orange-500 hover:shadow-md">
                                    <button onClick={(e) => { e.stopPropagation(); context?.handlePlayTrack?.(track); }} className="w-8 h-8 bg-orange-100 dark:bg-orange-500/20 text-orange-500 rounded-full flex items-center justify-center hover:bg-gradient-to-r hover:from-orange-500 hover:to-yellow-500 hover:text-white hover:scale-105 transition-all shadow-sm flex-shrink-0">
                                        {(context?.currentTrack?.id === track.id && context?.isPlaying) ? (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                                        )}
                                    </button>
                                    
                                    <div className="w-12 h-12 bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 overflow-hidden flex-shrink-0 rounded-md">
                                        {track.cover_image ? <img src={track.cover_image} className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full opacity-50">🎵</span>}
                                    </div>
                                    
                                    <div className="flex-1">
                                        <div className="font-bold text-sm group-hover:text-orange-600 dark:text-zinc-200 transition-colors">{track.title}</div>
                                        <div className="text-xs text-gray-500 dark:text-zinc-400 group-hover:text-gray-700 dark:group-hover:text-zinc-300 transition-colors">{track.artist}</div>
                                    </div>
                                    
                                    <div className="relative flex items-center">
                                        <button onClick={(e) => { e.stopPropagation(); context?.openPlaylistModal?.(track); }} className="mr-4 w-8 h-8 border-2 border-gray-200 dark:border-zinc-700 rounded-full flex items-center justify-center font-bold text-gray-400 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-500 hover:border-orange-500 transition-colors bg-white dark:bg-zinc-800 shadow-sm" title="Add to Playlist">+</button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MyLibrary;