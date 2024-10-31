import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { GameStats, PlayerStats } from '../types/analysis';

export class VideoAnalyzer {
  private poseDetector: poseDetection.PoseDetector | null = null;
  private previousPositions: Map<number, { x: number; y: number }> = new Map();
  private previousBallPosition: { x: number; y: number } | null = null;
  private frameCount = 0;
  private currentPlayerIndex = 0;
  private cachedPoses: poseDetection.Pose[] = [];
  private stats: GameStats = {
    players: [],
    goals: 0,
    totalPasses: 0,
    possession: { team1: 50, team2: 50 },
    timestamp: 0,
  };

  async initialize() {
    await tf.ready();
    
    const model = poseDetection.SupportedModels.BlazePose;
    this.poseDetector = await poseDetection.createDetector(model, {
      runtime: 'tfjs',
      modelType: 'full',
      enableSmoothing: true,
    });
  }

  private async detectPoses(video: HTMLVideoElement): Promise<poseDetection.Pose[]> {
    if (!this.poseDetector) return [];

    if (this.frameCount % 10 === 0) {
      const poses = await this.poseDetector.estimatePoses(video, {
        flipHorizontal: false,
        maxPoses: 1,
      });

      console.log("Detected poses:", poses);

      if (poses.length > 0) {
        this.cachedPoses[this.currentPlayerIndex] = poses[0];
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % 22;
      }
    }
    this.frameCount++;

    return this.cachedPoses.filter(Boolean);
  }

  private detectBallFromPoses(poses: poseDetection.Pose[]): { x: number; y: number } | null {
    // Use feet positions to estimate ball location
    for (const pose of poses) {
      const leftAnkle = pose.keypoints.find(kp => kp.name === 'left_ankle');
      const rightAnkle = pose.keypoints.find(kp => kp.name === 'right_ankle');
      const leftKnee = pose.keypoints.find(kp => kp.name === 'left_knee');
      const rightKnee = pose.keypoints.find(kp => kp.name === 'right_knee');
      
      if (leftAnkle && rightAnkle && leftKnee && rightKnee && 
          leftAnkle.score && rightAnkle.score && leftKnee.score && rightKnee.score) {
        
        // Check for kicking motion
        const leftLegDiff = Math.abs(leftKnee.y - leftAnkle.y);
        const rightLegDiff = Math.abs(rightKnee.y - rightAnkle.y);
        const isKicking = leftLegDiff > 50 || rightLegDiff > 50;

        if (isKicking) {
          const kickingAnkle = leftLegDiff > rightLegDiff ? leftAnkle : rightAnkle;
          if (kickingAnkle.score > 0.7) {
            const kickDirection = kickingAnkle === leftAnkle ? -1 : 1;
            return {
              x: kickingAnkle.x + (kickDirection * 20),
              y: kickingAnkle.y + 10
            };
          }
        }

        // Check for dribbling
        const isLowPosition = leftAnkle.y > (pose.keypoints[0].y + 150) || 
                            rightAnkle.y > (pose.keypoints[0].y + 150);
        
        if (isLowPosition && (leftAnkle.score > 0.7 || rightAnkle.score > 0.7)) {
          const bestAnkle = leftAnkle.score > rightAnkle.score ? leftAnkle : rightAnkle;
          return {
            x: bestAnkle.x,
            y: bestAnkle.y + 10
          };
        }
      }
    }

    const goalkeeper = this.detectGoalkeeper(poses);
    if (goalkeeper) {
      const hands = this.detectGoalkeeperHands(goalkeeper);
      if (hands) return hands;
    }

    return this.previousBallPosition;
  }

  private detectGoalkeeper(poses: poseDetection.Pose[]): poseDetection.Pose | null {
    return poses.find(pose => {
      const nose = pose.keypoints.find(kp => kp.name === 'nose');
      if (!nose) return false;
      return nose.x < 100 || nose.x > (1920 - 100);
    }) || null;
  }

