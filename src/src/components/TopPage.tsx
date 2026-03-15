import { useNavigate } from 'react-router-dom';

export default function TopPage() {
  const navigate = useNavigate();
  const games = [
    { id: 'shooting', title: '🚀 SPACE SHOOTER', description: '敵機を撃破してハイスコアを目指せ！' },
    { id: 'ufo-popper', title: '🛸 UFO POPPER', description: '次々と現れるUFOを素早くクリックして撃退せよ！' },
    { id: 'endless-run', title: '🦖 ENDLESS RUN', description: '障害物をジャンプで避けて進め！（準備中）' },
    { id: 'rpg', title: '⚔️ RPG ADVENTURE', description: '広大な世界を冒険しよう（準備中）' },
  ];

  const handleSelectGame = (gameId: string) => {
    if (gameId === 'shooting') {
      navigate('/shooting');
    } else if (gameId === 'rpg') {
      navigate('/rpg');
    } else if (gameId === 'ufo-popper') {
      navigate('/ufo-popper');
    } else if (gameId === 'endless-run') {
      navigate('/endless-run');
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0a0a', // 元の深い黒に戻す
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'Exo 2', sans-serif"
    }}>
      <h1 style={{ 
        fontSize: '3.5rem', 
        marginBottom: '4rem', 
        letterSpacing: '0.5rem',
        textTransform: 'uppercase',
        fontWeight: 900,
        textShadow: '0 0 15px rgba(0, 210, 255, 0.7)' 
      }}>
        PHASER DEMO
      </h1>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', width: '80%', maxWidth: '1000px' }}>
        {games.map((game) => (
          <div
            key={game.id}
            onClick={() => handleSelectGame(game.id)}
            style={{
              padding: '2rem',
              borderRadius: '1rem',
              background: game.id === 'coming-soon' ? '#333' : 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)',
              cursor: game.id === 'coming-soon' ? 'not-allowed' : 'pointer',
              border: '2px solid #00d2ff',
              transition: 'transform 0.2s, box-shadow 0.2s',
              textAlign: 'center'
            }}
            onMouseOver={(e) => {
              if (game.id !== 'coming-soon') {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 0 20px #00d2ff';
              }
            }}
            onMouseOut={(e) => {
              if (game.id !== 'coming-soon') {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }
            }}
          >
            <h2 style={{ fontSize: '1.8rem', margin: '0 0 1rem 0' }}>{game.title}</h2>
            <p style={{ color: '#ccc', fontSize: '1rem' }}>{game.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
