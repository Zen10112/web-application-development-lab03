import { useId } from 'react';
import { SMART_PEOPLE } from '../data/smartPeople';

export function ScientistDirectory() {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>Danh sách nhà khoa học và người tiên phong</h2>
      <ul>
        {SMART_PEOPLE.map((person) => (
          <li key={person.id}>
            <article>
              <h3>{person.name}</h3>
              <dl>
                <dt>Tuổi</dt>
                <dd>{person.age}</dd>
                <dt>IQ</dt>
                <dd>{person.iq}</dd>
              </dl>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
