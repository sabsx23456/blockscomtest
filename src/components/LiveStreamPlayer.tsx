
import { Stream } from '@cloudflare/stream-react';
import ReactPlayer from 'react-player';
import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';

interface LiveStreamPlayerProps {
    /**
     * The video ID or signed URL from Cloudflare Stream.
     * Also supports VDO.Ninja URLs (will be embedded as iframe).
     */
    videoOrSignedId: string;
    videoTitle?: string; // Renamed to avoid prop collision if any
    autoplay?: boolean;
    muted?: boolean;
    controls?: boolean;
    className?: string;
    title?: string; // Backwards compatibility
}

export const LiveStreamPlayer: React.FC<LiveStreamPlayerProps> = ({
    videoOrSignedId,
    videoTitle = 'Live Stream',
    title,
    autoplay = false,
    muted = false,
    controls = true,
    className,
}) => {
    const [error, setError] = useState<string | null>(null);
    const displayTitle = title || videoTitle;

    // Helper to proxy stream URL if needed (Fix for WCC streams)
    const getStreamUrl = (url: string) => {
        if (!url) return '';
        if (url.includes('stream.wccgames7.xyz/wccstream')) {
            return url.replace('https://stream.wccgames7.xyz', ''); // Make relative to use proxy
        }
        return url;
    };

    const finalVideoUrl = getStreamUrl(videoOrSignedId);

    if (!finalVideoUrl) {
        return (
            <div className={`flex items-center justify-center bg-gray-900 text-white p-4 rounded-lg aspect-video ${className}`}>
                <p>No video source provided</p>
            </div>
        );
    }

    // 2. VDO.Ninja Support (Direct Iframe)
    if (finalVideoUrl.includes('vdo.ninja')) {
        return (
            <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
                <iframe
                    src={finalVideoUrl}
                    className="w-full h-full border-0"
                    allow="autoplay; camera; microphone; fullscreen; picture-in-picture"
                    title={displayTitle}
                />
            </div>
        );
    }

    // 3. Determine Player Type match UserDashboard logic
    const isFileStream = finalVideoUrl.includes('.m3u8') || finalVideoUrl.includes('.mp4');
    const isGenericUrl = finalVideoUrl.startsWith('http') || finalVideoUrl.startsWith('/');

    // Bypass TypeScript strictness for ReactPlayer if types are acting up
    const Player = ReactPlayer as any;

    if (isFileStream) {
        return (
            <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
                {error && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                        <AlertTriangle className="w-10 h-10 text-red-500 mb-2" />
                        <p className="font-bold text-red-400">Stream Error</p>
                        <p className="text-sm text-gray-300 mb-2">{error}</p>
                        <button
                            onClick={() => setError(null)}
                            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-xs uppercase font-bold"
                        >
                            Retry
                        </button>
                    </div>
                )}
                <Player
                    url={finalVideoUrl}
                    playing={autoplay}
                    muted={muted}
                    controls={controls}
                    width="100%"
                    height="100%"
                    onError={(e: any) => {
                        console.error("ReactPlayer Error:", e);
                        setError("Failed to load stream. Please verify the URL.");
                    }}
                    config={{
                        file: {
                            forceHLS: finalVideoUrl.includes('.m3u8'),
                        }
                    }}
                />
            </div>
        );
    }

    if (isGenericUrl) {
        // Fallback for non-file URLs (e.g. /wccstream proxy) - Render as Iframe like UserDashboard
        const iframeSrc = finalVideoUrl.includes('?')
            ? `${finalVideoUrl}&autoplay=${autoplay ? 1 : 0}&muted=${muted ? 1 : 0}`
            : `${finalVideoUrl}?autoplay=${autoplay ? 1 : 0}&muted=${muted ? 1 : 0}`;

        return (
            <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
                <iframe
                    src={iframeSrc}
                    className="w-full h-full border-0"
                    allow="autoplay; camera; microphone; fullscreen; picture-in-picture; display-capture; midi; geolocation;"
                    title={displayTitle}
                />
            </div>
        );
    }

    // 4. Default to Cloudflare Stream
    return (
        <div className={`relative w-full aspect-video rounded-lg overflow-hidden bg-black ${className}`}>
            <Stream
                src={finalVideoUrl}
                controls={controls}
                autoplay={autoplay}
                muted={muted}
                className="w-full h-full object-cover"
                title={displayTitle}
            />
        </div>
    );
};
