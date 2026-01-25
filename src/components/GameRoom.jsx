import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import MilliTimer from './MilliTimer';

// ASSETS for Sound Effects
const ASSETS = {
  soundBid: 'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  soundWin: 'https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3',
  soundPop: 'https://assets.mixkit.co/active_storage/sfx/2578/2578-preview.mp3'
};

const GameRoom = ({ socket, user, roomType, onLeave, openDeposit, openWithdraw }) => {
  const [gameState, setGameState] = useState(null);
  const [floatingBids, setFloatingBids] = useState([]);
  const [isCooldown, setIsCooldown] = useState(false);
  const [cd, setCd] = useState(0);
  
  // Refs for sound and logic
  const lastBidId = useRef(null);
  const audioRef = useRef(null);
  const prevStatus = useRef("ACTIVE");

  // Determine room settings based on props
  const isHighStakes = roomType === 'high';
  const bidCost = isHighStakes ? 1.00 : 0.10;
  const themeColor = isHighStakes ? '#fbbf24' : '#22c55e'; // Gold vs Green

  const playSound = (key) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    const audio = new Audio(ASSETS[key]);
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  // --- SOCKET LISTENERS FOR THIS SPECIFIC ROOM ---
  useEffect(() => {
    // 1. Join the specific room
    socket.emit('joinRoom', roomType);

    // 2. Listen for game state updates ONLY for this room
    socket.on('roomUpdate', (data) => {
      // The backend will send data specific to this room
      if (data.room === roomType) {
        setGameState(data.state);
        
        // Sound Logic
        if (data.state.status === 'ACTIVE' && data.state.history.length > 0) {
           const latestBid = data.state.history[0];
           if (latestBid.id !== lastBidId.current) {
             playSound('soundBid');
             lastBidId.current = latestBid.id;
           }
        }
        if (data.state.status === 'ENDED' && prevStatus.current === 'ACTIVE') {
           playSound('soundWin');
        }
        prevStatus.current = data.state.status;
      }
    });

    socket.on('bidError', (msg) => alert(msg));

    return () => {
      socket.emit('leaveRoom', roomType);
      socket.off('roomUpdate');
      socket.off('bidError');
    };
  }, [roomType, socket]);

  // --- COOLDOWN TIMER ---
  useEffect(() => {
    let cdInterval;
    if (isCooldown && cd > 0) cdInterval = setInterval(() => setCd(prev => prev - 1), 1000);
    else if (cd <= 0) setIsCooldown(false);
    return () => clearInterval(cdInterval);
  }, [isCooldown, cd]);

  const placeBid = () => {
    if (isCooldown) return;
    if (user.balance < bidCost) { openDeposit(); return; }

    // Visual feedback immediately
    setFloatingBids(prev => [...prev, Date.now()]);
    playSound('soundPop');
    
    // Emit bid with Room ID
    socket.emit('placeBid', { room: roomType, email: user.email });
    
    // Start Cooldown (8 seconds)
    setIsCooldown(true);
    setCd(8);
  };

  if (!gameState) return <div className="loading-spinner">Connecting to Table...</div>;

  return (
    <div className="game-room fade-in">
      {gameState.status === 'ENDED' && <Confetti recycle={false} numberOfPieces={500} />}

      {/* HEADER */}
      <div className="room-header">
         <button onClick={onLeave} className="back-btn">← LOBBY</button>
         <div className="room-tag" style={{borderColor: themeColor, color: themeColor}}>
            {isHighStakes ? '👑 HIGH ROLLER' : '🛡️ NOVICE ROOM'}
         </div>
         <div className="balance-display" onClick={openDeposit}>
            ⚡ ${user.balance.toFixed(2)} <span style={{fontSize:'10px'}}>+</span>
         </div>
      </div>

      {/* MAIN STAGE */}
      <div className="game-stage-wrapper">
        <MilliTimer targetDate={gameState.endTime} status={gameState.status} />
        
        <div className="jackpot-display">
          <div className="jackpot-label">CURRENT JACKPOT</div>
          <div className="jackpot-amount" style={{ textShadow: `0 0 30px ${themeColor}66` }}>
            ${gameState.jackpot.toFixed(2)}
          </div>
          <div className="last-bidder">
             {gameState.lastBidder ? `Last: ${gameState.lastBidder.split('@')[0]}` : 'Waiting for bids...'}
          </div>
        </div>

        {/* Floating Animation */}
        {floatingBids.map(id => (
          <div key={id} className="float-bid" style={{color: themeColor}}>-${bidCost.toFixed(2)}</div>
        ))}
      </div>

      {/* BID BUTTON */}
      <div className="controls-area">
        {gameState.status === 'ENDED' ? (
           <div className="winner-banner">
             {gameState.lastBidder === user.email ? '🏆 YOU WON!' : `WINNER: ${gameState.lastBidder}`}
           </div>
        ) : (
           <button 
             className={`bid-btn ${isCooldown ? 'disabled' : ''}`} 
             onClick={placeBid}
             style={{ background: isCooldown ? '#334155' : themeColor, boxShadow: isCooldown ? 'none' : `0 0 20px ${themeColor}66` }}
           >
             {isCooldown ? `WAIT (${cd}s)` : `BID $${bidCost.toFixed(2)}`}
           </button>
        )}
      </div>

      {/* ACTION LINKS */}
      <div className="quick-actions">
        <button onClick={openDeposit}>DEPOSIT</button>
        <button onClick={openWithdraw}>WITHDRAW</button>
      </div>

      {/* HISTORY FEED */}
      <div className="history-feed">
        <div className="feed-header">RECENT ACTIVITY</div>
        <div className="feed-list">
          {gameState.history.map((bid, i) => (
             <div key={i} className="feed-item">
               <span className="feed-user" style={{color: bid.user === user.email || bid.user === user.username ? '#fbbf24' : 'white'}}>
                 {bid.user.split('@')[0]}
               </span>
               <span className="feed-amt" style={{color: themeColor}}>${bid.amount.toFixed(2)}</span>
             </div>
          ))}
        </div>
      </div>

      <style>{`
        .game-room { width: 100%; max-width: 450px; display: flex; flex-direction: column; align-items: center; padding-bottom: 30px; }
        .room-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 10px; }
        .back-btn { background: none; border: none; color: #94a3b8; font-weight: bold; cursor: pointer; }
        .room-tag { border: 1px solid; padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 900; letter-spacing: 1px; }
        .balance-display { background: rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 5px; }

        .game-stage-wrapper { position: relative; margin: 20px 0; display: flex; justify-content: center; align-items: center; }
        .jackpot-display { position: absolute; text-align: center; z-index: 10; }
        .jackpot-label { font-size: 10px; letter-spacing: 2px; color: #94a3b8; }
        .jackpot-amount { font-size: 42px; font-weight: 900; color: white; margin: 5px 0; }
        .last-bidder { font-size: 12px; color: #fbbf24; background: rgba(0,0,0,0.5); padding: 4px 8px; border-radius: 4px; display: inline-block; }

        .controls-area { width: 100%; padding: 0 20px; margin-bottom: 15px; }
        .bid-btn { width: 100%; padding: 20px; border: none; border-radius: 16px; font-size: 20px; font-weight: 900; color: #0f172a; cursor: pointer; transition: transform 0.1s; }
        .bid-btn:active { transform: scale(0.98); }
        .bid-btn.disabled { color: #94a3b8; cursor: not-allowed; }
        .winner-banner { background: #fbbf24; color: black; padding: 20px; text-align: center; font-weight: 900; font-size: 20px; border-radius: 16px; width: 100%; }

        .quick-actions { display: flex; gap: 10px; width: 100%; padding: 0 20px; margin-bottom: 20px; }
        .quick-actions button { flex: 1; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: #94a3b8; border-radius: 8px; font-weight: bold; cursor: pointer; }

        .history-feed { width: 90%; background: rgba(0,0,0,0.2); border-radius: 12px; padding: 15px; border: 1px solid rgba(255,255,255,0.05); }
        .feed-header { font-size: 10px; color: #64748b; margin-bottom: 10px; font-weight: bold; letter-spacing: 1px; }
        .feed-list { display: flex; flex-direction: column; gap: 8px; max-height: 100px; overflow-y: auto; }
        .feed-item { display: flex; justify-content: space-between; font-size: 12px; border-bottom: 1px solid rgba(255,255,255,0.02); padding-bottom: 4px; }
        
        .float-bid { position: absolute; font-size: 24px; font-weight: bold; animation: floatUp 0.8s forwards; pointer-events: none; z-index: 20; }
        @keyframes floatUp { 0% { opacity:1; transform:translateY(0); } 100% { opacity:0; transform:translateY(-100px); } }
        .loading-spinner { color: #fbbf24; font-family: monospace; margin-top: 50px; }
      `}</style>
    </div>
  );
};

export default GameRoom;
