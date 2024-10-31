export interface PlayerStats {
  id: number;
  position: { x: number; y: number };
  distanceCovered: number;
  possession: number;
  passes: number;
  ballLost: number;
  ballRecovered: number;
}

export interface GameStats {
  players: PlayerStats[];
  goals: number;
  totalPasses: number;
  possession: { team1: number; team2: number };
  timestamp: number;
}