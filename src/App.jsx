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
const playSound = (url) => {
  const audio = new Audio(url);
  audio.play().catch(e => console.log("Audio play blocked"));
};

// --- COMPONENT: FLOATING BID NUMBER ---
function FloatingNumber({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <div style={{ position: 'absolute', color: '#ef4444', fontWeight: 'bold', animation: 'float-up 1s forwards', zIndex: 50, fontSize: '20px' }}>-$1.00</div>
  );
}

// --- COMPONENT: PROGRESS RING ---
const ProgressRing = ({ radius, stroke, progress }) => {
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        <circle stroke="#fbbf24" strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s linear' }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
      </svg>
    </div>
  );
};

// --- COMPONENT: TIMER LOGIC ---
function TimerLogic({ targetDate, onTick }) {
  const [timeLeft, setTimeLeft] = useState("00:00");
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const distance = targetDate - now;
      if (distance < 0) {
        setTimeLeft("00:00");
        onTick(0);
      } else {
        const totalSeconds = distance / 1000;
        onTick(Math.min((totalSeconds / 60) * 100, 100));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);
        setTimeLeft(`${m}:${s < 10 ? '0' : ''}${s}`);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [targetDate, onTick]);
  return <span>{timeLeft}</span>;
}

// --- GLOBAL STYLES ---
const GlobalStyle = () => (
  <style>{`
    body, html { margin: 0; padding: 0; width: 100%; height: 100%; background-color: #0f172a; overflow-x: hidden; color: white; font-family: sans-serif; }
    #root { width: 100%; height: 100%; }
    * { box-sizing: border-box; }
    @keyframes float-up { 0% { opacity: 1; transform: translateY(0); } 100% { opacity: 0; transform: translateY(-100px); } }
    @keyframes pulse-dot { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
    @keyframes pulse-winner { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
  `}</style>
);

function LoginScreen({ login }) {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <h1 style={{ color: '#fbbf24', fontSize: '40px' }}>BidBlaze ⚡</h1>
      <button onClick={login} style={{ background: '#3b82f6', border: 'none', padding: '16px 40px', color: 'white', borderRadius: '30px', fontWeight: 'bold', marginTop: '20px' }}>Enter Arena</button>
    </div>
  );
}

function GameDashboard({ logout, user }) {
  const [gameState, setGameState] = useState(null);
  const [progress, setProgress] = useState(100);
  const [floatingBids, setFloatingBids] = useState([]);
  const [userCount, setUserCount] = useState(1);
  const prevStatus = useRef("ACTIVE");

  useEffect(() => {
    socket.on('gameState', (data) => {
      setGameState(data);
      setUserCount(data.connectedUsers || 1);
      if (data.status === 'ACTIVE' && data.history.length > 0) {
        playSound('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3');
      }
      if (data.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
        confetti({ zIndex: 9999, origin: { y: 0.6 } });
        playSound('https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3');
        setProgress(0);
      }
      prevStatus.current = data.status;
    });
    return () => socket.off('gameState');
  }, []);

  const placeBid = () => {
    const id = Date.now();
    setFloatingBids(prev => [...prev, id]);
    const identifier = user.email ? user.email.address : "User";
    socket.emit('placeBid', identifier);
  };

  const getWinnerName = () => {
    if (gameState.history && gameState.history.length > 0) {
      const name = gameState.history[0].user.split('@')[0];
      return name.length > 12 ? name.slice(0, 12) + '...' : name;
    }
    return "No Bids";
  };

  if (!gameState) return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h2>Loading...</h2></div>;

  return (
    <div style={{ minHeight: '100vh', width: '100vw', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <GlobalStyle />
      
      {/* HEADER & LIVE COUNTER */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '400px', marginBottom: '20px' }}>
        <div style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%', animation: 'pulse-dot 1s infinite' }}></span>
          {userCount} Online
        </div>
        <button onClick={logout} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Logout</button>
      </nav>

      {/* TIMER (ABOVE RING) */}
      <div style={{ fontSize: '28px', fontWeight: 'bold', fontFamily: 'monospace', color: '#fbbf24', marginBottom: '15px' }}>
        ⏱️ {gameState.status === 'ENDED' ? 'ENDED' : <TimerLogic targetDate={gameState.endTime} onTick={setProgress} />}
      </div>

      {/* REACTOR RING & JACKPOT */}
      <div style={{ position: 'relative', width: '280px', height: '280px', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '30px' }}>
        <ProgressRing radius={140} stroke={8} progress={progress} />
        {floatingBids.map(id => <FloatingNumber key={id} onComplete={() => setFloatingBids(prev => prev.filter(b => b !== id))} />)}
        
        <div style={{ textAlign: 'center', zIndex: 10 }}>
          {gameState.status === 'ENDED' ? (
            <div style={{ animation: 'pulse-winner 1s infinite' }}>
              <h3 style={{ fontSize: '32px', margin: '0' }}>🏆</h3>
              <h2 style={{ fontSize: '24px', margin: '10px 0' }}>{getWinnerName()} WON!</h2>
            </div>
          ) : (
            <>
              <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px', letterSpacing: '2px' }}>JACKPOT</p>
              <h2 style={{ fontSize: '50px', margin: '0', fontWeight: 'bold' }}>${gameState.jackpot.toFixed(2)}</h2>
            </>
          )}
        </div>
      </div>

      {/* BID BUTTON */}
      <button onClick={placeBid} disabled={gameState.status !== 'ACTIVE'} style={{ width: '100%', maxWidth: '300px', padding: '20px', borderRadius: '50px', background: gameState.status === 'ACTIVE' ? '#ef4444' : '#64748b', border: 'none', color: 'white', fontWeight: 'bold', fontSize: '20px', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' }}>
        {gameState.status === 'ACTIVE' ? `BID NOW ($${gameState.bidCost})` : 'AUCTION ENDED'}
      </button>

      {/* RECENT BIDS HISTORY */}
      <div style={{ width: '100%', maxWidth: '350px', marginTop: '30px' }}>
        <h3 style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '15px', textTransform: 'uppercase', textAlign: 'center' }}>Recent Action</h3>
        {gameState.history.map((bid) => (
          <div key={bid.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 20px', background: 'rgba(30, 41, 59, 0.5)', marginBottom: '8px', borderRadius: '12px', fontSize: '14px', border: '1px solid #334155' }}>
            <span>{bid.user.split('@')[0].slice(0, 10)}...</span>
            <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>${bid.amount.toFixed(2)}</span>
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
    <PrivyProvider appId={PRIVY_APP_ID} config={{ loginMethods: ['email', 'wallet'], appearance: { theme: 'dark' } }}>
      {authenticated ? <GameDashboard logout={logout} user={user} /> : <LoginScreen login={login} />}
    </PrivyProvider>
  );
}

