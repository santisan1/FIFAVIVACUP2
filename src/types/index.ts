export type UserRole = 'admin' | 'player';
export type UserStatus = 'active' | 'inactive';
export type TournamentStatus = 'draft' | 'draw_done' | 'active' | 'finished';
export type Round = 'R16' | 'QF' | 'SF' | 'FINAL';
export type MatchStatus = 'pending' | 'ready' | 'proposed' | 'confirmed';
export type InviteStatus = 'pending' | 'opened';

export interface AppUser {
  id: string;
  name: string;
  nickname: string;
  phone: string;
  avatarUrl?: string;
  psnId?: string;
  role: UserRole;
  status: UserStatus;
  favoriteTeam?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Season {
  id: string;
  name: string;
  year: number;
  status: 'active' | 'archived';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Tournament {
  id: string;
  seasonId: string;
  name: string;
  date: string;
  status: TournamentStatus;
  format: 'single_elimination';
  size: 16;
  championId?: string;
  runnerUpId?: string;
  thirdPlaceId?: string;
  createdBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  finishedAt?: unknown;
}

export interface Participant {
  id: string;
  tournamentId: string;
  userId: string;
  userName: string;
  nickname: string;
  teamName: string;
  seed?: number;
  eliminated: boolean;
  finalPosition?: number;
  inviteStatus: InviteStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Invite {
  id: string;
  userId: string;
  tournamentId: string;
  tokenHash?: string;
  expiresAt: unknown;
  openedAt?: unknown;
  lastUsedAt?: unknown;
  revoked: boolean;
  createdAt?: unknown;
  createdBy: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  seasonId: string;
  round: Round;
  roundLabel: string;
  matchNumber: number;
  bracketPosition: number;
  playerAId?: string;
  playerBId?: string;
  playerAName?: string;
  playerBName?: string;
  teamAName?: string;
  teamBName?: string;
  scoreA?: number;
  scoreB?: number;
  penaltiesA?: number;
  penaltiesB?: number;
  winnerId?: string;
  loserId?: string;
  status: MatchStatus;
  proposedBy?: string;
  confirmedBy?: string;
  photoUrl?: string;
  narrative?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  confirmedAt?: unknown;
}

export interface Goal {
  id: string;
  matchId: string;
  tournamentId: string;
  seasonId: string;
  ownerUserId: string;
  ownerUserName: string;
  scorerName: string;
  minute?: number;
  createdAt?: unknown;
}

export interface Badge {
  id: string;
  userId: string;
  tournamentId?: string;
  seasonId?: string;
  type: string;
  label: string;
  description: string;
  icon: string;
  createdAt?: unknown;
}

export interface ResultProposal {
  id: string;
  matchId: string;
  tournamentId: string;
  proposedBy: string;
  scoreA: number;
  scoreB: number;
  penaltiesA?: number;
  penaltiesB?: number;
  photoUrl?: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt?: unknown;
  resolvedAt?: unknown;
  resolvedBy?: string;
}

export interface SamplePlayer {
  name: string;
  nickname: string;
  phone: string;
  teamName: string;
}
