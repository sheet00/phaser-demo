import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import PhaserGame from './components/PhaserGame';
import TopPage from './components/TopPage';
import UfoPopperGame from './components/UfoPopperGame';
import EndlessRunGame from './components/EndlessRunGame';
import RpgGame from './components/RpgGame';
import './App.css';

/**
 * ゲーム画面共通のレイアウト（戻るボタン付き）
 */
function GameLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {children}
      <button
        onClick={() => navigate('/')}
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
  );
}

/**
 * タイトル管理コンポーネント
 */
function TitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    switch (location.pathname) {
      case '/shooting':
        document.title = 'PHASER DEMO - SPACE SHOOTER';
        break;
      case '/rpg':
        document.title = 'PHASER DEMO - RPG ADVENTURE';
        break;
      case '/ufo-popper':
        document.title = 'PHASER DEMO - UFO POPPER';
        break;
      case '/endless-run':
        document.title = 'PHASER DEMO - ENDLESS RUN';
        break;
      default:
        document.title = 'PHASER DEMO';
    }
  }, [location]);

  return null;
}

function App() {
  return (
    <Router>
      <TitleUpdater />
      <Routes>
        <Route path="/" element={<TopPage />} />
        <Route path="/shooting" element={<GameLayout><PhaserGame /></GameLayout>} />
        <Route path="/rpg" element={<GameLayout><RpgGame /></GameLayout>} />
        <Route path="/ufo-popper" element={<GameLayout><UfoPopperGame /></GameLayout>} />
        <Route path="/endless-run" element={<GameLayout><EndlessRunGame /></GameLayout>} />
      </Routes>
    </Router>
  );
}

export default App;
