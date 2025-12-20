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

// --- HELPER: LIVE COUNTDOWN ---
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;

      if (distance < 0) {
        setTimeLeft("00:00");
      } else {
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return <span>{timeLeft}</span>;
}

// --- GLOBAL STYLES ---
const GlobalStyle = () => (
  <style>{`
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0f172a; overflow-x: hidden; }
    #root { width: 100%; height: 100%; }
    * { box-sizing: border-box; }
    
    /* Glowing Ring Animation */
    @keyframes glow-pulse {
      0% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.2), inset 0 0 10px rgba(251, 191, 36, 0.2); }
      50% { box-shadow: 0 0 25px rgba(251, 191, 36, 0.5), inset 0 0 25px rgba(251, 191, 36, 0.5); border-color: #f59e0b; }
      100% { box-shadow: 0 0 10px rgba(251, 191, 36, 0.2), inset 0 0 10px rgba(251, 191, 36, 0.2); }
    }
  `}</style>
);

function LoginScreen({ login }) {
  return (
    <div style={{
      minHeight: '100vh', width: '100vw',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
      color: 'white', fontFamily: 'sans-serif', padding: '20px', textAlign: 'center',
      position: 'absolute', top: 0, left: 0
    }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>⚡</div>
      <h1 style={{ fontSize: '40px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#fbbf24' }}>BidBlaze</h1>
      <p style={{ color: '#94a3b8', fontSize: '18px', marginBottom: '40px' }}>The Ultimate Real-Time Auction</p>
      <button onClick={login} style={{
        background: '#3b82f6', border: 'none', padding: '16px 40px', color: 'white',
        borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
      }}>Enter the Arena</button>
    </div>
  );
}

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

  if (!gameState) return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: 'white' }}>
      <h2>Loading Game Data...</h2>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', background: '#0f172a', color: 'white',
      fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px'
    }}>
      
      {/* HEADER */}
      <nav style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', marginTop: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>BidBlaze ⚡</h1>
        <button onClick={logout} style={{ background: '#334155', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>🚪</button>
      </nav>

      {/* --- NEW CIRCLE DESIGN SECTION --- */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '30px',
        marginTop: '20px'
      }}>
        
        {/* 1. DIGITAL TIMER (ABOVE THE RING) */}
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          fontFamily: 'monospace',
          marginBottom: '15px',
          color: gameState.status === 'ENDED' ? '#ef4444' : '#fbbf24',
          textShadow: '0 0 10px rgba(0,0,0,0.5)'
        }}>
          ⏱️ {gameState.status === 'ENDED' ? 'SOLD' : <CountdownTimer targetDate={gameState.endTime} />}
        </div>

        {/* 2. THE JACKPOT RING */}
        <div style={{
          width: '260px',
          height: '260px',
          borderRadius: '50%',
          border: '8px solid #fbbf24', // Gold Border
          background: 'radial-gradient(circle, #1e293b 0%, #0f172a 70%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0 0 20px rgba(251, 191, 36, 0.3)',
          animation: gameState.status === 'ACTIVE' ? 'glow-pulse 2s infinite' : 'none',
          position: 'relative'
        }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '5px' }}>JACKPOT</p>
          <h2 style={{ fontSize: '50px', margin: '0', color: 'white', fontWeight: 'bold' }}>
            ${gameState.jackpot.toFixed(2)}
          </h2>
        </div>

      </div>
      {/* ---------------------------------- */}

      {/* BID BUTTON */}
      <div style={{ width: '100%', maxWidth: '350px', marginBottom: '30px' }}>
        <button 
          onClick={placeBid}
          disabled={gameState.status !== 'ACTIVE'}
          style={{
            width: '100%', padding: '20px', fontSize: '20px', fontWeight: 'bold', color: 'white',
            background: gameState.status === 'ACTIVE' ? '#ef4444' : '#64748b',
            border: 'none', borderRadius: '50px', // Pill shape button
            cursor: gameState.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
            transition: 'transform 0.1s'
          }}
        >
          {gameState.status === 'ACTIVE' ? `BID NOW ($${gameState.bidCost})` : 'AUCTION ENDED'}
        </button>
      </div>

      {/* RECENT BIDS */}
      <div style={{ width: '100%', maxWidth: '350px' }}>
        <h3 style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '15px', textTransform: 'uppercase', textAlign: 'center' }}>Recent Action</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{
            display: 'flex', justifyContent: 'space-between', padding: '12px 20px',
            background: 'rgba(30, 41, 59, 0.5)', marginBottom: '8px', borderRadius: '12px',
            fontSize: '14px', alignItems: 'center', border: '1px solid #334155'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{color: 'white'}}>{bid.user ? bid.user.slice(0, 8) : 'Anon'}...</span>
            </div>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>${bid.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <SpeedInsights />
    </div>
  );
}

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
      config={{ loginMethods: ['email', 'wallet'], appearance: { theme: 'dark', accentColor: '#676FFF' } }}
    >
      <Main />
    </PrivyProvider>
  );
}

