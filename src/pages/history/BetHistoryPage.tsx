import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import type { Bet, Match } from '../../types';
import { Loader2, Calendar, ChevronLeft, ChevronRight, Trophy, Sword, Target, TrendingUp } from 'lucide-react';
import clsx from 'clsx';

interface BetWithMatch extends Bet {
    match?: Match;
}

export const BetHistoryPage = () => {
    const { profile } = useAuthStore();
    const [bets, setBets] = useState<BetWithMatch[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (profile?.id) {
            fetchBets();

            const channel = supabase
                .channel(`bet-history:${profile.id}`)
                .on('postgres_changes', {
                    event: '*',
                    schema: 'public',
                    table: 'bets',
                    filter: `user_id=eq.${profile.id}`
                }, () => {
                    fetchBets();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [profile?.id, page, pageSize]);

    const fetchBets = async () => {
        setLoading(true);
        try {
            const from = (page - 1) * pageSize;
            const to = from + pageSize - 1;

            const { data, error, count } = await supabase
                .from('bets')
                .select('*, match:matches(*)', { count: 'exact' })
                .eq('user_id', profile!.id)
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;

            if (data) {
                setBets(data as BetWithMatch[]);
                setTotalCount(count || 0);
            }
        } catch (error) {
            console.error("Error fetching bet history:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true
        });
    };

    const totalPages = Math.ceil(totalCount / pageSize);

    // Calculate stats
    const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalWon = bets.filter(b => b.status === 'won').reduce((sum, b) => sum + (b.payout || 0), 0);
    const winCount = bets.filter(b => b.status === 'won').length;
    const winRate = bets.length > 0 ? (winCount / bets.length) * 100 : 0;

    return (
        <div className="space-y-4 max-w-7xl mx-auto pb-20 lg:pb-0">
            {/* Compact Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-casino-gold-500 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                        <Trophy className="text-black" size={20} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-white uppercase tracking-tight">Match History</h1>
                        <p className="text-casino-slate-500 text-xs">Your betting performance</p>
                    </div>
                </div>
            </div>

            {/* Stats Cards - Compact */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="glass-panel rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Sword size={14} className="text-casino-gold-500" />
                        <span className="text-[10px] text-casino-slate-500 uppercase font-bold">Total Bets</span>
                    </div>
                    <div className="text-lg font-black text-white">{totalCount}</div>
                </div>
                <div className="glass-panel rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Target size={14} className="text-green-500" />
                        <span className="text-[10px] text-casino-slate-500 uppercase font-bold">Win Rate</span>
                    </div>
                    <div className="text-lg font-black text-green-500">{winRate.toFixed(1)}%</div>
                </div>
                <div className="glass-panel rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={14} className="text-blue-500" />
                        <span className="text-[10px] text-casino-slate-500 uppercase font-bold">Wagered</span>
                    </div>
                    <div className="text-lg font-black text-white">₱{totalWagered.toLocaleString()}</div>
                </div>
                <div className="glass-panel rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Trophy size={14} className="text-casino-gold-500" />
                        <span className="text-[10px] text-casino-slate-500 uppercase font-bold">Total Won</span>
                    </div>
                    <div className={clsx("text-lg font-black", totalWon >= totalWagered ? "text-green-500" : "text-casino-gold-500")}>
                        ₱{totalWon.toLocaleString()}
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="glass-panel rounded-2xl overflow-hidden border-white/5">
                {/* Controls Bar - Compact */}
                <div className="p-3 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] text-casino-slate-500 uppercase font-bold">Show:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => {
                                setPageSize(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-casino-dark-800 border border-white/10 rounded-lg px-2 py-1 text-white text-xs outline-none focus:border-casino-gold-500/50 transition-colors cursor-pointer"
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden">
                    {loading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="animate-spin text-casino-gold-500 w-6 h-6 mx-auto mb-2" />
                            <span className="text-xs text-casino-slate-500">Loading...</span>
                        </div>
                    ) : bets.length === 0 ? (
                        <div className="py-12 text-center">
                            <span className="text-casino-slate-600 text-sm">No match history found</span>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {bets.map((bet) => (
                                <div key={bet.id} className="p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide",
                                                bet.selection === 'meron' ? "bg-red-500/20 text-red-500 border border-red-500/30" :
                                                    bet.selection === 'wala' ? "bg-blue-500/20 text-blue-500 border border-blue-500/30" :
                                                        "bg-white/10 text-casino-slate-400 border border-white/10"
                                            )}>
                                                {bet.selection}
                                            </span>
                                            <span className="text-[10px] text-casino-slate-500">
                                                #{bet.match?.fight_id || bet.match_id.substring(0, 6).toUpperCase()}
                                            </span>
                                        </div>
                                        <span className={clsx(
                                            "text-[10px] font-bold uppercase",
                                            bet.status === 'won' ? "text-green-500" :
                                                bet.status === 'lost' ? "text-red-500" :
                                                    bet.status === 'cancelled' ? "text-orange-500" :
                                                        "text-casino-slate-500"
                                        )}>
                                            {bet.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs">
                                        <div className="flex items-center gap-1 text-casino-slate-400">
                                            <Calendar size={10} />
                                            {formatDate(bet.created_at)}
                                        </div>
                                        <div className="text-right">
                                            <div className="font-mono font-bold text-white">₱ {bet.amount.toLocaleString()}</div>
                                            {bet.status === 'won' && bet.payout && (
                                                <div className="text-[10px] text-green-500 font-bold">
                                                    +₱ {bet.payout.toLocaleString()}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-casino-dark-900/80 border-b border-white/5">
                                <th className="px-4 py-3 text-left text-[10px] font-black text-casino-slate-500 uppercase tracking-wider">Match</th>
                                <th className="px-4 py-3 text-left text-[10px] font-black text-casino-slate-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-center text-[10px] font-black text-casino-slate-500 uppercase tracking-wider">Side</th>
                                <th className="px-4 py-3 text-center text-[10px] font-black text-casino-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-[10px] font-black text-casino-slate-500 uppercase tracking-wider">Bet</th>
                                <th className="px-4 py-3 text-right text-[10px] font-black text-casino-slate-500 uppercase tracking-wider">Result</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <Loader2 className="animate-spin text-casino-gold-500 w-6 h-6 mx-auto mb-2" />
                                        <span className="text-xs text-casino-slate-500">Loading records...</span>
                                    </td>
                                </tr>
                            ) : bets.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-12 text-center">
                                        <span className="text-casino-slate-600 text-sm">No match history found</span>
                                    </td>
                                </tr>
                            ) : (
                                bets.map((bet) => (
                                    <tr key={bet.id} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                <span className="font-bold text-white text-xs">SABONG</span>
                                                <span className="text-casino-slate-500 text-xs">#{bet.match?.fight_id || bet.match_id.substring(0, 6).toUpperCase()}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1.5 text-casino-slate-400 text-xs">
                                                <Calendar size={12} />
                                                {formatDate(bet.created_at)}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wide border",
                                                bet.selection === 'meron' ? "bg-red-500/10 text-red-500 border-red-500/20" :
                                                    bet.selection === 'wala' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" :
                                                        "bg-white/5 text-casino-slate-400 border-white/10"
                                            )}>
                                                {bet.selection}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={clsx(
                                                "text-xs font-bold uppercase",
                                                bet.status === 'won' ? "text-green-500" :
                                                    bet.status === 'lost' ? "text-red-500" :
                                                        bet.status === 'cancelled' ? "text-orange-500" :
                                                            "text-casino-slate-500"
                                            )}>
                                                {bet.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="font-mono font-bold text-casino-slate-200 text-sm">
                                                ₱ {bet.amount.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            {bet.status === 'won' && bet.payout ? (
                                                <span className="text-green-500 font-bold font-mono text-sm">
                                                    +₱ {bet.payout.toLocaleString()}
                                                </span>
                                            ) : bet.status === 'lost' ? (
                                                <span className="text-red-500/50 font-mono text-sm">
                                                    -₱ {bet.amount.toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-casino-slate-600 text-xs">-</span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Footer - Compact */}
                {totalCount > 0 && (
                    <div className="px-3 py-3 border-t border-white/5 bg-white/5 flex items-center justify-between">
                        <div className="text-xs text-casino-slate-500">
                            <span className="text-white font-bold">{((page - 1) * pageSize) + 1}-{Math.min(page * pageSize, totalCount)}</span>
                            <span className="mx-1">of</span>
                            <span className="text-white font-bold">{totalCount}</span>
                        </div>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-1.5 border border-white/10 rounded-lg hover:bg-white/5 text-casino-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                                let p = i + 1;
                                if (page > 2 && totalPages > 3) p = page - 1 + i;
                                if (p > totalPages) return null;

                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={clsx(
                                            "w-7 h-7 rounded-lg text-xs font-bold transition-all border",
                                            page === p
                                                ? "bg-casino-gold-500 text-black border-casino-gold-500"
                                                : "bg-transparent border-white/10 text-casino-slate-400 hover:bg-white/5 hover:text-white"
                                        )}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-1.5 border border-white/10 rounded-lg hover:bg-white/5 text-casino-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
