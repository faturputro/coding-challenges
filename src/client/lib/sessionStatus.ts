import type { SessionStatus } from './api';

export const SESSION_STATUS: Record<SessionStatus, { label: string; class: string }> = {
  not_started: { label: 'Not started', class: 'bg-secondary text-secondary-foreground' },
  in_progress: { label: 'In progress', class: 'bg-primary text-primary-foreground' },
  finished: { label: 'Finished', class: 'border border-input text-muted-foreground' },
};

export const statusBadge = (status: string) =>
  SESSION_STATUS[status as SessionStatus] ?? { label: status, class: SESSION_STATUS.not_started.class };
