import { useState, useEffect } from 'react';
import PhaserGame from './components/PhaserGame';
import TopPage from './components/TopPage';
import './App.css';

function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  // ブラウザのタイトルを動的に変更
  useEffect(() => {
    if (activeGame === 'shooting') {
      document.title = 'PHASER DEMO - SPACE SHOOTER';
    } else {
      document.title = 'PHASER DEMO';
    }
  }, [activeGame]);

  const handleSelectGame = (gameId: string) => {
    setActiveGame(gameId);
  };

  const handleBackToMenu = () => {
    setActiveGame(null);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 }}>
      {activeGame === 'shooting' ? (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <PhaserGame />
          {/* メニューに戻るボタン */}
          <button
            onClick={handleBackToMenu}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              padding: '10px 20px',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              color: 'white',
              border: '2px solid white',
              borderRadius: '5px',
              cursor: 'pointer',
              zIndex: 1000,
              fontSize: '16px',
              fontWeight: 'bold'
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)')}
          >
            MENU
          </button>
        </div>
      ) : (
        <TopPage onSelectGame={handleSelectGame} />
      )}
    </div>
  );
}

export default App;
