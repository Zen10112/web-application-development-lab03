import { useId, useRef, useState } from 'react';
import { SMART_PEOPLE } from '../data/smartPeople';

export function ScientistDirectory() {
  const headingId = useId();
  const searchId = useId();
  const iqId = useId();
  const sortId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const deleteButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const [people, setPeople] = useState(SMART_PEOPLE);
  const [query, setQuery] = useState('');
  const [minIq, setMinIq] = useState(160);
  const [sortBy, setSortBy] = useState('iq-desc');
  const normalizedQuery = query.trim().toLowerCase();
  const visiblePeople = people
    .filter((person) =>
      person.name.toLowerCase().includes(normalizedQuery) && person.iq >= minIq,
    )
    .toSorted((a, b) => {
      switch (sortBy) {
        case 'iq-asc': return a.iq - b.iq;
        case 'age-asc': return a.age - b.age;
        case 'age-desc': return b.age - a.age;
        default: return b.iq - a.iq;
      }
    });

  function handleDelete(id: string) {
    const index = visiblePeople.findIndex((person) => person.id === id);
    const nextPerson = visiblePeople[index + 1] ?? visiblePeople[index - 1];
    // Move focus before removing the focused button; stable IDs preserve its target.
    const focusTarget = nextPerson
      ? deleteButtonRefs.current.get(nextPerson.id)
      : searchRef.current;
    focusTarget?.focus();
    setPeople((previous) => previous.filter((person) => person.id !== id));
  }

  function handleReset() {
    setPeople(SMART_PEOPLE);
    setQuery('');
    setMinIq(160);
    setSortBy('iq-desc');
  }

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId}>Danh sách nhà khoa học và người tiên phong</h2>
      <form role="search" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor={searchId}>Tìm kiếm theo tên</label>
        <input
          ref={searchRef}
          id={searchId}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <label htmlFor={iqId}>IQ tối thiểu</label>
        <input
          id={iqId}
          type="number"
          value={minIq}
          onChange={(event) => {
            const value = event.currentTarget.valueAsNumber;
            setMinIq(Number.isNaN(value) ? 0 : value);
          }}
        />
        <label htmlFor={sortId}>Sắp xếp theo</label>
        <select
          id={sortId}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value)}
        >
          <option value="iq-desc">IQ giảm dần</option>
          <option value="iq-asc">IQ tăng dần</option>
          <option value="age-asc">Tuổi tăng dần</option>
          <option value="age-desc">Tuổi giảm dần</option>
        </select>
        <button type="button" onClick={handleReset}>Reset</button>
      </form>
      <output role="status" aria-live="polite">
        Hiển thị {visiblePeople.length} / {people.length} người.
        {visiblePeople.length === 0 && ' Không có kết quả phù hợp.'}
      </output>
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
              <button
                type="button"
                aria-label={`Xóa ${person.name}`}
                ref={(node) => {
                  if (node) deleteButtonRefs.current.set(person.id, node);
                  else deleteButtonRefs.current.delete(person.id);
                }}
                onClick={() => handleDelete(person.id)}
              >
                Delete
              </button>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}
