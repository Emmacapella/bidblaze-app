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

// --- SOUND EFFECTS ---
const playSound = (type) => {
  const sounds = {
    bid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
    win: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3'
  };
  new Audio(sounds[type]).play().catch(() => {});
};

// --- COMPONENT: FLOATING BID ANIMATION ---
const FloatingNumber = ({ onComplete }) => {
  useEffect(() => {
    const t = setTimeout(onComplete, 1000);
    return () => clearTimeout(t);
  }, []);
  return <div className="float-num">-$1.00</div>;
};

// --- COMPONENT: SVG PROGRESS RING ---
const ProgressRing = ({ radius, stroke, progress }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div className="ring-container">
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke="#fbbf24" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear' }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
      </svg>
    </div>
  );
};

// --- LOGIC: TIMER & EXTENSION RULE ---
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
        // Visual Progress: based on a 60s loop for animation
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

// --- STYLES ---
const GlobalStyle = () => (
  <style>{`
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: white; overflow-x: hidden; }
    
    /* Landing Page Gradient */
    .landing {
      height: 100vh; width: 100vw;
      background: linear-gradient(180deg, #2563eb 0%, #1e40af 60%, #ffffff 100%);
      display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;
    }
    
    /* Animations */
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-80px); } }
    .float-num { position: absolute; color: #ef4444; font-weight: bold; font-size: 20px; animation: float-up 0.8s forwards; z-index: 50; }
    .ring-container { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    .pulse-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; margin-right: 6px; animation: pulse 1s infinite; }
    @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
  `}</style>
);

// --- SCREEN 1: LANDING PAGE ---
function LoginScreen({ login }) {
  return (
    <div className="landing">
      <GlobalStyle />
      <div style={{ padding: '20px' }}>
        <h1 style={{ fontSize: '60px', margin: '0 0 10px 0', color: 'white', textShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>BidBlaze ⚡</h1>
        <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.9)', marginBottom: '40px' }}>The Ultimate Real-Time Auction</p>
        
        <button onClick={login} style={{
          background: 'white', color: '#1e40af', border: 'none', padding: '18px 50px',
          borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          Get Started
        </button>
      </div>
    </div>
  );
}

// --- SCREEN 2: GAME DASHBOARD ---
function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [progress, setProgress] = useState(100);
  const [floats, setFloats] = useState([]);
  
  // Cooldown Logic
  const [isCooldown, setIsCooldown] = useState(false);
  const [cdTimer, setCdTimer] = useState(0);

  const prevStatus = useRef("ACTIVE");

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      
      // Play sounds on bid
      if (data.status === 'ACTIVE' && data.history.length > 0) playSound('bid');
      
      // Play sound/confetti on win
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ zIndex: 9999, particleCount: 150 });
        playSound('win');
        setProgress(0);
      }
      prevStatus.current = data.status;
    });
    
    // Cooldown Countdown Timer
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

    // 1. Send Bid
    const userId = user.email ? user.email.address : "User";
    socket.emit('placeBid', userId);

    // 2. Activate 8s Cooldown
    setIsCooldown(true);
    setCdTimer(8);

    // 3. Visual Effect
    setFloats(f => [...f, Date.now()]);
  };

  if (!gameState) return <div style={{height: '100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Loading...</div>;

  return (
    <div style={{ minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GlobalStyle />
      
      {/* HEADER */}
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', color: '#cbd5e1' }}>
          <span className="pulse-dot"></span> {gameState.connectedUsers || 1} Online
        </div>
        <button onClick={logout} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Logout</button>
      </div>

      {/* TIMER ABOVE RING */}
      <div style={{ fontSize: '32px', fontFamily: 'monospace', fontWeight: 'bold', color: '#fbbf24', marginBottom: '20px' }}>
        ⏱️ {gameState.status === 'ENDED' ? 'SOLD' : <TimerDisplay targetDate={gameState.endTime} onTick={setProgress} />}
      </div>

      {/* JACKPOT RING */}
      <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
        <ProgressRing radius={140} stroke={8} progress={progress} />
        {floats.map(id => <FloatingNumber key={id} onComplete={() => setFloats(f => f.filter(i => i !== id))} />)}
        
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '2px' }}>JACKPOT</p>
          <h2 style={{ fontSize: '56px', margin: '5px 0', fontWeight: 'bold' }}>
            ${gameState.jackpot.toFixed(2)}
          </h2>
          {gameState.status === 'ENDED' && <div style={{color: '#22c55e', fontWeight: 'bold', marginTop: '10px'}}>WINNER DECLARED</div>}
        </div>
      </div>

      {/* COOLDOWN BUTTON */}
      <button 
        onClick={placeBid} 
        disabled={gameState.status !== 'ACTIVE' || isCooldown}
        style={{
          width: '100%', maxWidth: '320px', padding: '20px', borderRadius: '50px',
          background: isCooldown ? '#475569' : (gameState.status === 'ACTIVE' ? '#ef4444' : '#64748b'),
          color: 'white', border: 'none', fontSize: '20px', fontWeight: 'bold',
          transition: 'all 0.2s', boxShadow: '0 4px 15px rgba(0,0,0,0.3)', cursor: isCooldown ? 'not-allowed' : 'pointer'
        }}
      >
        {gameState.status === 'ENDED' ? 'AUCTION ENDED' : (isCooldown ? `WAIT (${cdTimer}s)` : `BID NOW ($${gameState.bidCost})`)}
      </button>

      {/* HISTORY LIST */}
      <div style={{ width: '100%', maxWidth: '350px', marginTop: '40px' }}>
        <h3 style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', marginBottom: '15px' }}>RECENT ACTIVITY</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: '#1e293b', marginBottom: '8px', borderRadius: '10px', fontSize: '14px' }}>
            <span>{bid.user.split('@')[0].slice(0, 12)}...</span>
            <span style={{ color: '#fbbf24' }}>${bid.amount.toFixed(2)}</span>
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

