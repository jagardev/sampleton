/**
 * home.tsx
 * --------
 * Renders the main discovery page of the Sampleton application.
 *
 * This component receives the global track list and playback state from the
 * Layout via React Router's Outlet context. It applies a live search filter
 * to the tracks and renders them in a horizontally scrollable grid. Each card
 * provides a play button and a shortcut to add the track to a playlist.
 */

import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

type ContextType = {
    tracks: any[];
    handlePlayTrack: (track: any) => void;
    currentTrack: any;
    isPlaying: boolean;
    openPlaylistModal: (track: any) => void;
    searchTerm: string;
};

export const Home = () => {
    const navigate = useNavigate();
    const { tracks, handlePlayTrack, currentTrack, isPlaying, openPlaylistModal, searchTerm } = useOutletContext<ContextType>();

    /**
     * Filters the full track list against the current search term.
     * Both the title and artist fields are checked, case-insensitively.
     */
    const filteredTracks = tracks.filter(t =>
        (t.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.artist || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    /**
     * Renders a labelled, horizontally scrollable grid of track cards.
     *
     * Extra padding is applied to the scroll container so that the card
     * elevation shadow on hover is not clipped by the overflow boundary.
     *
     * @param title - The section heading displayed above the grid.
     */
    const renderGrid = (title: string) => (
        <section>
            <div className="mb-4">
                <h2 className="text-xl font-extrabold text-gray-800 dark:text-zinc-100">{title}</h2>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-6 pt-2 px-2 -mx-2 custom-scrollbar">
                {filteredTracks.length === 0 ? <p className="text-gray-500 italic">No tracks match your search...</p> : (
                    filteredTracks.map((track) => (
                        <div
                            key={`grid-${track.id}`}
                            onClick={() => navigate(`/sample/${track.id}`)}
                            className="min-w-[180px] w-[180px] group cursor-pointer bg-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/80 p-2 rounded-lg transition-all duration-300 relative hover:shadow-xl hover:shadow-orange-100 dark:hover:shadow-zinc-950 hover:-translate-y-2 border border-transparent hover:border-orange-200 dark:hover:border-orange-500"
                        >

                            {/* Button to add the track to a playlist, visible on hover. */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    openPlaylistModal(track);
                                }}
                                className="absolute top-4 right-4 w-8 h-8 bg-white dark:bg-zinc-800 border-2 border-orange-500 text-orange-500 rounded-full flex items-center justify-center font-bold text-lg opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-orange-50 dark:hover:bg-zinc-700 transition-all z-20 shadow-md"
                                title="Add to Playlist"
                            >
                                +
                            </button>

                            <div className="relative w-full h-[180px] bg-gray-200 dark:bg-zinc-800 rounded border border-gray-300 dark:border-zinc-700 mb-3 flex items-center justify-center overflow-hidden shadow-sm">
                                {/* Cover image with a subtle zoom effect on hover. */}
                                {track.cover_image ? (
                                    <img src={track.cover_image} alt={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                ) : (
                                    <span className="text-4xl opacity-50 transition-transform duration-500 group-hover:scale-110">🎵</span>
                                )}

                                {/* Gradient overlay that darkens the cover to make the play button legible. */}
                                <div className="absolute inset-0 bg-gradient-to-t from-orange-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 z-0"></div>

                                {/* Play / pause button displayed as an overlay on the cover image. */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handlePlayTrack(track);
                                        }}
                                        className="text-white border-2 border-white rounded-full bg-gradient-to-r from-orange-500 to-yellow-500 w-14 h-14 flex items-center justify-center hover:scale-110 shadow-lg transition-all"
                                    >
                                        {(currentTrack?.id === track.id && isPlaying) ? (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" /></svg>
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 ml-1"><path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" /></svg>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Track title turns orange on hover to signal interactivity. */}
                            <div className="font-bold text-sm truncate group-hover:text-orange-500 dark:text-zinc-200 dark:group-hover:text-orange-400 transition-colors" title={track.title}>{track.title}</div>
                            <div className="text-xs text-gray-500 dark:text-zinc-400 truncate group-hover:text-gray-700 dark:group-hover:text-zinc-300 transition-colors">{track.artist} • <span className="uppercase">{track.genre}</span></div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );

    return (
        <div className="w-full flex flex-col gap-10 overflow-hidden">
            {renderGrid("Most Liked")}
            {renderGrid("Most Commented")}
        </div>
    );
};

export default Home;