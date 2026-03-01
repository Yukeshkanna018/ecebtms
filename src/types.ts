export interface Member {
  id: number;
  rollNo: string;
  name: string;
  order: number;
}

export interface Role {
  id: string;
  name: string;
  description: string;
}

export interface ScheduleEntry {
  id: number;
  date: string;
  roleId: string;
  originalMemberId: number;
  currentMemberId: number;
  originalMemberName?: string;
  currentMemberName?: string;
  isSubstitution: boolean;
  replacedById?: number;
  status: 'scheduled' | 'completed' | 'absent';
  icebreaker?: string;
  theme?: string;
}

export interface SubstitutionLog {
  id: number;
  date: string;
  absentMemberId: number;
  backupMemberId: number;
  roleId: string;
}

export interface Announcement {
  id: number;
  title: string;
  content: string;
  date: string;
  type: 'info' | 'event' | 'warning';
}

export const ROLES: Role[] = [
  { id: 'TMOD', name: 'Toastmaster of the Day', description: 'The host and director of the meeting.' },
  { id: 'GE', name: 'General Evaluator', description: 'Evaluates everything that takes place during the meeting.' },
  { id: 'TTM', name: 'Table Topics Master', description: 'Leads the impromptu speaking portion of the meeting.' },
  { id: 'TIMER', name: 'Timer', description: 'Responsible for monitoring the time of each meeting segment.' },
  { id: 'AH_COUNTER', name: 'Ah Counter', description: 'Notes overused words and filler sounds.' },
  { id: 'GRAMMARIAN', name: 'Grammarian', description: 'Introduces new words and monitors language usage.' },
  { id: 'SPEAKER_1', name: 'Speaker 1', description: 'Delivers a prepared speech.' },
  { id: 'SPEAKER_2', name: 'Speaker 2', description: 'Delivers a prepared speech.' },
  { id: 'SPEAKER_3', name: 'Speaker 3', description: 'Delivers a prepared speech.' },
  { id: 'EVALUATOR_1', name: 'Evaluator 1', description: 'Provides feedback on Speaker 1.' },
  { id: 'EVALUATOR_2', name: 'Evaluator 2', description: 'Provides feedback on Speaker 2.' },
  { id: 'EVALUATOR_3', name: 'Evaluator 3', description: 'Provides feedback on Speaker 3.' },
  { id: 'TT_SPEAKER_1', name: 'TT Speaker 1', description: 'Participates in Table Topics.' },
  { id: 'TT_SPEAKER_2', name: 'TT Speaker 2', description: 'Participates in Table Topics.' },
  { id: 'TT_SPEAKER_3', name: 'TT Speaker 3', description: 'Participates in Table Topics.' },
];
