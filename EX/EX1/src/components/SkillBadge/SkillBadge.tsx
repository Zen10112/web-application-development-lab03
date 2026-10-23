import type { SkillBadgeProps } from './SkillBadge.types';

export function SkillBadge({ skill }: SkillBadgeProps) {
  return <span>{skill.name} ({skill.tier})</span>;
}
