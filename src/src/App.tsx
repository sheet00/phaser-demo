import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import PhaserGame from './components/PhaserGame';
import TopPage from './components/TopPage';
import './App.css';

/**
 * シューティングゲーム画面
 */
function ShootingGame() {
  const navigate = useNavigate();

  const handleBackToMenu = () => {
    navigate('/');
  };

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
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
  );
}

/**
 * タイトル管理コンポーネント
 */
function TitleUpdater() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === '/shooting') {
      document.title = 'PHASER DEMO - SPACE SHOOTER';
    } else {
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
        <Route path="/" element={<TopPage onSelectGame={() => {}} />} />
        <Route path="/shooting" element={<ShootingGame />} />
      </Routes>
    </Router>
  );
}

export default App;
