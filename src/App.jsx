  const [floats, setFloats] = 
  useState([]);
  
  // Cooldown Logic
  const [cdTimer, setCdTimer] = 
  useState(0);

  const prevStatus = useRef("ACTIVE");
    // 3. Visual Effect
      </div>

      {/* JACKPOT RING */} <div style={{ 
      position: 'relative', width: 
      '280px', height: '280px', display: 
      'flex', justifyContent: 'center', 
      alignItems: 'center', marginBottom: 
      '30px' }}>
        <ProgressRing radius={140} 
        stroke={8} progress={progress} /> 
        {floats.map(id => <FloatingNumber 
        key={id} onComplete={() => 
        setFloats(f => f.filter(i => i !== 
        id))} />)}
        
        <div style={{ textAlign: 'center', 
          zIndex: 10 }}> <p style={{ 
          margin: 0, color: '#94a3b8', 
          fontSize: '12px', letterSpacing: 
          '2px' }}>JACKPOT</p> <h2 
          style={{ fontSize: '56px', 
          margin: '5px 0', fontWeight: 
          'bold' }}>
            ${gameState.jackpot.toFixed(2)} 
          </h2> {gameState.status === 
          'ENDED' && <div style={{color: 
          '#22c55e', fontWeight: 'bold', 
          marginTop: '10px'}}>WINNER 
          DECLARED</div>}
        </div> </div>

      {/* COOLDOWN BUTTON */} <button 
        onClick={placeBid} 
        disabled={gameState.status !== 
        'ACTIVE' || isCooldown} style={{
          width: '100%', maxWidth: 
          '320px', padding: '20px', 
          borderRadius: '50px', 
          background: isCooldown ? 
          '#475569' : (gameState.status 
          === 'ACTIVE' ? '#ef4444' : 
          '#64748b'), color: 'white', 
          border: 'none', fontSize: 
          '20px', fontWeight: 'bold', 
          transition: 'all 0.2s', 
          boxShadow: '0 4px 15px 
          rgba(0,0,0,0.3)', cursor: 
          isCooldown ? 'not-allowed' : 
          'pointer'
        }}
      >
        {gameState.status === 'ENDED' ? 
      'AUCTION ENDED' : (isCooldown ? 
      `WAIT (${cdTimer}s)` : `BID NOW 
      ($${gameState.bidCost})`)} </button>

      {/* HISTORY LIST */} <div style={{ 
      width: '100%', maxWidth: '350px', 
      marginTop: '40px' }}>
        <h3 style={{ fontSize: '12px', 
        color: '#64748b', textAlign: 
        'center', marginBottom: '15px' 
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

// --- COMPONENT: GLOWING PROGRESS RING ---
const ProgressRing = ({ radius, stroke, progress }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div className="ring-container">
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        {/* Track */}
        <circle stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        {/* Indicator */}
        <circle 
          stroke="#fbbf24" 
          strokeWidth={stroke} 
          strokeDasharray={circumference + ' ' + circumference} 
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear', filter: 'drop-shadow(0 0 8px #fbbf24)' }} 
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

// --- LOGIC: TIMER ---
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

// --- PREMIUM STYLES (GLASSMORPHISM & ANIMATIONS) ---
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700;900&display=swap');

    body { margin: 0; font-family: 'Outfit', sans-serif; background: #000; color: white; overflow-x: hidden; }
    
    /* Animated Gradient Background */
    .bg-animate {
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1;
      background: linear-gradient(-45deg, #0f172a, #1e3a8a, #0f172a, #312e81);
      background-size: 400% 400%;
      animation: gradientBG 15s ease infinite;
    }
    @keyframes gradientBG { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }

    /* Glass Cards */
    .glass-panel {
      background: rgba(255, 255, 255, 0.03);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
    }

    /* Landing Page Specifics */
    .landing { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
    
    /* Animations */
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0) scale(1); } 100% { opacity: 0; transform: translateY(-100px) scale(1.5); } }
    .float-num { position: absolute; color: #ef4444; font-weight: 900; font-size: 24px; animation: float-up 0.8s forwards; z-index: 50; text-shadow: 0 0 10px rgba(239, 68, 68, 0.5); }
    
    .pulse-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; display: inline-block; margin-right: 8px; box-shadow: 0 0 10px #22c55e; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
  `}</style>
);

// --- SCREEN 1: PREMIUM LANDING PAGE ---
function LoginScreen({ login }) {
  return (
    <div className="landing">
      <GlobalStyle />
      <div className="bg-animate"></div>
      
      <div className="glass-panel" style={{ padding: '50px 30px', maxWidth: '90%', width: '400px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
        <div style={{ fontSize: '70px', marginBottom: '20px' }}>⚡</div>
        <h1 style={{ fontSize: '56px', margin: '0', fontWeight: '900', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          BidBlaze
        </h1>
        <p style={{ fontSize: '18px', color: '#cbd5e1', marginBottom: '40px', fontWeight: '300' }}>The Future of Live Auctions</p>
        
        <button onClick={login} style={{
          background: 'white', color: '#0f172a', border: 'none', padding: '18px 60px',
          borderRadius: '50px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer',
          boxShadow: '0 0 20px rgba(255,255,255,0.3)', transition: 'transform 0.1s'
        }}>
          Enter Arena
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
    <div style={{ minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GlobalStyle />
      <div className="bg-animate"></div>
      
      {/* HEADER */}
      <div className="glass-panel" style={{ width: '100%', maxWidth: '450px', display: 'flex', justifyContent: 'space-between', padding: '15px 20px', marginBottom: '30px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: '500' }}>
          <span className="pulse-dot"></span> {gameState.connectedUsers || 1} LIVE
        </div>
        <button onClick={logout} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px' }}>
          LOGOUT
        </button>
      </div>

      {/* TIMER */}
      <div style={{ 
        fontSize: '36px', fontFamily: "'Outfit', monospace", fontWeight: '700', 
        color: '#fbbf24', marginBottom: '10px', textShadow: '0 0 15px rgba(251, 191, 36, 0.4)' 
      }}>
        {gameState.status === 'ENDED' ? 'SOLD' : <TimerDisplay targetDate={gameState.endTime} onTick={setProgress} />}
      </div>

      {/* JACKPOT RING */}
      <div style={{ position: 'relative', width: '300px', height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
        <ProgressRing radius={150} stroke={6} progress={progress} />
        {floats.map(id => <FloatingNumber key={id} onComplete={() => setFloats(f => f.filter(i => i !== id))} />)}
        
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '3px', fontWeight: '600' }}>CURRENT JACKPOT</p>
          <h2 style={{ fontSize: '64px', margin: '5px 0', fontWeight: '900', color: 'white', textShadow: '0 0 20px rgba(255,255,255,0.3)' }}>
            ${gameState.jackpot.toFixed(2)}
          </h2>
          {gameState.status === 'ENDED' && (
             <div style={{ background: '#22c55e', color: '#000', padding: '5px 15px', borderRadius: '20px', fontWeight: 'bold', fontSize: '14px', marginTop: '10px', display: 'inline-block' }}>
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
          transition: 'all 0.1s', cursor: isCooldown ? 'not-allowed' : 'pointer', letterSpacing: '1px'
        }}
      >
        {gameState.status === 'ENDED' ? 'AUCTION CLOSED' : (isCooldown ? `COOLDOWN ${cdTimer}s` : `BID NOW $${gameState.bidCost}`)}
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

