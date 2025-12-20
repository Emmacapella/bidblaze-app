import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

// --- ⚠️ PASTE YOUR APP ID HERE ⚠️ ---
const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

// --- GLOBAL STYLES TO REMOVE WHITE CORNERS ---
const GlobalStyle = () => (
  <style>{`
    body, html {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background-color: #0f172a; /* Dark background everywhere */
      overflow-x: hidden;
    }
    #root {
      width: 100%;
      height: 100%;
    }
    * {
      box-sizing: border-box;
    }
  `}</style>
);

// --- SCREEN 1: THE LOGIN PAGE ---
function LoginScreen({ login }) {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      color: 'white',
      fontFamily: 'sans-serif',
      padding: '20px',
      textAlign: 'center',
      position: 'absolute', // Forces it to cover everything
      top: 0,
      left: 0
    }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚡</div>
      <h1 style={{ fontSize: '40px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#fbbf24' }}>BidBlaze</h1>
      <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '40px' }}>The Ultimate Real-Time Auction</p>
      
      <button 
        onClick={login}
        style={{
          background: '#3b82f6',
          border: 'none',
          padding: '16px 40px',
          color: 'white',
          borderRadius: '30px',
          fontSize: '18px',
          fontWeight: 'bold',
          cursor: 'pointer',
          boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
        }}
      >
        Enter the Arena
      </button>
    </div>
  );
}

// --- SCREEN 2: THE DASHBOARD (GAME) ---
function GameDashboard({ logout, user }) {
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
    const identifier = user.email ? user.email.address : (user.wallet ? user.wallet.address : "User");
    socket.emit('placeBid', identifier);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor((ms - Date.now()) / 1000);
    if (totalSeconds <= 0) return "00:00";
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!gameState) return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: 'white' }}>
      <h2>Loading Game Data...</h2>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      width: '100vw',
      background: '#0f172a',
      color: 'white',
      fontFamily: 'sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '20px 20px 40px 20px'
    }}>
      
      {/* DASHBOARD HEADER */}
      <nav style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', paddingTop: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>BidBlaze ⚡</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>Logged in as</div>
            <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{user.email ? user.email.address.split('@')[0] : 'User'}</div>
          </div>
          <button onClick={logout} style={{ background: '#334155', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>
            🚪
          </button>
        </div>
      </nav>

      {/* GAME CARD - FULL WIDTH ON MOBILE */}
      <div style={{
        background: '#1e293b',
        padding: '40px 20px',
        borderRadius: '24px',
        textAlign: 'center',
        width: '100%',
        maxWidth: '500px', // Wider on desktop, full on mobile
        border: '1px solid #334155',
        marginBottom: '30px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
      }}>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '1px', fontWeight: '600' }}>CURRENT JACKPOT</p>
        <h2 style={{ fontSize: '64px', margin: '10px 0', color: '#fbbf24', fontFamily: 'monospace' }}>
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
            padding: '20px',
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'white',
            background: gameState.status === 'ACTIVE' ? '#ef4444' : '#64748b',
            border: 'none',
            borderRadius: '16px',
            cursor: gameState.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
            marginTop: '20px',
            boxShadow: '0 4px 0 rgba(0,0,0,0.2)'
          }}
        >
          {gameState.status === 'ACTIVE' ? `BID NOW ($${gameState.bidCost})` : 'AUCTION ENDED'}
        </button>
      </div>

      {/* RECENT BIDS */}
      <div style={{ width: '100%', maxWidth: '500px' }}>
        <h3 style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '15px', textTransform: 'uppercase' }}>Recent Bids</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '15px',
            background: '#1e293b',
            marginBottom: '8px',
            borderRadius: '12px',
            fontSize: '16px',
            alignItems: 'center',
            border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '35px', height: '35px', background: '#334155', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>👤</div>
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

// --- MAIN APP ---
function Main() {
  const { login, logout, user, authenticated, ready } = usePrivy();

  if (!ready) return <div style={{ background: '#0f172a', height: '100vh', width: '100vw' }}></div>;

  return (
    <>
      <GlobalStyle />
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LoginScreen login={login} />}
    </>
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
      <Main />
    </PrivyProvider>
  );
}

