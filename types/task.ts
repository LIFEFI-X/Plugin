// task type definitions
export interface Task {
  id: string
  type: 'visit' | 'watch' // visit type: visit = visit duration, watch = watch duration
  platform: 'x' | 'youtube' // platform
  title: string // task title
  description: string // task description
  milestones: TaskMilestone[] // milestone rewards
  currentDuration: number // current duration in seconds
  isActive: boolean // whether the task is active
  startTime?: number // start timestamp
  lastUpdateTime?: number // last update timestamp
}

// task milestone
export interface TaskMilestone {
  duration: number // required duration in seconds
  reward: number // reward GPT amount
  claimed: boolean // whether the reward is claimed
}

// GPT balance record
export interface GPTBalance {
  total: number // total balance
  lastUpdate: number // last update timestamp
}

// reward record
export interface RewardRecord {
  id: string
  taskId: string
  platform: 'x' | 'youtube'
  milestone: number // milestone index
  reward: number // reward amount
  timestamp: number // claim time
}

// visit session
export interface VisitSession {
  platform: 'x' | 'youtube'
  startTime: number // session start time
  lastActiveTime: number // last active time
  duration: number // accumulated duration in seconds
  url: string // current URL
}

