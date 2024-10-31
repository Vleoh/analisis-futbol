import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, PlayCircle } from 'lucide-react';
import { GameStats } from '../types/analysis';
import { VideoAnalyzer } from '../services/VideoAnalyzer';

interface VideoPlayerProps {
  onFrame: (video: HTMLVideoElement) => void;
  isAnalyzing: boolean;
  videoAnalyzer: VideoAnalyzer;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ onFrame, isAnalyzing, videoAnalyzer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [gameStats, setGameStats] = useState<GameStats | null>(null);

  useEffect(() => {
    let animationFrame: number;

    const processFrame = () => {
      if (videoRef.current && canvasRef.current && isPlaying && analysisStarted) {
        onFrame(videoRef.current);
        animationFrame = requestAnimationFrame(processFrame);
      }
    };

    if (isPlaying && analysisStarted) {
      animationFrame = requestAnimationFrame(processFrame);
    }

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, onFrame, analysisStarted]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      if (videoRef.current) {
        videoRef.current.src = url;
      }
      setAnalysisStarted(false);
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const startAnalysis = () => {
    setAnalysisStarted(true);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const analyzeFrame = async () => {
    if (videoRef.current) {
      const stats = await videoAnalyzer.analyzeFrame(videoRef.current);
      setGameStats(stats);
      console.log("Analysis complete:", stats);
    }
  };

  const handleVideoEnded = () => {
    console.log("Video ended, analyzing frame...");
    if (videoRef.current) {
      analyzeFrame();
    }
  };

  const restartAnalysis = () => {
    resetVideo();
    setGameStats(null);
    setAnalysisStarted(false);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full"
          playsInline
          onEnded={handleVideoEnded}
        />
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full pointer-events-none"
        />
        
        {!videoFile && (
          <div className="absolute inset-0 flex items-center justify-center">
            <label className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg cursor-pointer">
              Select Video
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}

        {videoFile && !analysisStarted && !isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <button
              onClick={startAnalysis}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg"
            >
              <PlayCircle size={24} />
              Start Analysis
            </button>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-xl animate-pulse">
              Analyzing video...
            </div>
          </div>
        )}
      </div>

      {videoFile && analysisStarted && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-4 bg-black/50 px-4 py-2 rounded-full">
          <button
            onClick={togglePlay}
            className="p-2 text-white hover:text-blue-400 transition-colors"
            disabled={isAnalyzing}
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
          <button
            onClick={resetVideo}
            className="p-2 text-white hover:text-blue-400 transition-colors"
            disabled={isAnalyzing}
          >
            <RotateCcw size={24} />
          </button>
          <button onClick={restartAnalysis} className="p-2 text-white hover:text-blue-400 transition-colors">
            Restart Analysis
          </button>
        </div>
      )}
    </div>
  );
};