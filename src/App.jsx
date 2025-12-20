import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

// --- ⚠️ PASTE YOUR APP ID HERE ---
const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

const playSound = (url) => {
  const audio = new Audio(url);
  audio.play().catch(e => console.log("Audio blocked"));
};

// --- COMPONENT: COOLDOWN BUTTON LOGIC ---
function BidButton({ onClick, disabled, isCooldown, gameState }) {
  const [cdTime, setCdTime] = useState(8);

  useEffect(() => {
    let timer;
    if (isCooldown) {
      setCdTime(8);
      timer = setInterval(() => {
        setCdTime((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isCooldown]);

  const getLabel = () => {
    if (gameState.status !== 'ACTIVE') return 'AUCTION ENDED';
    if (isCooldown) return `WAIT (${cdTime}s)`;
    return `BID NOW ($${gameState.bidCost})`;
  };

  return (
    <button 
      onClick={onClick} 
      disabled={disabled || isCooldown} 
      style={{ 
        width: '100%', maxWidth: '300px', padding: '20px', borderRadius: '50px', 
        background: isCooldown ? '#94a3b8' : '#ef4444', 
        color: 'white', fontWeight: 'bold', border: 'none', fontSize: '20px',
        transition: '0.3s'
      }}
    >
      {getLabel()}
    </button>
  );
}

// --- GLOBAL STYLES & LANDING PAGE DESIGN ---
const GlobalStyle = () => (
  <style>{`
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; font-family: sans-serif; }
    .landing-page {
      height: 100vh; width: 100vw;
      background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #ffffff 100%);
      display: flex; flexDirection: column; justifyContent: center; alignItems: center; textAlign: center;
    }
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100px); } }
  `}</style>
);

function LoginScreen({ login }) {
  return (
    <div className="landing-page">
      <GlobalStyle />
      <div style={{ background: 'rgba(255,255,255,0.1)', padding: '40px', borderRadius: '30px', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.3)' }}>
        <h1 style={{ color: '#ffffff', fontSize: '48px', margin: 0 }}>BidBlaze ⚡</h1>
        <p style={{ color: '#d1d5db', fontSize: '18px', marginBottom: '30px' }}>Premium Real-Time Auctions</p>
        <button onClick={login} style={{ background: '#ffffff', border: 'none', padding: '16px 40px', color: '#1e3a8a', borderRadius: '30px', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', boxShadow: '0 10px 20px rgba(0,0,0,0.1)' }}>
          Get Started
        </button>
      </div>
    </div>
  );
}

function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [isCooldown, setIsCooldown] = useState(false);
  const prevStatus = useRef("ACTIVE");

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ zIndex: 9999 });
        playSound('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
      }
      prevStatus.current = data.status;
    });
    return () => socket.off('gameState');
  }, []);

  const placeBid = () => {
    socket.emit('placeBid', user.email?.address || "User");
    setIsCooldown(true);
    setTimeout(() => setIsCooldown(false), 8000);
  };

  if (!gameState) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GlobalStyle />
      <nav style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
        <span>⚡ BidBlaze</span>
        <button onClick={logout} style={{ color: 'white', background: 'none', border: 'none' }}>Logout</button>
      </nav>

      <div style={{ border: '8px solid #fbbf24', borderRadius: '50%', width: '250px', height: '250px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', marginBottom: '40px' }}>
        <p style={{ margin: 0, color: '#94a3b8' }}>JACKPOT</p>
        <h2 style={{ fontSize: '48px' }}>${gameState.jackpot.toFixed(2)}</h2>
      </div>

      <BidButton onClick={placeBid} isCooldown={isCooldown} gameState={gameState} />
    </div>
  );
}

export default function App() {
  const { login, logout, user, authenticated, ready } = usePrivy();
  if (!ready) return null;
  return (
    <PrivyProvider appId={PRIVY_APP_ID} config={{ appearance: { theme: 'dark' } }}>
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LoginScreen login={login} />}
    </PrivyProvider>
  );
}

