import { Fragment, useId, useState } from 'react';
import { SkillBadge } from '../SkillBadge/SkillBadge';
import type { DeveloperCardProps } from './DeveloperCard.types';

function Avatar({ src, fullName }: { src: string; fullName: string }) {
  const [hasError, setHasError] = useState(false);
  const initials = fullName.trim().split(/\s+/).filter(Boolean)
    .map((part) => part.charAt(0)).slice(0, 2).join('').toUpperCase() || '?';

  let isHttps = false;
  try {
    isHttps = new URL(src).protocol === 'https:';
  } catch {
    // Missing or invalid image URLs use initials.
  }

  if (!isHttps || hasError) {
    return <span role="img" aria-label={`Ảnh đại diện của ${fullName}`}>{initials}</span>;
  }

  return (
    <img
      src={src}
      width={64}
      height={64}
      alt={`Ảnh đại diện của ${fullName}`}
      onError={() => setHasError(true)}
    />
  );
}

export function DeveloperCard({
  fullName = 'Nguyễn Minh Anh',
  role = 'Frontend Developer · PUBG Player',
  avatarUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop',
  metrics = { 'Số commit': 128, 'Số trận đấu': 240, 'Số lần WWCD': 32 },
  skills = [
    { id: 'react', name: 'React 19', tier: 'Core' },
    { id: 'typescript', name: 'TypeScript', tier: 'Core' },
    { id: 'pubg', name: 'PUBG Teamwork', tier: 'Advanced' },
  ],
}: DeveloperCardProps) {
  const headingId = useId();

  return (
    <article aria-labelledby={headingId}>
      <header>
        <Avatar key={avatarUrl} src={avatarUrl} fullName={fullName} />
        <hgroup>
          <h2 id={headingId}>{fullName}</h2>
          <p>{role}</p>
        </hgroup>
      </header>
      <dl>
        {Object.entries(metrics).map(([label, value]) => (
          <Fragment key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </Fragment>
        ))}
      </dl>
      <ul aria-label="Kỹ năng">
        {skills.map((skill) => (
          <li key={skill.id}><SkillBadge skill={skill} /></li>
        ))}
      </ul>
    </article>
  );
}
