export interface Skill {
  readonly id: string;
  readonly name: string;
  readonly tier: string;
}

export interface SkillBadgeProps {
  readonly skill: Skill;
}
