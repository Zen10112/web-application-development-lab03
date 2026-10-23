import { DeveloperCard } from './components/DeveloperCard/DeveloperCard';

export default function App() {
  return (
    <main>
      <h1>Semantic Engineer &amp; Pro-Gamer Profile Card</h1>
      {/* Profile: https://liquipedia.net/pubg/Himass
          Portrait: https://pressthegame.com/people/himass */}
      <DeveloperCard
        fullName="Himass"
        role="PUBG: BATTLEGROUNDS · Fragger Việt Nam"
        avatarUrl="https://pressthegame.com/_astro/himass.BlhbPA-U_ZDyR3p.webp"
        metrics={{
          'Họ tên': 'Lã Phương Tiến Đạt',
          'Ngày sinh': '16/08/2003',
          'Quốc tịch': 'Việt Nam',
          'Đội từng thi đấu': "CERBERUS Esports · Anyone’s Legend",
          'PGS 3 2024': 'Vô địch cùng CERBERUS Esports · MVP',
          'PUBG Nations Cup 2025': 'Vô địch cùng Việt Nam · MVP',
        }}
        skills={[
          { id: 'himass-fragger', name: 'Fragger', tier: 'Vai trò thi đấu' },
        ]}
      />
    </main>
  );
}
