/**
 * Game type definitions
 */

// tile data structure
export interface Block {
  id: string          // unique identifier
  row: number         // row index
  col: number         // column index (0-3)
  isBlack: boolean    // whether the tile is black
  y: number           // Y-axis position in pixels
  clicked: boolean    // whether the tile has been clicked
}

// game state
export interface GameState {
  score: number           // current score
  speed: number           // scroll speed (px/frame)
  isPlaying: boolean      // whether the game is running
  isPaused: boolean       // pause state
  blocks: Block[][]       // tile grid [row][column]
  highScore: number       // historical high score
  gameOver: boolean       // whether the game ended
  combo: number           // combo count
  totalClicks: number     // total number of clicks
  correctClicks: number   // number of correct clicks
  startTime: number       // game start timestamp
  endTime?: number        // game end timestamp
}

// score rank
export enum ScoreRank {
  S = 'S',      // 90-100 points
  A = 'A',      // 80-89 points
  B = 'B',      // 70-79 points
  C = 'C',      // 60-69 points
  D = 'D',      // 0-59 points
}

// game performance evaluation
export interface GamePerformance {
  score: number              // final score
  rank: ScoreRank            // rank evaluation
  accuracy: number           // accuracy percentage (0-100)
  avgSpeed: number           // average speed (tiles/second)
  maxCombo: number           // maximum combo
  duration: number           // duration in seconds
  points: number             // reward points earned
  message: string            // evaluation message
}

// game history record
export interface GameRecord {
  id: string                 // record identifier
  timestamp: number          // timestamp
  score: number              // score
  rank: ScoreRank            // rank
  accuracy: number           // accuracy
  duration: number           // duration
  points: number             // points earned
}

// game statistics
export interface GameStats {
  totalGames: number         // total games played
  totalPoints: number        // total points earned
  highScore: number          // highest score
  bestAccuracy: number       // best accuracy
  totalPlayTime: number      // total playtime in seconds
  averageScore: number       // average score
  rankDistribution: {        // distribution of ranks
    S: number
    A: number
    B: number
    C: number
    D: number
  }
}

// game configuration
export interface GameConfig {
  initialSpeed: number       // initial speed
  speedIncrement: number     // speed increment
  speedIncrementInterval: number  // score interval for speed increase
  blockHeight: number        // tile height
  boardWidth: number         // board width
  boardHeight: number        // board height
  columns: number            // number of columns
}
