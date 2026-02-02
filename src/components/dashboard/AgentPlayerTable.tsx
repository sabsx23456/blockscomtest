import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { Users, Search } from 'lucide-react';
import type { Profile } from '../../types';

export const AgentPlayerTable = () => {
    const { session } = useAuthStore();
    const [players, setPlayers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (session?.user.id) {
            fetchPlayers();
        }
    }, [session?.user.id]);

    const fetchPlayers = async () => {
        setLoading(true);
        try {
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .eq('created_by', session?.user.id)
                .in('role', ['user', 'agent']) // Show both agents and users
                .order('created_at', { ascending: false });

            if (data) {
                setPlayers(data as Profile[]);
            }
        } catch (error) {
            console.error('Error fetching players:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPlayers = players.filter(p =>
        p.username.toLowerCase().includes(search.toLowerCase()) ||
        p.id.includes(search)
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-white font-display font-black text-xl uppercase tracking-wider flex items-center gap-3">
                    <Users size={20} className="text-casino-gold-400" />
                    My Downline
                </h2>
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search username..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-casino-gold-400/50 transition-all placeholder:text-neutral-600"
                    />
                </div>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden border border-white/5">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-black/40 text-casino-slate-500 text-[10px] uppercase font-black tracking-[0.15em]">
                            <tr>
                                <th className="p-4">User</th>
                                <th className="p-4">Role</th>
                                <th className="p-4">Balance</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Joined</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-neutral-500 text-xs animate-pulse">Loading downline...</td>
                                </tr>
                            ) : filteredPlayers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-neutral-500 text-xs italic">No active players found.</td>
                                </tr>
                            ) : (
                                filteredPlayers.map((player) => (
                                    <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex items-center justify-center font-bold text-xs text-neutral-400">
                                                    {player.username.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="font-bold text-white text-sm">{player.username}</div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-wider ${player.role === 'agent'
                                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                }`}>
                                                {player.role}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-casino-gold-400">
                                            ₱ {player.balance?.toLocaleString() || '0.00'}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-1.5">
                                                {player.status === 'active' ? (
                                                    <>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                                                        <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Active</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">{player.status}</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-xs text-neutral-500 font-medium">
                                            {new Date(player.created_at).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
