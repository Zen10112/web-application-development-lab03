import type { SkillBadgeProps } from './SkillBadge.types';
import styles from '../DeveloperCard/DeveloperCard.module.css';

export function SkillBadge({ skill }: SkillBadgeProps) {
  return <span className={styles.badge}>{skill.name} ({skill.tier})</span>;
}
