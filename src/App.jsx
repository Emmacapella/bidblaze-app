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

// --- COMPONENT: ANIMATED SVG PROGRESS RING ---
const ProgressRing = ({ radius, stroke, progress }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <svg
        height={radius * 2}
        width={radius * 2}
        style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}
      >
        {/* Background Grey Ring */}
        <circle
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={stroke}
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        {/* Moving Gold Ring */}
        <circle
          stroke="#fbbf24"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear' }}
          strokeLinecap="round"
          fill="transparent"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
    </div>
  );
};

// --- HELPER: LOGIC TO CALCULATE TIME & PROGRESS ---
function TimerLogic({ targetDate, onTick }) {
  const [timeLeft, setTimeLeft] = useState("00:00");

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;

      if (distance < 0) {
        setTimeLeft("00:00");
        onTick(0); // Progress is 0%
      } else {
        // Calculate percentage based on a 60-second visual loop
        // If time > 60s, ring is full. If < 60s, it drains.
        const totalSeconds = distance / 1000;
        const percentage = Math.min((totalSeconds / 60) * 100, 100);
        onTick(percentage);

        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
      }
    }, 100); // Update faster for smooth animation
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
    @keyframes pulse-winner {
      0% { transform: scale(1); }
      50% { transform: scale(1.05); color: #ef4444; }
      100% { transform: scale(1); }
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
      <button onClick={login} style={{
        background: '#3b82f6', border: 'none', padding: '16px 40px', color: 'white',
        borderRadius: '30px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '20px'
      }}>Enter the Arena</button>
    </div>
  );
}

function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [progress, setProgress] = useState(100); // 100% full initially

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ENDED') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        setProgress(0);
      }
    });
    return () => socket.off('gameState');
  }, []);

  const placeBid = () => {
    const identifier = user.email ? user.email.address : (user.wallet ? user.wallet.address : "User");
    socket.emit('placeBid', identifier);
  };

  const getWinnerName = () => {
    if (gameState.history && gameState.history.length > 0) {
      const winner = gameState.history[0].user; // Assuming first in history is latest bidder
      return winner.length > 15 ? winner.slice(0, 6) + '...' + winner.slice(-4) : winner;
    }
    return "No Bids";
  };

  if (!gameState) return (
    <div style={{ height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', background: '#0f172a', color: 'white' }}>
      <h2>Loading...</h2>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', width: '100vw', background: '#0f172a', color: 'white',
      fontFamily: 'sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px'
    }}>
      
      {/* HEADER */}
      <nav style={{ width: '100%', maxWidth: '500px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', marginTop: '10px' }}>
        <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>BidBlaze ⚡</h1>
        <button onClick={logout} style={{ background: '#334155', border: 'none', color: 'white', padding: '8px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer' }}>🚪</button>
      </nav>

      {/* --- THE MAIN REACTOR RING --- */}
      <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '40px' }}>
        
        {/* MOVING SVG RING */}
        <ProgressRing radius={140} stroke={8} progress={progress} />

        {/* INSIDE CONTENT */}
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          
          {/* STATE 1: AUCTION ENDED -> SHOW WINNER */}
          {gameState.status === 'ENDED' ? (
             <div style={{ animation: 'pulse-winner 1s infinite' }}>
               <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>SOLD TO</p>
               <h2 style={{ fontSize: '24px', margin: '5px 0', color: '#22c55e', fontWeight: 'bold' }}>
                 {getWinnerName()}
               </h2>
               <h3 style={{ fontSize: '40px', margin: '0', color: 'white' }}>${gameState.jackpot.toFixed(2)}</h3>
             </div>
          ) : (
          /* STATE 2: ACTIVE -> SHOW TIMER & JACKPOT */
             <>
               <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '5px' }}>JACKPOT</p>
               <h2 style={{ fontSize: '50px', margin: '0', color: 'white', fontWeight: 'bold', textShadow: '0 0 20px rgba(251, 191, 36, 0.5)' }}>
                 ${gameState.jackpot.toFixed(2)}
               </h2>
               <div style={{ marginTop: '10px', fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace', color: '#fbbf24' }}>
                 ⏱️ <TimerLogic targetDate={gameState.endTime} onTick={setProgress} />
               </div>
             </>
          )}

        </div>
      </div>

      {/* BID BUTTON */}
      <div style={{ width: '100%', maxWidth: '350px', marginBottom: '30px' }}>
        <button 
          onClick={placeBid}
          disabled={gameState.status !== 'ACTIVE'}
          style={{
            width: '100%', padding: '20px', fontSize: '20px', fontWeight: 'bold', color: 'white',
            background: gameState.status === 'ACTIVE' ? '#ef4444' : '#64748b',
            border: 'none', borderRadius: '50px',
            cursor: gameState.status === 'ACTIVE' ? 'pointer' : 'not-allowed',
            boxShadow: gameState.status === 'ACTIVE' ? '0 4px 15px rgba(239, 68, 68, 0.4)' : 'none',
            transform: gameState.status === 'ACTIVE' ? 'scale(1)' : 'scale(0.98)',
            transition: 'all 0.2s'
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

