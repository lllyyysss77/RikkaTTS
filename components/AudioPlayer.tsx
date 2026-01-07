import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download, Coins, Timer, Loader2, AlertCircle, Trash2, Activity } from 'lucide-react';
import { formatTime, formatCost } from '../utils/audioUtils';

interface AudioPlayerProps {
  id: string;
  audioUrl: string;
  text: string;
  cost?: number;
  generationTime?: number;
  status?: 'pending' | 'success' | 'error';
  errorMessage?: string;
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
            audioContextRef.current.close().catch(() => {});
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
    if(audioRef.current) audioRef.current.currentTime = 0;
    
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

  const handleDownload = () => {
    if (status !== 'success') return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `rikka-tts-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Pending State
  if (status === 'pending') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-white/40 backdrop-blur-md border border-purple-100 shadow-sm p-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
             <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-purple-100/50 rounded w-3/4"></div>
            <div className="h-2.5 bg-purple-100/50 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (status === 'error') {
    return (
      <div className="relative overflow-hidden rounded-xl bg-red-50/50 backdrop-blur-md border border-red-100 shadow-sm p-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
             <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-gray-800 text-xs font-medium mb-0.5 truncate">{text}</p>
             <p className="text-[10px] text-red-500">{errorMessage || "Generation failed"}</p>
          </div>
          <button 
            onClick={() => onDelete(id)}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // Success State
  return (
    <div className={`relative group overflow-hidden rounded-xl backdrop-blur-xl border transition-all duration-300 ${
        isActive || isPlaying
        ? 'bg-purple-50/90 border-purple-300 shadow-md shadow-purple-200/50 scale-[1.01] z-10' 
        : 'bg-white/70 border-white/60 shadow-lg hover:shadow-purple-100 hover:border-purple-100'
    }`}>
      
      {/* Visualizer Canvas (Compact) */}
      <div className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none opacity-80 z-0">
         <canvas ref={canvasRef} className="w-full h-full" width={400} height={50} />
      </div>

      <div className="p-3 relative z-10">
        {/* Text Content */}
        <div className="mb-2 pr-6 relative">
           <p className={`text-sm font-medium leading-relaxed font-sans break-words transition-colors line-clamp-3 ${
               isActive || isPlaying ? 'text-purple-900' : 'text-gray-700 opacity-90'
           }`}>
             {text}
           </p>
           
           <button 
             onClick={() => onDelete(id)}
             className="absolute -top-1 -right-1 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
             title="删除 (Delete)"
           >
             <Trash2 className="w-3.5 h-3.5" />
           </button>

           <div className="flex flex-wrap items-center gap-1.5 mt-2">
             {cost !== undefined && (
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-50/80 border border-purple-100/50 text-[10px] font-semibold text-purple-700 shadow-sm backdrop-blur-sm">
                 <Coins className="w-2.5 h-2.5" />
                 {formatCost(cost)}
               </div>
             )}
             
             {generationTime !== undefined && (
               <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50/80 border border-blue-100/50 text-[10px] font-semibold text-blue-700 shadow-sm backdrop-blur-sm" title="Generation Time">
                 <Timer className="w-2.5 h-2.5" />
                 {(generationTime / 1000).toFixed(2)}s
               </div>
             )}

             {isActive && (
                 <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-bold border border-green-200 animate-pulse backdrop-blur-sm shadow-sm">
                     <Activity className="w-2.5 h-2.5" /> 
                     {isPlaying ? '播放中' : '准备就绪'}
                 </div>
             )}
           </div>
        </div>

        {/* Player Controls */}
        <div className="flex items-center gap-3 select-none pt-1">
          <button 
            onClick={togglePlay}
            className={`w-9 h-9 flex shrink-0 items-center justify-center rounded-full text-white shadow-md transition-all focus:outline-none ${
                isActive || isPlaying 
                ? 'bg-purple-600 shadow-purple-300 scale-105 ring-2 ring-purple-200' 
                : 'bg-gradient-to-br from-purple-500 to-indigo-500 shadow-purple-200 hover:scale-105 active:scale-95'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
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
              
              <div className="absolute w-full h-1 bg-gray-200/70 rounded-full overflow-hidden z-10">
                  <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-100 ease-out"
                      style={{ width: `${progressPercent}%` }}
                  ></div>
              </div>
              
              <div 
                  className="absolute h-2.5 w-2.5 bg-white border-2 border-purple-500 rounded-full z-10 shadow-sm transform -translate-x-1 opacity-0 group-hover/slider:opacity-100 transition-opacity pointer-events-none"
                  style={{ left: `${progressPercent}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-gray-400 px-0.5 leading-none">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <button 
            onClick={handleDownload}
            className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Download Audio"
          >
            <Download className="w-4 h-4" />
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