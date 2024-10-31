import React, { useState, useEffect } from 'react';
import { VideoPlayer } from './components/VideoPlayer';
import { StatsDisplay } from './components/StatsDisplay';
import { VideoAnalyzer } from './services/VideoAnalyzer';
import { GameStats } from './types/analysis';
import { Activity } from 'lucide-react';

function App() {
  const [analyzer, setAnalyzer] = useState<VideoAnalyzer | null>(null);
  const [stats, setStats] = useState<GameStats>({
    players: [],
    goals: 0,
    totalPasses: 0,
    possession: { team1: 50, team2: 50 },
    timestamp: 0,
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAnalyzer = async () => {
      try {
        const videoAnalyzer = new VideoAnalyzer();
        await videoAnalyzer.initialize();
        setAnalyzer(videoAnalyzer);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAnalyzer();

    return () => {
      if (analyzer) {
        analyzer.dispose();
      }
    };
  }, []);

  const handleFrame = async (video: HTMLVideoElement) => {
    if (analyzer) {
      setIsAnalyzing(true);
      const newStats = await analyzer.analyzeFrame(video);
      setStats(newStats);
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Activity className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Sports Video Analyzer</h1>
          </div>
          <p className="text-gray-600">
            Upload a sports video to analyze player movements, statistics, and game events
          </p>
        </div>

        {isInitializing ? (
          <div className="text-center text-blue-600">
            <div className="animate-pulse">Initializing analyzer...</div>
          </div>
        ) : (
          <div className="space-y-8">
            <VideoPlayer 
              onFrame={handleFrame}
              isAnalyzing={isAnalyzing}
              videoAnalyzer={analyzer}
            />

            <StatsDisplay stats={stats} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;