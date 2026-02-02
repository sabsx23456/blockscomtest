
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Plus, Trophy, Calendar, Trash2, Edit2, Upload, Swords, RotateCcw, Tv } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import { useDropzone } from 'react-dropzone';
import { LiveStreamPlayer } from '../../components/LiveStreamPlayer';
import clsx from 'clsx';
import type { Match } from '../../types';

interface Event {
    id: string;
    name: string;
    description?: string;
    banner_url?: string;
    stream_url?: string;
    stream_title?: string;
    status: 'active' | 'upcoming' | 'ended' | 'hidden';
    created_at: string;
    // Joined
    matches?: Match[];
}

import { useNavigate } from 'react-router-dom';

export const EventManagementPage = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<Event | null>(null);
    const [viewingStreamEvent, setViewingStreamEvent] = useState<Event | null>(null);
    const [uploading, setUploading] = useState(false);
    const { showToast } = useToast();

    // Event Form State
    const [eventFormData, setEventFormData] = useState({
        name: '',
        banner_url: '',
        stream_url: '',
        stream_title: '',
        status: 'active'
    });



    useEffect(() => {
        fetchEventsAndMatches();

        // Realtime subscription
        const channel = supabase
            .channel('events_page_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => fetchEventsAndMatches())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => fetchEventsAndMatches())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchEventsAndMatches = async () => {
        setLoading(true);
        // Fetch Events with their latest match
        const { data, error } = await supabase
            .from('events')
            .select(`
                *,
                matches (
                    id, status, fight_id, created_at, winner, meron_name, wala_name,
                    meron_total, wala_total, draw_total
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching events:', error);
            showToast('Failed to load events', 'error');
        } else {
            // Sort matches for each event to get the latest
            const processed = data?.map((ev: any) => ({
                ...ev,
                matches: ev.matches.sort((a: Match, b: Match) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            }));
            setEvents(processed as Event[]);
        }
        setLoading(false);
    };

    // --- EVENT HANDLERS ---
    const handleOpenEventModal = (event?: Event) => {
        if (event) {
            setEditingEvent(event);
            setEventFormData({
                name: event.name,
                banner_url: event.banner_url || '',
                stream_url: event.stream_url || '',
                stream_title: event.stream_title || '',
                status: event.status as any
            });
        } else {
            setEditingEvent(null);
            setEventFormData({
                name: '',
                banner_url: '',
                stream_url: '',
                stream_title: '',
                status: 'active'
            });
        }
        setIsEventModalOpen(true);
    };

    const handleEventSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingEvent) {
                const { error } = await supabase.from('events').update(eventFormData).eq('id', editingEvent.id);
                if (error) throw error;
                showToast('Event updated successfully', 'success');
            } else {
                const { error } = await supabase.from('events').insert(eventFormData);
                if (error) throw error;
                showToast('Event created successfully', 'success');
            }
            setIsEventModalOpen(false);
            fetchEventsAndMatches();
        } catch (error: any) {
            showToast(error.message || 'Operation failed', 'error');
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!confirm('Are you sure you want to delete this event? This will UNLINK all associated matches.')) return;

        try {
            // 1. Unlink matches first (Set event_id to NULL)
            const { error: unlinkError } = await supabase
                .from('matches')
                .update({ event_id: null })
                .eq('event_id', id);

            if (unlinkError) throw unlinkError;

            // 2. Delete the event
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;

            showToast('Event deleted successfully', 'success');
            fetchEventsAndMatches();
        } catch (error: any) {
            console.error("Delete error:", error);
            showToast('Failed to delete event: ' + error.message, 'error');
        }
    };

    const handleResetEvent = async (id: string) => {
        if (!confirm('Are you sure you want to RESET this event? This will DELETE ALL MATCH HISTORY and reset trends. This action cannot be undone.')) return;

        try {
            const { error } = await supabase
                .from('matches')
                .delete()
                .eq('event_id', id);

            if (error) throw error;

            showToast('Event matches reset successfully', 'success');
            fetchEventsAndMatches();
        } catch (error: any) {
            console.error("Reset error:", error);
            showToast('Failed to reset event: ' + error.message, 'error');
        }
    };



    // --- IMAGE UPLOAD ---
    const onDrop = async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage.from('event-banners').upload(filePath, file);

            if (uploadError) {
                if (uploadError.message.includes("Bucket not found")) {
                    throw new Error("Storage bucket 'event-banners' not found.");
                }
                throw uploadError;
            }

            const { data } = supabase.storage.from('event-banners').getPublicUrl(filePath);
            setEventFormData(prev => ({ ...prev, banner_url: data.publicUrl }));
            showToast('Banner uploaded successfully!', 'success');
        } catch (error: any) {
            console.error('Upload error:', error);
            showToast(error.message || 'Failed to upload image', 'error');
        } finally {
            setUploading(false);
        }
    };

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'] },
        maxFiles: 1
    });

    return (
        <div className="space-y-6 max-w-7xl mx-auto py-6 px-4 md:px-0">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-display font-black text-white tracking-tight flex items-center gap-3">
                        <Calendar className="text-casino-gold-400" />
                        Event Console
                    </h1>
                    <p className="text-casino-slate-500 mt-2 font-medium">Manage events and their matches.</p>
                </div>
                <button
                    onClick={() => handleOpenEventModal()}
                    className="btn-casino-primary py-3 px-6 rounded-xl flex items-center gap-2 transition-all active:scale-95 text-sm font-black uppercase tracking-wider"
                >
                    <Plus size={18} />
                    New Event
                </button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-white/50 animate-pulse">Loading events...</div>
            ) : events.length === 0 ? (
                <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                    <Trophy className="w-16 h-16 text-white/20 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">No Events Found</h3>
                    <p className="text-white/50 mt-2">Create your first event to get started.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {events.map((event) => {
                        const latestMatch = event.matches?.[0];

                        return (
                            <div key={event.id} className="glass-panel group relative overflow-hidden rounded-2xl border border-white/10 hover:border-casino-gold-400/50 transition-all flex flex-col">
                                {/* Banner Base */}
                                <div className="h-40 bg-black/50 relative">
                                    {event.banner_url ? (
                                        <img src={event.banner_url} alt={event.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-all" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                                            <Trophy className="text-white/10 w-12 h-12" />
                                        </div>
                                    )}
                                    <div className="absolute top-4 right-4">
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                                            event.status === 'active' ? "bg-green-500/20 text-green-400 border-green-500/30" :
                                                event.status === 'upcoming' ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                                                    "bg-neutral-500/20 text-neutral-400 border-neutral-500/30"
                                        )}>
                                            {event.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 flex-1 flex flex-col">
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2 truncate">{event.name}</h3>

                                    {/* Match Status Section */}
                                    <div className="mb-6 bg-black/20 rounded-xl p-4 border border-white/5 flex-1">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-casino-slate-500 uppercase tracking-widest">Current Match</span>
                                            {latestMatch && (
                                                <span className={clsx(
                                                    "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                                    latestMatch.status === 'finished' ? "bg-neutral-700 text-neutral-400" : "bg-green-500/20 text-green-400"
                                                )}>
                                                    {latestMatch.status}
                                                </span>
                                            )}
                                        </div>

                                        {latestMatch ? (
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-white font-bold">{latestMatch.fight_id || `Match #${latestMatch.id.slice(0, 4)}`}</span>
                                                    {latestMatch.status === 'finished' && latestMatch.winner && (
                                                        <span className={clsx(
                                                            "text-xs font-black uppercase",
                                                            latestMatch.winner === 'meron' ? "text-red-500" : latestMatch.winner === 'wala' ? "text-blue-500" : "text-white"
                                                        )}>
                                                            {latestMatch.winner} Wins
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-xs text-casino-slate-400 flex justify-between">
                                                    <span>{latestMatch.meron_name || 'MERON'}</span>
                                                    <span>vs</span>
                                                    <span>{latestMatch.wala_name || 'WALA'}</span>
                                                </div>

                                                {/* POOL TOTALS ROW */}
                                                <div className="pt-3 flex gap-2 border-t border-white/5 mt-2">
                                                    <div className="flex-1 text-center">
                                                        <div className="text-[8px] font-bold text-red-500 uppercase tracking-tighter">Meron</div>
                                                        <div className="text-xs font-black text-white">₱{(latestMatch.meron_total || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div className="flex-1 text-center border-x border-white/5">
                                                        <div className="text-[8px] font-bold text-green-500 uppercase tracking-tighter">Draw</div>
                                                        <div className="text-xs font-black text-white">₱{(latestMatch.draw_total || 0).toLocaleString()}</div>
                                                    </div>
                                                    <div className="flex-1 text-center">
                                                        <div className="text-[8px] font-bold text-blue-500 uppercase tracking-tighter">Wala</div>
                                                        <div className="text-xs font-black text-white">₱{(latestMatch.wala_total || 0).toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 text-xs text-casino-slate-500 italic">
                                                No matches recorded.
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t border-white/10">
                                        {/* Action Buttons */}
                                        <button
                                            onClick={() => navigate(`/events/${event.id}`)}
                                            className="flex-1 py-3 bg-casino-gold-600 hover:bg-casino-gold-500 text-black rounded-xl font-black uppercase tracking-wider text-xs shadow-lg shadow-yellow-900/20 transition-all flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <Swords size={14} />
                                            Manage Arena
                                        </button>

                                        <button
                                            onClick={() => handleResetEvent(event.id)}
                                            className="p-3 bg-white/5 hover:bg-yellow-500/20 hover:text-yellow-500 rounded-xl text-casino-slate-400 transition-colors"
                                            title="Reset Match History"
                                        >
                                            <RotateCcw size={16} />
                                        </button>

                                        <button
                                            onClick={() => handleOpenEventModal(event)}
                                            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors"
                                            title="Edit Event"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteEvent(event.id)}
                                            className="p-3 bg-white/5 hover:bg-red-500/20 hover:text-red-500 rounded-xl text-casino-slate-400 transition-colors"
                                            title="Delete Event"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* EVENT MODAL (Create/Edit) */}
            {isEventModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-neutral-900 w-full max-w-lg rounded-3xl border border-white/10 p-8 shadow-2xl relative">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-6 flex items-center gap-3">
                            {editingEvent ? <Edit2 className="text-casino-gold-400" /> : <Plus className="text-casino-gold-400" />}
                            {editingEvent ? 'Edit Event' : 'Create Event'}
                        </h2>

                        <form onSubmit={handleEventSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-casino-slate-400 uppercase tracking-widest ml-1">Event Name</label>
                                <input
                                    type="text"
                                    required
                                    value={eventFormData.name}
                                    onChange={e => setEventFormData({ ...eventFormData, name: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-casino-gold-400 outline-none transition-all"
                                    placeholder="e.g. SUMMER DERBY 2026"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-casino-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        value={eventFormData.status}
                                        onChange={e => setEventFormData({ ...eventFormData, status: e.target.value as any })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-casino-gold-400 outline-none transition-all"
                                    >
                                        <option value="active">Active</option>
                                        <option value="upcoming">Upcoming</option>
                                        <option value="hidden">Hidden</option>
                                        <option value="ended">Ended</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-casino-slate-400 uppercase tracking-widest ml-1">Stream Title</label>
                                    <input
                                        type="text"
                                        value={eventFormData.stream_title}
                                        onChange={e => setEventFormData({ ...eventFormData, stream_title: e.target.value })}
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-casino-gold-400 outline-none transition-all"
                                        placeholder="Display Title"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-xs font-black text-casino-slate-400 uppercase tracking-widest ml-1">Banner Image</label>
                                <div
                                    {...getRootProps()}
                                    className={clsx(
                                        "relative w-full aspect-[2/1] rounded-xl overflow-hidden border-2 border-dashed transition-all cursor-pointer group",
                                        isDragActive ? "border-casino-gold-400 bg-casino-gold-400/10" : "border-white/10 bg-black/50 hover:border-casino-gold-400/50"
                                    )}
                                >
                                    <input {...getInputProps()} />
                                    {eventFormData.banner_url ? (
                                        <>
                                            <img
                                                src={eventFormData.banner_url}
                                                alt="Banner Preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="text-center">
                                                    <Upload className="w-8 h-8 text-white mx-auto mb-2" />
                                                    <span className="text-xs font-bold text-white uppercase tracking-wider">Change Image</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/30 gap-3 p-6 text-center">
                                            {uploading ? <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-casino-gold-400" /> : <Upload size={20} />}
                                            <p className="text-xs font-bold text-white uppercase tracking-wider">{isDragActive ? "Drop image here" : "Drag & Drop or Click"}</p>
                                        </div>
                                    )}
                                </div>
                                {/* URL Input Fallback */}
                                <div className="relative">
                                    <input
                                        type="url"
                                        value={eventFormData.banner_url}
                                        onChange={e => setEventFormData({ ...eventFormData, banner_url: e.target.value })}
                                        placeholder="Or image URL..."
                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-xs text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-casino-slate-400 uppercase tracking-widest ml-1">Stream URL</label>
                                <input
                                    type="text"
                                    value={eventFormData.stream_url}
                                    onChange={e => setEventFormData({ ...eventFormData, stream_url: e.target.value })}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-casino-gold-400 outline-none transition-all"
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button type="button" onClick={() => setIsEventModalOpen(false)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-all">Cancel</button>
                                <button type="submit" className="flex-1 py-3 bg-casino-gold-600 hover:bg-casino-gold-500 text-black rounded-xl font-black uppercase tracking-widest transition-all">
                                    {editingEvent ? 'Save Changes' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* STREAM PREVIEW MODAL */}
            {viewingStreamEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm p-4">
                    <div className="w-full max-w-5xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    <Tv className="text-casino-gold-400" />
                                    {viewingStreamEvent.name}
                                </h2>
                                <p className="text-white/50 text-sm">Live Stream Preview</p>
                            </div>
                            <button
                                onClick={() => setViewingStreamEvent(null)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold uppercase tracking-wider transition-all"
                            >
                                Close Preview
                            </button>
                        </div>

                        <div className="aspect-video bg-black rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                            <LiveStreamPlayer
                                videoOrSignedId={viewingStreamEvent.stream_url || ''}
                                videoTitle={viewingStreamEvent.stream_title || viewingStreamEvent.name}
                                autoplay={true}
                                muted={false}
                            />
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};
