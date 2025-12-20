import { useState, useEffect, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import io from 'socket.io-client';
import confetti from 'canvas-confetti';

// --- CLOUD CONNECTION ---
let socket;
if (!window.gameSocket) {
  window.gameSocket = io('https://bidblaze-server.onrender.com', {
    transports: ['websocket'],
    reconnectionAttempts: 5,
  });
}
socket = window.gameSocket;

export default function App() {
  const { login, authenticated, user, logout } = usePrivy();
  
  // Ref trick: Keeps 'user' fresh inside the socket listener without restarting it
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);

  const [gameStatus, setGameStatus] = useState('ACTIVE');
  const [jackpot, setJackpot] = useState(1250);
  const [endTime, setEndTime] = useState(Date.now() + 300000); 
  const [timeLeft, setTimeLeft] = useState(299); 
  const [bidCost, setBidCost] = useState(1);
  const [lastBidder, setLastBidder] = useState("No bids yet");
  const [bidHistory, setBidHistory] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(142);

  // 1. LISTEN TO SERVER (Cloud)
  useEffect(() => {
    const onGameState = (state) => {
      setGameStatus(state.status);
      setJackpot(state.jackpot);
      setBidCost(state.bidCost);
      setLastBidder(state.lastBidder);
      setBidHistory(state.history);
      setEndTime(state.endTime); 

      // --- CONFETTI LOGIC ---
      // Check if "I" am the new King
      const currentUserEmail = userRef.current?.email?.address;
      if (currentUserEmail && state.lastBidder === currentUserEmail && state.status === 'ACTIVE') {
        triggerConfetti();
      }
    };

    socket.on('gameState', onGameState);
    return () => socket.off('gameState', onGameState);
  }, []);

  // 2. LOCAL COUNTDOWN
  useEffect(() => {
    const timer = setInterval(() => {
      if (gameStatus === 'ACTIVE') {
        const secondsRemaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        setTimeLeft(secondsRemaining);
      }
    }, 100); 
    return () => clearInterval(timer);
  }, [endTime, gameStatus]); 

  // Fake User Count
  useEffect(() => {
    const interval = setInterval(() => setOnlineUsers(prev => 140 + Math.floor(Math.random() * 10)), 5000);
    return () => clearInterval(interval);
  }, []);

  const handleBid = () => {
    if (!authenticated) return login();
    if (gameStatus === 'ENDED') return;
    socket.emit('placeBid', user?.email?.address);
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0061ff', '#00d4ff', '#ffd700']
    });
  };

  // UI Helpers
  const totalTime = 299;
  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / totalTime) * circumference;
  
  const getColor = () => {
    if (timeLeft > 100) return "#00d4ff"; 
    if (timeLeft > 50) return "#ffd700"; 
    return "#ff4444"; 
  };

  return (
    <div style={{ textAlign: "center", background: "linear-gradient(135deg, #020024 0%, #090979 35%, #00d4ff 100%)", minHeight: "100vh", color: "#fff", padding: "20px", fontFamily: "'Segoe UI', sans-serif" }}>
      
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ background: "rgba(0,0,0,0.4)", padding: "5px 15px", borderRadius: "20px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
          <div style={{ width: "8px", height: "8px", background: gameStatus === 'ACTIVE' ? "#4CAF50" : "red", borderRadius: "50%" }}></div>
          {onlineUsers} Online
        </div>
        {!authenticated && <button onClick={login} style={{ fontSize: "12px", padding: "5px 15px", borderRadius: "15px", border: "none" }}>Login</button>}
      </div>

      {!authenticated ? (
         <div style={{ marginTop: "30vh" }}>
           <h1>BidBlaze ⚡</h1>
           <button onClick={login} style={{ background: "#fff", color: "#0061ff", padding: "15px 40px", borderRadius: "30px", border: "none", fontWeight: "bold", fontSize: "16px", marginTop: "20px" }}>Connect Wallet</button>
         </div>
      ) : (
        <div style={{ maxWidth: "400px", margin: "auto" }}>
          
          {gameStatus === 'ENDED' ? (
             <div style={{ background: "rgba(0,0,0,0.6)", padding: "40px", borderRadius: "20px", marginTop: "50px", backdropFilter: "blur(10px)" }}>
                <h1>🏆 WINNER!</h1>
                <h3 style={{ color: "#ffd700", fontSize: "24px" }}>{lastBidder}</h3>
                <p>won <strong>${jackpot.toLocaleString()}</strong></p>
                <div style={{ marginTop: "30px", color: "#8be9fd" }}>Next round starts in 30s...</div>
             </div>
          ) : (
            <>
              <div style={{ marginBottom: "20px", background: "rgba(255,255,255,0.1)", padding: "10px", borderRadius: "15px" }}>
                <div style={{ fontSize: "24px" }}>👑</div>
                <div style={{ fontSize: "12px", color: "#aaa" }}>CURRENT KING</div>
                <div style={{ fontWeight: "bold", color: "#ffd700", fontSize: "16px" }}>{lastBidder === user?.email?.address ? "YOU!" : lastBidder}</div>
              </div>

              <div style={{ position: "relative", width: "200px", height: "200px", margin: "0 auto 20px auto" }}>
                <svg width="200" height="200" style={{ transform: "rotate(-90deg)" }}>
                  <circle cx="100" cy="100" r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth="10" fill="transparent" />
                  <circle cx="100" cy="100" r={radius} stroke={getColor()} strokeWidth="10" fill="transparent" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear, stroke 1s ease" }} />
                </svg>
                <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
                  <div style={{ fontSize: "36px", fontWeight: "bold", fontFamily: "monospace" }}>{timeLeft}s</div>
                  <div style={{ fontSize: "12px", color: "#aaa" }}>REMAINING</div>
                </div>
              </div>

              <div style={{ fontSize: "48px", fontWeight: "800", marginBottom: "20px" }}>${jackpot.toLocaleString()}</div>

              <div style={{ background: "#fff", padding: "5px", borderRadius: "25px", display: "flex", alignItems: "center" }}>
                <div style={{ padding: "15px", paddingLeft: "25px", flex: 1, textAlign: "left" }}>
                  <span style={{ display: "block", fontSize: "10px", color: "#888", fontWeight: "bold" }}>PRICE</span>
                  <span style={{ color: "#000", fontSize: "20px", fontWeight: "900" }}>${bidCost}</span>
                </div>
                <button onClick={handleBid} style={{ background: "linear-gradient(90deg, #0061ff, #00d4ff)", color: "#fff", border: "none", padding: "15px 40px", borderRadius: "20px", fontSize: "16px", fontWeight: "bold" }}>
                  BID NOW
                </button>
              </div>
            </>
          )}

          <div style={{ marginTop: "30px", textAlign: "left" }}>
             <p style={{ fontSize: "12px", color: "#8be9fd", fontWeight: "bold", paddingLeft: "10px" }}>LIVE FEED</p>
             {bidHistory.map((bid) => (
                <div key={bid.id} style={{ padding: "10px", borderBottom: "1px solid rgba(255,255,255,0.1)", fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                  <span><span style={{ color: "#ffd700" }}>⚡</span> <strong>{bid.user === user?.email?.address ? "You" : bid.user}</strong> spent ${bid.amount}</span>
                  <span style={{ color: "#aaa", fontSize: "11px" }}>{bid.time}</span>
                </div>
             ))}
          </div>

          <button onClick={logout} style={{ marginTop: "40px", background: "none", border: "none", color: "#fff", opacity: 0.5, fontSize: "12px" }}>Sign Out</button>
        </div>
      )}
    </div>
  );
}

