
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../lib/store';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';

export const RealtimeMonitor = () => {
    const { profile } = useAuthStore();
    const { showToast } = useToast();
    const location = useLocation();

    useEffect(() => {
        if (!profile?.id) return;

        // Subscribe to NEW TRANSACTIONS involving the user
        const channel = supabase
            .channel(`user_transactions:${profile.id}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'transactions',
                filter: `receiver_id=eq.${profile.id}` // Primary filter for receiving money/refunds
            }, async (payload) => {
                const tx = payload.new;

                // Handle Different Transaction Types
                switch (tx.type) {
                    case 'load':
                        showToast(`CASH IN: Account loaded with ₱${Number(tx.amount).toLocaleString()}`, 'success');
                        playNotificationSound('cash-in');
                        break;
                    case 'transfer':
                        // Optionally fetch sender name here if needed, or just show generic
                        showToast(`TRANSFER RECEIVED: You received ₱${Number(tx.amount).toLocaleString()}`, 'success');
                        playNotificationSound('coin-drop');
                        break;
                    case 'refund':
                        showToast(`REFUND: Match Cancelled. ₱${Number(tx.amount).toLocaleString()} returned.`, 'info');
                        break;
                    case 'win':
                        // Only show if NOT on dashboard (Dashboard handles its own fanfare)
                        if (location.pathname !== '/') {
                            showToast(`YOU WON! ₱${Number(tx.amount).toLocaleString()} credited.`, 'success');
                            playNotificationSound('win');
                        }
                        break;
                    default:
                        // Generic credit
                        if (tx.amount > 0) {
                            showToast(`Balance Update: +₱${Number(tx.amount).toLocaleString()}`, 'success');
                        }
                        break;
                }
            })
            // Separate listener for outgoing if needed (e.g. withdrawal approval/deduction?)
            // Usually withdrawal request is 'withdraw' type. If admin DEDUCTS, it might be separate.
            // Let's listen to ALL transactions where user is involved (sender or receiver) requires complex filter or 2 channels.
            // Supabase 'or' filter in realtime is tricky. Let's make a second channel for sender_id if needed.
            // But usually 'sender_id=me' implies I did it, so I know. 
            // EXCEPT: Admin deducting manual penalty? Or 'withdraw' processed?
            // If Admin processes withdrawal, they might insert a record with sender_id=User? Or Receiver=Admin?
            // Let's stick to Receiver (Money IN) notifications for now as requested (Add, Transfer, Cash In).
            // CASH OUT usually means request approved. If approved, does money leave?
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id, location.pathname, showToast]);

    return null;
};

// Simple sound helper
const playNotificationSound = (type: 'cash-in' | 'coin-drop' | 'win') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;

        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === 'cash-in') {
            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            osc.start();
            osc.stop(ctx.currentTime + 0.5);
        } else if (type === 'coin-drop') {
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
            osc.start();
            osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) {
        console.error("Audio play failed", e);
    }
};
