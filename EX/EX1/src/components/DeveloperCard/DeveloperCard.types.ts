import type { Skill } from '../SkillBadge/SkillBadge.types';

export interface DeveloperCardProps {
  readonly fullName?: string;
  readonly role?: string;
  /** HTTPS image URL; initials will be derived from fullName as a fallback. */
  readonly avatarUrl?: string;
  readonly metrics?: Readonly<Record<string, string | number>>;
  readonly skills?: readonly Skill[];
}
