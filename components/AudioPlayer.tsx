import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, Volume2, Download } from 'lucide-react';
import { formatTime } from '../utils/audioUtils';

interface AudioPlayerProps {
  audioUrl: string;
  text: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, text }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
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
    setCurrentTime(0);
    if(audioRef.current) audioRef.current.currentTime = 0;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `speech-${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Create a gradient for the slider track
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="bg-[#F5F7FB] rounded-lg p-5 w-full border border-gray-100 shadow-sm transition-all hover:shadow-md">
      <div className="mb-4 text-gray-800 text-sm font-medium leading-relaxed">
        {text}
      </div>

      <div className="flex items-center gap-3 select-none">
        {/* Play/Pause Button */}
        <button 
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-slate-600 hover:text-[#7F56D9] hover:border-purple-200 transition-colors focus:outline-none shadow-sm"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
        </button>

        {/* Current Time */}
        <span className="text-xs text-slate-500 font-mono w-9 text-right">
          {formatTime(currentTime)}
        </span>

        {/* Slider */}
        <div className="relative flex-1 h-6 flex items-center group">
            {/* Custom Range Input */}
            <input
                type="range"
                min="0"
                max={duration || 0}
                step="0.01"
                value={currentTime}
                onChange={handleSeek}
                className="absolute w-full h-full opacity-0 cursor-pointer z-20"
            />
            
            {/* Visual Track Background */}
            <div className="absolute w-full h-1.5 bg-gray-200 rounded-full overflow-hidden z-10 pointer-events-none">
                {/* Progress Fill */}
                <div 
                    className="h-full bg-slate-800 rounded-full group-hover:bg-[#7F56D9] transition-colors"
                    style={{ width: `${progressPercent}%` }}
                ></div>
            </div>

            {/* Thumb */}
            <div 
                className="absolute h-3 w-3 bg-slate-600 rounded-full z-10 pointer-events-none shadow-md transform -translate-x-1.5 group-hover:bg-[#7F56D9] group-hover:scale-110 transition-all"
                style={{ left: `${progressPercent}%` }}
            ></div>
        </div>

        {/* Total Duration */}
        <span className="text-xs text-slate-500 font-mono w-9">
          {formatTime(duration)}
        </span>

        {/* Volume Icon */}
        <div className="text-slate-400">
          <Volume2 className="w-4 h-4" />
        </div>
        
        <div className="w-px h-4 bg-gray-300 mx-1"></div>

        {/* Download Button */}
        <button 
          onClick={handleDownload}
          className="text-slate-500 hover:text-[#7F56D9] transition-colors"
          title="Download Audio"
        >
          <Download className="w-5 h-5" />
        </button>
      </div>

      <audio 
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
        className="hidden"
      />
    </div>
  );
};