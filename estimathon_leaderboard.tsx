import React, { useState, useEffect, useRef } from 'react';
import { Trophy, RefreshCw, Users, Target, AlertCircle, Settings } from 'lucide-react';

export default function EstimathonLeaderboard() {
  const [teams, setTeams] = useState([]);
  const [previousRanks, setPreviousRanks] = useState({});
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [csvUrl, setCsvUrl] = useState('');
  const [isConfigured, setIsConfigured] = useState(false);
  const [correctAnswers, setCorrectAnswers] = useState({});
  const [activeTab, setActiveTab] = useState('leaderboard');

  const TOTAL_PROBLEMS = 13;

  // Parse scientific notation (e.g., "3e6", "1.5e-3", "4.2E10")
  const parseScientificNotation = (value) => {
    if (!value) return null;
    const str = value.toString().trim().toLowerCase();
    // Handle scientific notation with 'e'
    if (str.includes('e')) {
      return parseFloat(str);
    }
    // Handle regular numbers
    return parseFloat(str);
  };

  // Calculate score based on Estimathon rules: product of interval widths for correct answers
  // Score doubles for each wrong/blank answer
  const calculateTeamScore = (submissions, answers) => {
    const latestSubmissions = {};
    
    // Get only the latest submission for each problem
    submissions.forEach(sub => {
      const problemNum = sub.problemNumber;
      if (!latestSubmissions[problemNum] || sub.timestamp > latestSubmissions[problemNum].timestamp) {
        latestSubmissions[problemNum] = sub;
      }
    });

    let score = 1;
    let wrongCount = 0;
    const details = [];

    for (let i = 1; i <= TOTAL_PROBLEMS; i++) {
      const sub = latestSubmissions[i];
      const correctAnswer = answers[i];

      if (!sub || !correctAnswer) {
        // Problem is blank or no correct answer set
        wrongCount++;
        details.push({ problem: i, status: 'blank', width: null });
      } else {
        const min = parseScientificNotation(sub.min);
        const max = parseScientificNotation(sub.max);
        const correct = parseScientificNotation(correctAnswer);

        if (min === null || max === null || correct === null) {
          // Invalid number format
          wrongCount++;
          details.push({ problem: i, status: 'wrong', width: null });
        } else if (min <= correct && correct <= max) {
          // Interval is good
          const width = max - min;
          score *= width;
          details.push({ problem: i, status: 'correct', width, min, max });
        } else {
          // Interval is wrong
          wrongCount++;
          details.push({ problem: i, status: 'wrong', width: null, min, max });
        }
      }
    }

    // Double the score for each wrong/blank answer
    score *= Math.pow(2, wrongCount);

    return { score, wrongCount, details };
  };

  const fetchData = async () => {
    if (!csvUrl) return;
    
    setLoading(true);
    try {
      const response = await fetch(csvUrl);
      const text = await response.text();
      
      // Parse CSV
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        setLoading(false);
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      
      // Expected columns: Timestamp, Team Name, Problem Number, Min, Max
      const teamSubmissions = {};
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
        
        const timestamp = values[0];
        const teamName = values[1];
        const problemNumber = parseInt(values[2]);
        const min = values[3];
        const max = values[4];
        
        if (!teamName || !problemNumber) continue;
        
        if (!teamSubmissions[teamName]) {
          teamSubmissions[teamName] = [];
        }
        
        teamSubmissions[teamName].push({
          timestamp: new Date(timestamp),
          problemNumber,
          min,
          max
        });
      }
      
      // Calculate scores for each team
      const scoredTeams = Object.entries(teamSubmissions).map(([name, submissions]) => {
        const result = calculateTeamScore(submissions, correctAnswers);
        return {
          name,
          ...result,
          totalSubmissions: submissions.length
        };
      });
      
      // Sort by score (lowest is best in Estimathon!)
      const sortedTeams = scoredTeams
        .sort((a, b) => a.score - b.score)
        .map((team, idx) => ({ ...team, rank: idx + 1 }));
      
      // Store previous ranks before updating
      const newPreviousRanks = {};
      teams.forEach(team => {
        newPreviousRanks[team.name] = team.rank;
      });
      setPreviousRanks(newPreviousRanks);
      
      setTeams(sortedTeams);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isConfigured) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [csvUrl, isConfigured, correctAnswers]);

  const getMedalColor = (rank) => {
    if (rank === 1) return 'text-yellow-500';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-gray-600';
  };

  const formatScore = (score) => {
    if (score >= 1e9) return score.toExponential(2);
    if (score >= 1e6) return (score / 1e6).toFixed(2) + 'M';
    if (score >= 1e3) return (score / 1e3).toFixed(2) + 'K';
    return score.toFixed(2);
  };

  const getRankChange = (teamName, currentRank) => {
    const prevRank = previousRanks[teamName];
    if (!prevRank) return null;
    if (prevRank === currentRank) return 'same';
    if (prevRank > currentRank) return 'up';
    return 'down';
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20">
            <div className="text-center mb-8">
              <Target className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
              <h1 className="text-4xl font-bold text-white mb-2">Estimathon Setup</h1>
              <p className="text-blue-200">Configure your Google Forms connection</p>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-500/20 border border-blue-400/30 rounded-lg p-4">
                <h3 className="text-white font-semibold mb-3">📋 Google Form Structure</h3>
                <p className="text-blue-200 text-sm mb-3">Create a form with exactly these 4 questions in order:</p>
                <div className="space-y-2">
                  <div className="bg-white/10 rounded p-2">
                    <p className="text-yellow-400 font-semibold text-sm">Question 1: Team Name</p>
                    <p className="text-blue-200 text-xs">Type: Short answer text</p>
                  </div>
                  <div className="bg-white/10 rounded p-2">
                    <p className="text-yellow-400 font-semibold text-sm">Question 2: Problem Number</p>
                    <p className="text-blue-200 text-xs">Type: Short answer or Dropdown (1-13)</p>
                  </div>
                  <div className="bg-white/10 rounded p-2">
                    <p className="text-yellow-400 font-semibold text-sm">Question 3: Minimum Value</p>
                    <p className="text-blue-200 text-xs">Type: Short answer text</p>
                  </div>
                  <div className="bg-white/10 rounded p-2">
                    <p className="text-yellow-400 font-semibold text-sm">Question 4: Maximum Value</p>
                    <p className="text-blue-200 text-xs">Type: Short answer text</p>
                  </div>
                </div>
                <p className="text-yellow-300 text-xs mt-3 font-semibold">
                  ⚠️ Teams submit this form multiple times (up to 18 submissions total)<br/>
                  ✓ Scientific notation supported: 3e6, 1.5e-3, 4.2E10, etc.
                </p>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">
                  Setup Instructions:
                </label>
                <ol className="text-blue-200 space-y-2 text-sm">
                  <li>1. Open your Google Form responses in Google Sheets</li>
                  <li>2. Click File → Share → Publish to web</li>
                  <li>3. Choose "Comma-separated values (.csv)" format</li>
                  <li>4. Copy the published URL and paste it below</li>
                </ol>
              </div>
              
              <div>
                <label className="block text-white font-semibold mb-2">
                  Google Sheets CSV URL:
                </label>
                <input
                  type="text"
                  value={csvUrl}
                  onChange={(e) => setCsvUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/e/..."
                  className="w-full px-4 py-3 rounded-lg bg-white/20 border border-white/30 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              
              <button
                onClick={() => setIsConfigured(true)}
                disabled={!csvUrl}
                className="w-full py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Start Leaderboard
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Trophy className="w-12 h-12 text-yellow-400" />
            <h1 className="text-5xl font-bold text-white">Estimathon</h1>
          </div>
          <p className="text-xl text-blue-200">Live Leaderboard - Lowest Score Wins!</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              activeTab === 'leaderboard'
                ? 'bg-white/20 text-white border-2 border-blue-400'
                : 'bg-white/5 text-blue-200 hover:bg-white/10'
            }`}
          >
            <Trophy className="inline w-5 h-5 mr-2" />
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab('answers')}
            className={`flex-1 py-3 px-6 rounded-lg font-semibold transition-all ${
              activeTab === 'answers'
                ? 'bg-white/20 text-white border-2 border-blue-400'
                : 'bg-white/5 text-blue-200 hover:bg-white/10'
            }`}
          >
            <Settings className="inline w-5 h-5 mr-2" />
            Correct Answers
          </button>
        </div>

        {/* Leaderboard Tab */}
        {activeTab === 'leaderboard' && (
          <>
            {/* Stats Bar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-blue-200 text-sm">Teams</p>
                    <p className="text-white text-2xl font-bold">{teams.length}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <div className="flex items-center gap-3">
                  <RefreshCw className={`w-8 h-8 text-green-400 ${loading ? 'animate-spin' : ''}`} />
                  <div>
                    <p className="text-blue-200 text-sm">Last Update</p>
                    <p className="text-white text-lg font-semibold">
                      {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Loading...'}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
                <button
                  onClick={fetchData}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Now
                </button>
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
              {teams.length === 0 ? (
                <div className="text-center py-12">
                  <Target className="w-16 h-16 mx-auto mb-4 text-blue-400 opacity-50" />
                  <p className="text-blue-200 text-lg">Waiting for submissions...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {teams.map((team) => {
                    const rankChange = getRankChange(team.name, team.rank);
                    return (
                      <div
                        key={team.name}
                        className={`rounded-xl transition-all duration-500 ease-in-out ${
                          team.rank <= 3
                            ? 'bg-white/20 border-2 border-yellow-400/50'
                            : 'bg-white/5 border border-white/10'
                        } ${rankChange === 'up' ? 'animate-pulse' : ''}`}
                        style={{
                          transform: rankChange === 'up' ? 'translateY(-4px)' : rankChange === 'down' ? 'translateY(4px)' : 'translateY(0)',
                          transition: 'transform 0.5s ease-in-out'
                        }}
                      >
                        <div className="flex items-center gap-4 p-4">
                          <div className={`text-3xl font-bold ${getMedalColor(team.rank)} min-w-[60px] text-center relative`}>
                            {team.rank <= 3 ? (
                              <Trophy className="w-8 h-8 mx-auto" />
                            ) : (
                              `#${team.rank}`
                            )}
                            {rankChange === 'up' && (
                              <span className="absolute -top-2 -right-2 text-green-400 text-sm">↑</span>
                            )}
                            {rankChange === 'down' && (
                              <span className="absolute -top-2 -right-2 text-red-400 text-sm">↓</span>
                            )}
                          </div>
                          
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-white">{team.name}</h3>
                            <p className="text-blue-200 text-sm">
                              {team.totalSubmissions} submission(s) • {team.wrongCount} wrong/blank
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <p className="text-3xl font-bold text-yellow-400">{formatScore(team.score)}</p>
                            <p className="text-blue-200 text-sm">score</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-8 text-blue-300 text-sm space-y-1">
              <p>Updates automatically every 30 seconds</p>
              <p className="text-xs">Score = Product of interval widths × 2^(wrong answers)</p>
            </div>
          </>
        )}

        {/* Answers Tab */}
        {activeTab === 'answers' && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Set Correct Answers (Organizer Only)
            </h2>
            <p className="text-blue-200 mb-6">
              Enter the correct numerical answer for each problem. Teams' intervals will be checked against these values.
              You can update these during the competition as you verify answers.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: TOTAL_PROBLEMS }, (_, i) => i + 1).map(num => (
                <div key={num} className="bg-white/10 rounded-lg p-3">
                  <label className="block text-yellow-400 font-semibold text-sm mb-2">
                    Problem {num}
                  </label>
                  <input
                    type="text"
                    value={correctAnswers[num] || ''}
                    onChange={(e) => setCorrectAnswers({...correctAnswers, [num]: e.target.value})}
                    placeholder="e.g., 3500"
                    className="w-full px-3 py-2 rounded bg-white/20 border border-white/30 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400 text-center font-mono"
                  />
                  {correctAnswers[num] && (
                    <p className="text-green-400 text-xs mt-1 text-center">✓ Set</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-6 bg-yellow-500/20 border border-yellow-400/30 rounded-lg p-4">
              <p className="text-yellow-200 text-sm">
                <strong>Scientific notation supported:</strong> Teams can use formats like 3e6 (3×10⁶), 1.5e-3 (0.0015), or 4.2E10.
                You can also enter correct answers in scientific notation (e.g., "3e6" for 3,000,000).
              </p>
              <p className="text-yellow-200 text-sm mt-2">
                <strong>Note:</strong> Scores calculate only for problems with correct answers entered. 
                Problems without answers count as "blank" and double the team's score.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}