  private detectGoalkeeperHands(goalkeeper: poseDetection.Pose): { x: number; y: number } | null {
    const leftWrist = goalkeeper.keypoints.find(kp => kp.name === 'left_wrist');
    const rightWrist = goalkeeper.keypoints.find(kp => kp.name === 'right_wrist');
    
    if (leftWrist && rightWrist && leftWrist.score && rightWrist.score) {
      if (leftWrist.score > 0.7 || rightWrist.score > 0.7) {
        const bestWrist = leftWrist.score > rightWrist.score ? leftWrist : rightWrist;
        return { x: bestWrist.x, y: bestWrist.y };
      }
    }
    return null;
  }

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }) {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  private detectPass(ballPos: { x: number; y: number } | null) {
    if (!ballPos || !this.previousBallPosition) return false;
    const ballSpeed = this.calculateDistance(this.previousBallPosition, ballPos);
    return ballSpeed > 50;
  }

  private detectGoal(ballPos: { x: number; y: number } | null, videoWidth: number, videoHeight: number): boolean {
    if (!ballPos) return false;
    
    const goalAreaWidth = videoWidth * 0.05;
    const goalAreaHeight = videoHeight * 0.25;
    const goalAreaTop = (videoHeight - goalAreaHeight) / 2;
    const goalAreaBottom = (videoHeight + goalAreaHeight) / 2;
    
    return (
      (ballPos.x < goalAreaWidth && ballPos.y > goalAreaTop && ballPos.y < goalAreaBottom) || 
      (ballPos.x > (videoWidth - goalAreaWidth) && ballPos.y > goalAreaTop && ballPos.y < goalAreaBottom)
    );
  }

  async analyzeFrame(video: HTMLVideoElement): Promise<GameStats> {
    try {
      const poses = await this.detectPoses(video);
      const ballPosition = this.detectBallFromPoses(poses);
      
      poses.forEach((pose, index) => {
        const position = {
          x: pose.keypoints[0].x,
          y: pose.keypoints[0].y,
        };

        const previousPosition = this.previousPositions.get(index);
        const distance = previousPosition ? this.calculateDistance(previousPosition, position) : 0;

        const playerStats = this.stats.players[index] || {
          id: index,
          position,
          distanceCovered: 0,
          possession: 0,
          passes: 0,
          ballLost: 0,
          ballRecovered: 0,
        };

        playerStats.distanceCovered += distance;
        playerStats.position = position;
        
        if (ballPosition) {
          const distanceToBall = this.calculateDistance(position, ballPosition);
          const POSSESSION_THRESHOLD = 30;
          
          const hadPossession = this.previousBallPosition && 
            this.calculateDistance(position, this.previousBallPosition) < POSSESSION_THRESHOLD;
          const hasPossession = distanceToBall < POSSESSION_THRESHOLD;
          
          if (hasPossession) {
            playerStats.possession++;
            if (this.detectPass(ballPosition)) {
              playerStats.passes++;
              this.stats.totalPasses++;
            }
          }
          
          if (hadPossession && !hasPossession) {
            playerStats.ballLost++;
          } else if (!hadPossession && hasPossession) {
            playerStats.ballRecovered++;
          }
        }
        
        this.stats.players[index] = playerStats;
        this.previousPositions.set(index, position);
      });

      if (ballPosition) {
        if (this.detectGoal(ballPosition, video.videoWidth, video.videoHeight)) {
          this.stats.goals++;
        }
        this.previousBallPosition = ballPosition;
      }

      const totalPossession = this.stats.players.reduce((sum, player) => sum + player.possession, 0);
      if (totalPossession > 0) {
        const team1Possession = this.stats.players
          .filter(p => p.id < this.stats.players.length / 2)
          .reduce((sum, player) => sum + player.possession, 0);
        
        this.stats.possession = {
          team1: Math.round((team1Possession / totalPossession) * 100),
          team2: Math.round(((totalPossession - team1Possession) / totalPossession) * 100)
        };
      }

      this.stats.timestamp = video.currentTime;
      return this.stats;
    } catch (error) {
      console.error("Error analyzing frame:", error);
      // Manejo de errores, tal vez devolver estadísticas vacías o un estado de error
      return {
        players: [],
        goals: 0,
        totalPasses: 0,
        possession: { team1: 0, team2: 0 },
        timestamp: 0,
      };
    }
  }

  dispose() {
    if (this.poseDetector) {
      this.poseDetector.dispose();
    }
  }
}