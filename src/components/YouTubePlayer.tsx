import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: any;
  }
}

type Props = {
  videoId: string;
  title: string;
  onEnded?: () => void;
  onError?: () => void;
  onTimeUpdate?: (currentTime: number) => void;
  onStateChange?: (state: 'PLAYING' | 'PAUSED' | 'STOPPED') => void;
};

export const YouTubePlayer: React.FC<Props> = ({ videoId, title, onEnded, onError, onTimeUpdate, onStateChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let timeInterval: any = null;

    if (onTimeUpdate) {
      timeInterval = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          try {
            const time = playerRef.current.getCurrentTime();
            if (typeof time === 'number' && !isNaN(time)) {
              onTimeUpdate(time);
            }
          } catch (e) {}
        }
      }, 50);
    }

    return () => {
      if (timeInterval) clearInterval(timeInterval);
    };
  }, [onTimeUpdate, videoId]);

  useEffect(() => {
    // Inject API script if not present
    if (!window.YT) {
      const existingScript = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
    }

    const initPlayer = () => {
      if (!containerRef.current) return;

      // If player already exists, simply load the new video ID smoothly
      if (playerRef.current && typeof playerRef.current.loadVideoById === 'function') {
        try {
          playerRef.current.loadVideoById({ videoId });
          return;
        } catch (e) {
          console.warn('loadVideoById failed, re-initializing iframe:', e);
        }
      }

      containerRef.current.innerHTML = '<div id="yt-player-iframe" class="w-full h-full"></div>';

      try {
        playerRef.current = new window.YT.Player('yt-player-iframe', {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 1,
            controls: 1,
            modestbranding: 1,
            rel: 0,
            enablejsapi: 1,
            origin: window.location.origin,
            playsinline: 1,
          },
          events: {
            onStateChange: (event: any) => {
              if (event.data === 0 && onEnded) {
                onEnded();
              }
              if (onStateChange) {
                if (event.data === 1) onStateChange('PLAYING');
                else if (event.data === 2) onStateChange('PAUSED');
                else if (event.data === 0 || event.data === -1) onStateChange('STOPPED');
              }
            },
            onError: (err: any) => {
              console.warn('YouTube Player API Error code:', err?.data);
              if (onError) onError();
            },
          },
        });
      } catch (err) {
        console.error('Failed to instantiate YT Player:', err);
      }
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };

      const timer = setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(timer);
          initPlayer();
        }
      }, 250);

      return () => clearInterval(timer);
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        try {
          playerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [videoId]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};
