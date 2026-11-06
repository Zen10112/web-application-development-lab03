import { DrumPadList } from './components/DrumPadList.jsx';

export function App() {
  return (
    <main>
      <header>
        <h1>Production Studio Drum Kit</h1>
        <p>Danh sách pad. Phát âm thanh và điều khiển bàn phím sẽ được bổ sung.</p>
      </header>
      <DrumPadList />
    </main>
  );
}
