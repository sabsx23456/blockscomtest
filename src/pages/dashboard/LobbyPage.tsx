import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Play, Trophy, Calendar } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface Event {
    id: string;
    name: string;
    banner_url?: string;
    stream_url?: string;
    status: 'active' | 'upcoming' | 'ended' | 'hidden';
    created_at: string;
}

export const LobbyPage = () => {
    const navigate = useNavigate();
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        const { data } = await supabase
            .from('events')
            .select('*')
            .in('status', ['active', 'upcoming'])
            .order('created_at', { ascending: false });

        if (data) setEvents(data as Event[]);
        setLoading(false);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-casino-gold-500">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <span className="text-xs font-semibold uppercase tracking-wider">Loading Events...</span>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-casino-gold-500" />
                    Active Events
                </h2>
                <span className="text-xs text-casino-slate-500">{events.length} events</span>
            </div>

            {events.length === 0 ? (
                <div className="text-center py-12 bg-casino-dark-850 rounded-2xl border border-white/5">
                    <Calendar className="w-12 h-12 text-casino-slate-600 mx-auto mb-3" />
                    <h3 className="text-base font-semibold text-white">No Active Events</h3>
                    <p className="text-casino-slate-500 text-sm mt-1">Check back later for upcoming matches.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {events.map((event) => (
                        <div
                            key={event.id}
                            className="group relative bg-casino-dark-850 rounded-xl overflow-hidden border border-white/5 hover:border-casino-gold-500/30 transition-all"
                        >
                            {/* Banner */}
                            <div className="h-36 relative overflow-hidden">
                                {event.banner_url ? (
                                    <img
                                        src={event.banner_url}
                                        alt={event.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-casino-dark-800 to-casino-dark-900 flex items-center justify-center">
                                        <Trophy className="w-10 h-10 text-casino-slate-700" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-casino-dark-850 via-transparent to-transparent" />

                                {/* Status Badge */}
                                <div className="absolute top-2 left-2">
                                    <div className={clsx(
                                        "flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide",
                                        event.status === 'active'
                                            ? "bg-green-500/20 text-green-400 border border-green-500/30"
                                            : "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                                    )}>
                                        <span className={clsx(
                                            "w-1.5 h-1.5 rounded-full",
                                            event.status === 'active' ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'
                                        )} />
                                        {event.status === 'active' ? 'Live' : 'Upcoming'}
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-3">
                                <h3 className="text-sm font-semibold text-white mb-2 truncate">{event.name}</h3>
                                <button
                                    onClick={() => navigate(`/event/${event.id}`)}
                                    disabled={event.status !== 'active'}
                                    className={clsx(
                                        "w-full py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wide transition-all",
                                        event.status === 'active'
                                            ? "bg-casino-gold-500 hover:bg-casino-gold-400 text-casino-dark-950"
                                            : "bg-casino-dark-700 text-casino-slate-500 cursor-not-allowed"
                                    )}
                                >
                                    <Play size={14} fill={event.status === 'active' ? "currentColor" : "none"} />
                                    {event.status === 'active' ? 'Enter Arena' : 'Opens Soon'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
