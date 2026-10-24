import { useId, useState } from 'react';
import { SMART_PEOPLE } from '../data/smartPeople';

export function ScientistDirectory() {
  const headingId = useId();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePeople = SMART_PEOPLE.filter((person) =>
    person.name.toLowerCase().includes(normalizedQuery),
  );

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>Danh sách nhà khoa học và người tiên phong</h2>
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor={searchId}>Tìm kiếm theo tên</label>
        <input
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </form>
      <ul>
        {visiblePeople.map((person) => (
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
