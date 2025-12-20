import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

// --- ⚠️ PASTE YOUR APP ID HERE AGAIN ⚠️ ---
const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

function Game() {
  const { login, logout, user, authenticated } = usePrivy();
  const [gameState, setGameState] = useState(null);

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ENDED') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      }
    });
    return () => socket.off('gameState');
  }, []);

  const placeBid = () => {
    if (!authenticated) return login();
    const identifier = user.email ? user.email.address : (user.wallet ? user.wallet.address : "User");
    socket.emit('placeBid', identifier);
  };

  // --- THIS WAS THE BROKEN PART (FIXED NOW) ---
  const formatTime = (ms) => {
    const totalSeconds = Math.floor((ms - Date.now()) / 1000);
    if (totalSeconds <= 0) return "00:00";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };
  // ---------------------------------------------

  if (!gameState) return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: 'white' }}>
      <h2>Connecting...</h2>
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
      
      <nav style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>BidBlaze ⚡</h1>
        
        {authenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              {user.email ? user.email.address.split('@')[0] : 'User'}
            </span>
            <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '5px 10px', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}>
              Sign Out
            </button>
          </div>
        ) : (
          <button onClick={login} style={{ background: '#3b82f6', border: 'none', padding: '8px 16px', color: 'white', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            Sign In
          </button>
        )}
      </nav>

      <div style={{
        background: 'rgba(255, 255, 255, 0.05)',
        padding: '30px',
        borderRadius: '24px',
        textAlign: 'center',
        width: '100%',
        maxWidth: '350px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        marginBottom: '30px'
      }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '1px', fontWeight: '600' }}>CURRENT JACKPOT</p>
        <h2 style={{ fontSize: '56px', margin: '10px 0', color: '#fbbf24', fontFamily: 'monospace' }}>
          ${gameState.jackpot.toFixed(2)}
        </h2>
        
        <div style={{ 
          background: 'rgba(0,0,0,0.3)', 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px',
          padding: '8px 16px', 
          borderRadius: '20px',
          margin: '20px 0',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>⏱️</span>
          <span style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {gameState.status === 'ENDED' ? 'SOLD' : formatTime(gameState.endTime)}
          </span>
        </div>

        <button 
          onClick={placeBid}
          disabled={gameState.status !== 'ACTIVE'}
          style={{
            width: '100%',
            padding: '18px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            background: gameState.status === 'ACTIVE' ? '#ef4444' : '#64748b',
            border: 'none',
            borderRadius: '16px',
            cursor: gameState.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
            marginTop: '10px',
            boxShadow: '0 4px 0 rgba(0,0,0,0.2)'
          }}
        >
          {gameState.status === 'ACTIVE' ? `BID NOW ($${gameState.bidCost})` : 'AUCTION ENDED'}
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: '350px' }}>
        <h3 style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '15px', textTransform: 'uppercase' }}>Recent Bids</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            marginBottom: '8px',
            borderRadius: '12px',
            fontSize: '14px',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '30px', height: '30px', background: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
              <span style={{color: 'white'}}>{bid.user ? bid.user.slice(0, 15) : 'Anon'}...</span>
            </div>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>${bid.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <SpeedInsights />
    </div>
  );
}

export default function App() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['email', 'wallet'],
        appearance: { theme: 'dark', accentColor: '#676FFF' },
      }}
    >
      <Game />
    </PrivyProvider>
  );
}

