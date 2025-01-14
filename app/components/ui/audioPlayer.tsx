import React, { useState, useEffect, useRef } from 'react';
import { Slider } from "./slider";
import { Button } from "./button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string | null;
  onPlay?: () => void;
  onPause?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, onPlay, onPause }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [duration, setDuration] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const handleLoadedMetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    const handleTimeUpdate = () => {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }
    };

    if (audioRef.current) {
      audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      }
    };
  }, [audioUrl]);

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const togglePlay = (): void => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        onPause?.();
      } else {
        audioRef.current.play();
        onPlay?.();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeChange = (newTime: number[]): void => {
    if (audioRef.current) {
      audioRef.current.currentTime = newTime[0];
      setCurrentTime(newTime[0]);
    }
  };

  const handleVolumeChange = (newVolume: number[]): void => {
    if (audioRef.current) {
      const volumeValue = newVolume[0];
      audioRef.current.volume = volumeValue;
      setVolume(volumeValue);
      setIsMuted(volumeValue === 0);
    }
  };

  const toggleMute = (): void => {
    if (audioRef.current) {
      const newMutedState = !isMuted;
      audioRef.current.volume = newMutedState ? 0 : volume;
      setIsMuted(newMutedState);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black/80 text-white p-4 flex flex-col gap-2">
      <audio ref={audioRef} src={audioUrl || undefined} />
      
      <div className="flex items-center gap-4">
        <Button 
          onClick={togglePlay}
          variant="ghost" 
          size="icon"
          className="text-white hover:text-gray-300"
        >
          {isPlaying ? <Pause size={24} /> : <Play size={24} />}
        </Button>

        <span className="text-sm w-16">{formatTime(currentTime)}</span>
        
        <div className="flex-1">
          <Slider
            value={[currentTime]}
            min={0}
            max={duration}
            step={1}
            onValueChange={handleTimeChange}
            className="w-full"
          />
        </div>

        <span className="text-sm w-16">{formatTime(duration)}</span>

        <Button
          onClick={toggleMute}
          variant="ghost"
          size="icon"
          className="text-white hover:text-gray-300"
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </Button>

        <div className="w-24">
          <Slider
            value={[isMuted ? 0 : volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;