import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Coins, Timer, Loader2, AlertCircle, Trash2, Activity, Share2 } from 'lucide-react';
import { formatTime, formatCost } from '../utils/audioUtils';

interface AudioPlayerProps {
  id: string;
  audioUrl: string;
  text: string;
  cost?: number;
  generationTime?: number;
  status?: 'pending' | 'success' | 'error';
  errorMessage?: string;
  voiceName?: string;
  onDelete: (id: string) => void;
  // New props for Chain Casting (Auto-play)
  isActive?: boolean;
  onPlay?: () => void;
  onEnded?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  id,
  audioUrl,
  text,
  cost,
  generationTime,
  status = 'success',
  errorMessage,
  voiceName = '未知音色',
  onDelete,
  isActive = false,
  onPlay,
  onEnded: onParentEnded
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Audio Context for Visualization (Mana Resonance)
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Handle external active state changes (for Auto-play)
  useEffect(() => {
    if (status !== 'success' || !audioRef.current) return;

    if (isActive) {
      if (!isPlaying) {
        // Try to play if active
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              initVisualizer();
              startVisualizerLoop();
            })
            .catch(e => {
              console.warn("Auto-play blocked or failed:", e);
              // If blocked, we might want to reset playing state
              setIsPlaying(false);
            });
        }
      }
    } else {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopVisualizerLoop();
      }
    }
  }, [isActive, status]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopVisualizerLoop();
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => { });
      }
    };
  }, []);

  const initVisualizer = () => {
    if (!audioRef.current) return;

    // Check if context already exists
    if (!audioContextRef.current) {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        // Note: Browsers limit the number of AudioContexts. 
        // We lazily create it only when needed.
        const ctx = new AudioContext();

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 128; // Bar count resolution
        analyser.smoothingTimeConstant = 0.85;

        // IMPORTANT: Once we create a MediaElementSource, the audio is routed to the context.
        // We MUST connect it to destination (speakers) or it will be silent.
        // Also, creating source twice on same element throws error, so we check sourceRef.
        if (!sourceRef.current) {
          const source = ctx.createMediaElementSource(audioRef.current);
          source.connect(analyser);
          analyser.connect(ctx.destination);
          sourceRef.current = source;
        }

        audioContextRef.current = ctx;
        analyserRef.current = analyser;
      } catch (e) {
        console.warn("Visualizer init failed (likely AudioContext limit):", e);
        // Fallback: Audio will still play via default output if source wasn't redirected.
        // If source WAS redirected in a previous attempt but context died, we might have issues,
        // but for this scope we assume standard usage.
      }
    } else if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
  };

  const startVisualizerLoop = () => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      analyserRef.current!.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dynamic styling based on Rikka's colors
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8; // Scale height

        const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, 'rgba(139, 92, 246, 0.2)'); // Purple 500 low opacity
        gradient.addColorStop(1, 'rgba(192, 132, 252, 0.6)'); // Purple 300 higher opacity

        ctx.fillStyle = gradient;

        // Rounded top bars using cast to any to avoid TS errors on older envs
        ctx.beginPath();

        // We cast ctx to any to support roundRect which might be missing in older TS definitions
        const ctxAny = ctx as any;

        if (typeof ctxAny.roundRect === 'function') {
          ctxAny.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [4, 4, 0, 0]);
        } else {
          ctx.rect(x, canvas.height - barHeight, barWidth, barHeight);
        }
        ctx.fill();

        x += barWidth + 1;
      }

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
  };

  const stopVisualizerLoop = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const togglePlay = () => {
    if (audioRef.current && status === 'success') {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        stopVisualizerLoop();
        // If we were the active player, we are pausing ourselves, 
        // effectively resigning "active" status for the chain? 
        // For now, pausing doesn't clear the global active ID, just stops playback.
      } else {
        // Notify parent to set us as the globally active player (pauses others)
        if (onPlay) onPlay();

        // Actual play logic is handled in the useEffect when `isActive` becomes true.
        // But if we are ALREADY active (just paused), we need to resume manually here
        // or let the prop update handle it?
        // To be responsive, we play immediately.
        audioRef.current.play();
        setIsPlaying(true);
        initVisualizer();
        startVisualizerLoop();
      }
    }
  };

  const onTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const onLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (!isNaN(d) && d !== Infinity) {
        setDuration(d);
      }
    }
  };

  const onEnded = () => {
    setIsPlaying(false);
    stopVisualizerLoop();
    setCurrentTime(0);
    if (audioRef.current) audioRef.current.currentTime = 0;

    // Trigger chain callback
    if (onParentEnded) onParentEnded();
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (status !== 'success') return;
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Filename Generator helper
  const getOutputFilename = () => {
    // 1. Clean the text (remove invalid characters for filenames)
    let cleanText = text.replace(/[\\/:*?"<>|]/g, '').trim();

    // 2. Truncate text to a reasonable length (e.g. 15 chars) to prevent massive filenames
    if (cleanText.length > 15) {
      cleanText = cleanText.substring(0, 15) + '...';
    }

    // 3. Fallback if text only contained invalid chars
    if (!cleanText) cleanText = 'audio';

    // 4. Combine with voice name
    return `[${voiceName}] ${cleanText}.mp3`;
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = getOutputFilename();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleShare = async () => {
    if (!audioUrl) return;

    try {
      // Convert base64 Data URL to Blob (our audioUrls are actually Base64 Data URLs from blobToBase64 in App.tsx)
      const res = await fetch(audioUrl);
      const blob = await res.blob();
      const filename = getOutputFilename();

      const file = new File([blob], filename, { type: 'audio/mpeg' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'RikkaTTS Audio',
          text: text.length > 50 ? text.substring(0, 50) + '...' : text,
        });
      } else {
        // Fallback for browsers that don't support file sharing
        alert("因为安全限制，局域网 HTTP 下无法拉起分享面板。\n提示：请在浏览器将地址改为 https:// 开头（有免责警告点继续），即可开启原生分享！");
      }
    } catch (error) {
      console.error('Error sharing audio:', error);
      // User cancelling the share dialog throws an error, we can ignore it
      if (error instanceof Error && error.name !== 'AbortError') {
        // Fallback on error
        alert("分享失败或被取消。建议直接下载文件后分享。");
      }
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Pending State
  if (status === 'pending') {
    return (
      <div className="relative overflow-hidden rounded-[20px] bg-white border border-[#3C3C43]/5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-3.5 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#F2F2F7] flex items-center justify-center shrink-0">
            <Loader2 className="w-5 h-5 text-[#007AFF] animate-spin" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-3.5 bg-[#F2F2F7] rounded-full w-3/4"></div>
            <div className="h-2.5 bg-[#F2F2F7] rounded-full w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <div className="relative overflow-hidden rounded-[20px] bg-white border border-[#3C3C43]/5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-[#FF3B30]/10 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-[#FF3B30]" />
          </div>
          <div className="flex-1 min-w-0 mt-0.5">
            <p className="text-[#1C1C1E] text-[15px] font-medium mb-1 truncate tracking-tight">{text}</p>
            <p className="text-[12px] text-[#FF3B30]">{errorMessage || "Generation failed"}</p>
          </div>
          <button
            onClick={() => onDelete(id)}
            className="p-2 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-full transition-colors active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className={`relative group overflow-hidden rounded-[20px] transition-all duration-300 ${isActive || isPlaying
      ? 'bg-[#F2F2F7]/50 border border-[#007AFF]/30 shadow-[0_8px_30px_rgba(0,0,0,0.06)] scale-[1.01] z-10'
      : 'bg-white border border-[#3C3C43]/5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.06)] hover:border-[#3C3C43]/10'
      }`}>

      {/* Visualizer Canvas (Compact) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none opacity-40 z-0">
        <canvas ref={canvasRef} className="w-full h-full" width={400} height={50} />
      </div>

      <div className="p-3.5 md:p-4 relative z-10 flex">
        {/* Left Side: Main Content (Text, Metadata, Player) */}
        <div className="flex-1 min-w-0 pr-3">
          {/* Text Content */}
          <div className="mb-2 relative">
            <p className={`text-[15px] md:text-[16px] leading-relaxed font-sans break-words transition-colors line-clamp-4 tracking-tight ${isActive || isPlaying ? 'text-[#000000] font-semibold' : 'text-[#1C1C1E] font-medium'
              }`}>
              {text}
            </p>

            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {cost !== undefined && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] flex-shrink-0 bg-[#F2F2F7] text-[11px] font-medium text-[#8E8E93]">
                  <Coins className="w-3 h-3" />
                  {formatCost(cost)}
                </div>
              )}

              {generationTime !== undefined && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] flex-shrink-0 bg-[#F2F2F7] text-[11px] font-medium text-[#8E8E93]" title="Generation Time">
                  <Timer className="w-3 h-3" />
                  {(generationTime / 1000).toFixed(2)}s
                </div>
              )}

              {isActive && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] flex-shrink-0 bg-[#007AFF]/10 text-[11px] font-semibold text-[#007AFF] animate-pulse">
                  <Activity className="w-3 h-3" />
                  {isPlaying ? '播放中' : '准备就绪'}
                </div>
              )}
            </div>
          </div>

          {/* Player Controls */}
          <div className="flex items-center gap-3 select-none pt-1">
            <button
              onClick={togglePlay}
              className={`w-[38px] h-[38px] flex shrink-0 items-center justify-center rounded-full transition-all focus:outline-none ${isActive || isPlaying
                ? 'bg-[#007AFF] text-white shadow-[0_2px_8px_rgba(0,122,255,0.3)] active:scale-[0.96]'
                : 'bg-[#F2F2F7] text-[#1C1C1E] hover:bg-[#E5E5EA] active:scale-[0.96]'
                }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
            </button>

            {/* Progress Bar Area */}
            <div className="flex-1 flex flex-col gap-1">
              <div className="relative h-2 flex items-center w-full group/slider cursor-pointer">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  step="0.01"
                  value={currentTime}
                  onChange={handleSeek}
                  className="absolute w-full h-full opacity-0 z-20 cursor-pointer"
                />

                <div className="absolute w-full h-1 bg-[#E5E5EA] rounded-full overflow-hidden z-10">
                  <div
                    className={`h-full rounded-full transition-all duration-100 ease-out ${isActive || isPlaying ? 'bg-[#007AFF]' : 'bg-[#8E8E93]'}`}
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>

                <div
                  className={`absolute h-3 w-3 bg-white shadow rounded-full z-10 transform -translate-x-1.5 opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none ${isActive || isPlaying ? 'border border-[#007AFF]' : 'border border-[#8E8E93]'}`}
                  style={{ left: `${progressPercent}%` }}
                ></div>
              </div>

              <div className="flex justify-between text-[11px] font-mono text-[#8E8E93] px-0.5 leading-none">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Action Buttons (Vertical Stack) */}
        <div className="flex flex-col items-center justify-between border-l border-[#3C3C43]/10 pl-2 shrink-0 gap-2">
          <button
            onClick={handleShare}
            className="p-2 text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] rounded-full transition-colors active:scale-95"
            title="分享"
          >
            <Share2 className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </button>

          <button
            onClick={handleDownload}
            className="p-2 text-[#8E8E93] hover:text-[#007AFF] hover:bg-[#F2F2F7] rounded-full transition-colors active:scale-95"
            title="下载"
          >
            <Download className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </button>

          <button
            onClick={() => onDelete(id)}
            className="p-2 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 rounded-full transition-colors active:scale-95"
            title="删除"
          >
            <Trash2 className="w-[18px] h-[18px] md:w-5 md:h-5" />
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        crossOrigin="anonymous"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        className="hidden"
      />
    </div>
  );
};