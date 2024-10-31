import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { GameStats } from '../types/analysis';

interface StatsDisplayProps {
  stats: GameStats;
  isAnalyzing: boolean;
}

export const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, isAnalyzing }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Goals</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.goals}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Total Passes</h3>
          <p className="text-3xl font-bold text-green-600">{stats.totalPasses}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Possession</h3>
          <div className="flex justify-between">
            <span className="text-xl font-bold text-purple-600">
              {stats.possession.team1}%
            </span>
            <span className="text-xl font-bold text-purple-600">
              {stats.possession.team2}%
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Player Distance Covered</h3>
          <LineChart width={600} height={300} data={stats.players}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="id" label="Player ID" />
            <YAxis label="Distance (m)" />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="distanceCovered" stroke="#8884d8" />
          </LineChart>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-4 py-2">Player</th>
                <th className="px-4 py-2">Distance</th>
                <th className="px-4 py-2">Passes</th>
                <th className="px-4 py-2">Ball Lost</th>
                <th className="px-4 py-2">Ball Recovered</th>
              </tr>
            </thead>
            <tbody>
              {stats.players.map((player) => (
                <tr key={player.id}>
                  <td className="border px-4 py-2">Player {player.id}</td>
                  <td className="border px-4 py-2">{player.distanceCovered}m</td>
                  <td className="border px-4 py-2">{player.passes}</td>
                  <td className="border px-4 py-2">{player.ballLost}</td>
                  <td className="border px-4 py-2">{player.ballRecovered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAnalyzing && (
        <div className="text-center">
          <div className="animate-pulse">Analyzing video...</div>
        </div>
      )}
    </div>
  );
};