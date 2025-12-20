import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';

// --- CONNECT TO YOUR RENDER SERVER ---
const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling'] // Ensures connection works on all networks
});

function App() {
  const [gameState, setGameState] = useState(null);
  const [wallet, setWallet] = useState(null); // Simple wallet state
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // 1. Listen for updates from the server
    socket.on('gameState', (data) => {
      setGameState(data);
      
      // If game just ended, launch confetti!
      if (data.status === 'ENDED') {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    });

    return () => socket.off('gameState');
  }, []);

  const handleConnect = () => {
    // Simulating a wallet connection for now
    const mockWallet = "0x" + Math.random().toString(16).slice(2, 8);
    setWallet(mockWallet);
    setIsConnected(true);
  };

  const placeBid = () => {
    if (!isConnected) return alert("Please connect wallet first!");
    socket.emit('placeBid', wallet);
  };

  // FORMAT TIME: Minutes:Seconds
  const formatTime = (ms) => {
    const totalSeconds = Math.floor((ms - Date.now()) / 1000);
    if (totalSeconds <= 0) return "00:00";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // LOADING SCREEN
  if (!gameState) return (
    <div style={{
      height: '100vh', 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      background: '#0f172a', 
      color: 'white'
    }}>
      <h2>Connecting to Server...</h2>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
      color: 'white',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px'
    }}>
      
      {/* HEADER */}
      <nav style={{ width: '100%', maxWidth: '600px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold', color: '#fbbf24' }}>BidBlaze ⚡</h1>
        <button 
          onClick={handleConnect}
          style={{
            background: isConnected ? '#22c55e' : '#3b82f6',
            border: 'none',
            padding: '10px 20px',
            color: 'white',
            borderRadius: '20px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          {isConnected ? `Connected: ${wallet}` : 'Connect Wallet'}
        </button>
      </nav>

      {/* JACKPOT CARD */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.1)',
        padding: '40px',
        borderRadius: '20px',
        textAlign: 'center',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        marginBottom: '30px'
      }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>Current Jackpot</p>
        <h2 style={{ fontSize: '60px', margin: '10px 0', color: '#fbbf24' }}>
          ${gameState.jackpot.toFixed(2)}
        </h2>
        
        <div style={{ margin: '20px 0', fontSize: '24px', fontWeight: 'bold' }}>
          ⏱️ {gameState.status === 'ENDED' ? 'Sold!' : formatTime(gameState.endTime)}
        </div>

        <button 
          onClick={placeBid}
          disabled={gameState.status !== 'ACTIVE'}
          style={{
            width: '100%',
            padding: '15px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            background: gameState.status === 'ACTIVE' ? '#ef4444' : '#64748b',
            border: 'none',
            borderRadius: '10px',
            cursor: gameState.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
            transition: 'transform 0.1s'
          }}
        >
          {gameState.status === 'ACTIVE' ? `BID NOW ($${gameState.bidCost})` : 'AUCTION ENDED'}
        </button>
      </div>

      {/* RECENT BIDS */}
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <h3 style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '10px' }}>RECENT BIDS</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '10px',
            background: 'rgba(255,255,255,0.05)',
            marginBottom: '5px',
            borderRadius: '5px',
            fontSize: '14px'
          }}>
            <span>👤 {bid.user.slice(0, 6)}...</span>
            <span style={{ color: '#fbbf24' }}>${bid.amount.toFixed(2)}</span>
            <span style={{ color: '#94a3b8' }}>{bid.time}</span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default App;

