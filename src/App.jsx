import { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';
import { SpeedInsights } from "@vercel/speed-insights/react";
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';

// --- ⚠️ PASTE YOUR APP ID HERE ⚠️ ---
const PRIVY_APP_ID = "Cmjd3lz86008nih0d7zq8qfro";

const socket = io("https://bidblaze-server.onrender.com", {
  transports: ['websocket', 'polling']
});

// --- AUDIO HELPERS ---
const playSound = (type) => {
  const sounds = {
    bid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
  };
  new Audio(sounds[type]).play().catch(() => {});
};

// --- ANIMATION COMPONENTS ---
const FloatingNumber = ({ onComplete }) => {
  useEffect(() => {
    const t = setTimeout(onComplete, 1000);
    return () => clearTimeout(t);
  }, []);
  return <div className="float-num">-$1.00</div>;
};

const ProgressRing = ({ radius, stroke, progress }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div className="ring-container">
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke="#fbbf24" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear', filter: 'drop-shadow(0 0 8px #fbbf24)' }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
      </svg>
    </div>
  );
};

const TimerDisplay = ({ targetDate, onTick }) => {
  const [display, setDisplay] = useState("00:00");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;
      if (distance < 0) {
        setDisplay("00:00");
        onTick(0);
      } else {
        const percent = Math.min(((distance / 1000) / 60) * 100, 100);
        onTick(percent);
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setDisplay(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [targetDate]);
  return <span>{display}</span>;
};

// --- STYLES (Blue Landing + Dark Game) ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;900&display=swap');
    body { margin: 0; font-family: 'Outfit', sans-serif; background: #0f172a; overflow-x: hidden; }
    
    /* Blue & White Landing Page */
    .landing-page {
      height: 100vh; width: 100vw;
      background: linear-gradient(135deg, #2563eb 0%, #3b82f6 40%, #ffffff 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
    }

    /* Game Dashboard Styles */
    .game-page { min-height: 100vh; background: #0f172a; color: white; display: flex; flex-direction: column; align-items: center; padding: 20px; }
    .glass-panel { background: rgba(255, 255, 255, 0.05); backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; }
    
    /* Animations */
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-80px); } }
    .float-num { position: absolute; color: #ef4444; font-weight: 900; font-size: 24px; animation: float-up 0.8s forwards; z-index: 50; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
    .ring-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    .pulse-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; margin-right: 6px; box-shadow: 0 0 10px #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  `}</style>
);

// --- SCREEN 1: LANDING (BLUE/WHITE) ---
function LoginScreen({ login }) {
  return (
    <div className="landing-page">
      <GlobalStyle />
      <div style={{ padding: '40px', maxWidth: '90%' }}>
        <h1 style={{ fontSize: '60px', margin: '0 0 10px 0', color: 'white', textShadow: '0 4px 15px rgba(0,0,0,0.2)' }}>BidBlaze ⚡</h1>
        <p style={{ fontSize: '20px', color: 'white', marginBottom: '40px', fontWeight: '500' }}>Premium Real-Time Auctions</p>
        <button onClick={login} style={{
          background: 'white', color: '#2563eb', border: 'none', padding: '18px 50px',
          borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(37, 99, 235, 0.3)', transition: 'transform 0.2s'
        }}>
          Get Started
        </button>
      </div>
    </div>
  );
}

// --- SCREEN 2: GAME DASHBOARD (DARK/GOLD) ---
function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [progress, setProgress] = useState(100);
  const [floats, setFloats] = useState([]);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cdTimer, setCdTimer] = useState(0);
  const prevStatus = useRef("ACTIVE");

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      if (data.status === 'ACTIVE' && data.history.length > 0) playSound('bid');
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ zIndex: 9999, particleCount: 200, spread: 100, colors: ['#fbbf24', '#ffffff'] });
        playSound('win');
        setProgress(0);
      }
      prevStatus.current = data.status;
    });

    let interval;
    if (isCooldown && cdTimer > 0) {
      interval = setInterval(() => setCdTimer((t) => t - 1), 1000);
    } else if (cdTimer === 0) {
      setIsCooldown(false);
    }
    return () => { socket.off('gameState'); clearInterval(interval); };
  }, [isCooldown, cdTimer]);

  const placeBid = () => {
    if (isCooldown) return;
    socket.emit('placeBid', user.email ? user.email.address : "User");
    setIsCooldown(true);
    setCdTimer(8);
    setFloats(f => [...f, Date.now()]);
  };

  if (!gameState) return <div style={{height: '100vh', display:'flex', justifyContent:'center', alignItems:'center', background:'#0f172a', color:'white'}}>Loading...</div>;

  return (
    <div className="game-page">
      <GlobalStyle />
      
      {/* HEADER */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', display: 'flex', justifyContent: 'space-between', padding: '15px 20px', marginBottom: '30px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500' }}>
          <span className="pulse-dot"></span> {gameState.connectedUsers || 1} LIVE
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px' }}>LOGOUT</button>
      </div>

      {/* TIMER */}
      <div style={{ fontSize: '36px', fontWeight: '700', color: '#fbbf24', marginBottom: '10px', textShadow: '0 0 15px rgba(251, 191, 36, 0.4)' }}>
        {gameState.status === 'ENDED' ? 'SOLD' : <TimerDisplay targetDate={gameState.endTime} onTick={setProgress} />}
      </div>

      {/* JACKPOT RING */}
      <div style={{ position: 'relative', width: '300px', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
        <ProgressRing radius={150} stroke={6} progress={progress} />
        {floats.map(id => <FloatingNumber key={id} onComplete={() => setFloats(f => f.filter(i => i !== id))} />)}
        
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '3px', fontWeight: '600' }}>JACKPOT</p>
          <h2 style={{ fontSize: '64px', margin: '5px 0', fontWeight: '900', color: 'white', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>${gameState.jackpot.toFixed(2)}</h2>
          {gameState.status === 'ENDED' && (
             <div style={{ background: '#22c55e', color: '#000', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', marginTop: '10px' }}>
               WINNER: {gameState.history[0]?.user.split('@')[0].slice(0,8)}...
             </div>
          )}
        </div>
      </div>

      {/* 3D ACTION BUTTON */}
      <button 
        onClick={placeBid} 
        disabled={gameState.status !== 'ACTIVE' || isCooldown}
        style={{
          width: '100%', maxWidth: '350px', padding: '22px', borderRadius: '24px',
          background: isCooldown ? '#334155' : 'linear-gradient(to bottom, #ef4444, #dc2626)',
          color: isCooldown ? '#94a3b8' : 'white', border: 'none', fontSize: '22px', fontWeight: '800',
          boxShadow: isCooldown ? 'none' : '0 8px 0 #991b1b, 0 15px 20px rgba(0,0,0,0.4)',
          transform: isCooldown ? 'translateY(4px)' : 'translateY(0)',
          transition: 'all 0.1s', cursor: isCooldown ? 'not-allowed' : 'pointer'
        }}
      >
        {gameState.status === 'ENDED' ? 'AUCTION CLOSED' : (isCooldown ? `WAIT (${cdTimer}s)` : `BID NOW $${gameState.bidCost}`)}
      </button>

      {/* RECENT HISTORY */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', marginTop: '50px', padding: '20px' }}>
        <h3 style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '15px', letterSpacing: '1px', textTransform: 'uppercase' }}>Recent Activity</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '15px' }}>
            <span style={{ color: 'white' }}>{bid.user.split('@')[0].slice(0, 15)}...</span>
            <span style={{ color: '#fbbf24', fontWeight: '700' }}>${bid.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <SpeedInsights />
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

