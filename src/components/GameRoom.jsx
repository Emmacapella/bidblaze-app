import React, { useState, useEffect, useRef } from 'react';
import Confetti from 'react-confetti';
import MilliTimer from './MilliTimer';

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

  const lastBidId = useRef(null);
  const audioRef = useRef(null);
  const prevStatus = useRef("ACTIVE");

  const isHighStakes = roomType === 'high';
  const bidCost = isHighStakes ? 1.00 : 0.10;
  
  // FIX: Force 3 decimals for Novice ($0.095), 2 decimals for High Roller ($0.95)
  const decimals = isHighStakes ? 2 : 3;
  const displayBidCost = bidCost.toFixed(2); // Button always shows what you PAY ($0.10)

  const themeColor = isHighStakes ? '#fbbf24' : '#22c55e';
  const themeShadow = isHighStakes ? 'rgba(251, 191, 36, 0.4)' : 'rgba(34, 197, 94, 0.4)';

  const playSound = (key) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    const audio = new Audio(ASSETS[key]);
    audio.volume = 0.5;
    audioRef.current = audio;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    socket.emit('joinRoom', roomType);
    socket.on('roomUpdate', (data) => {
      if (data.room === roomType) {
        setGameState(data.state);
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

  useEffect(() => {
    let cdInterval;
    if (isCooldown && cd > 0) cdInterval = setInterval(() => setCd(prev => prev - 1), 1000);
    else if (cd <= 0) setIsCooldown(false);
    return () => clearInterval(cdInterval);
  }, [isCooldown, cd]);

  const placeBid = () => {
    if (isCooldown) return;
    if (user.balance < bidCost) { openDeposit(); return; }
    setFloatingBids(prev => [...prev, Date.now()]);
    playSound('soundPop');
    socket.emit('placeBid', { room: roomType, email: user.email });
    setIsCooldown(true);
    setCd(8);
  };

  if (!gameState) return <div className="loading-spinner">Connecting to Table...</div>;

  return (
    <div className="game-room fade-in">
      {gameState.status === 'ENDED' && <Confetti recycle={false} numberOfPieces={500} colors={[themeColor, '#ffffff']} />}

      {/* HEADER */}
      <div className="casino-header">
         <button onClick={onLeave} className="back-btn-pill">← LOBBY</button>
         <div className="room-badge" style={{ boxShadow: `0 0 15px ${themeShadow}`, borderColor: themeColor, color: themeColor }}>
             {isHighStakes ? '👑 HIGH ROLLER' : '🛡️ NOVICE ROOM'}
         </div>
         <div className="wallet-pill" onClick={openDeposit}>
            <span style={{color: themeColor}}>⚡</span> ${user.balance.toFixed(2)} <span className="plus">+</span>
         </div>
      </div>

      {/* REACTOR STAGE */}
      <div className="game-stage-wrapper">
        <div className="timer-backdrop" style={{ boxShadow: `0 0 40px ${themeShadow}` }}></div>
        <MilliTimer targetDate={gameState.endTime} status={gameState.status} />

        <div className="jackpot-core">
          <div className="jackpot-label">CURRENT JACKPOT</div>
          <div className="jackpot-amount" style={{ textShadow: `0 0 25px ${themeShadow}, 0 0 5px white` }}>
            {/* FIX: Using 'decimals' var to force 3 decimal places for Novice */}
            ${gameState.jackpot.toFixed(decimals)}
          </div>
          <div className="last-bidder-pill">
             {gameState.lastBidder ? (
                 <>LAST: <span style={{color: themeColor, fontWeight:'bold'}}>{gameState.lastBidder.split('@')[0]}</span></>
             ) : 'WAITING FOR BIDS...'}
          </div>
        </div>

        {floatingBids.map(id => (
          <div key={id} className="float-bid" style={{color: themeColor, textShadow: `0 0 10px ${themeColor}`}}>
              {/* FIX: Floating text shows full cost */}
              -${displayBidCost}
          </div>
        ))}
      </div>

      {/* CONTROLS */}
      <div className="controls-area">
        {gameState.status === 'ENDED' ? (
           <div className="winner-banner" style={{ background: themeColor, boxShadow: `0 0 30px ${themeColor}` }}>
             {gameState.lastBidder === user.email ? '🏆 YOU WON!' : `WINNER: ${gameState.lastBidder}`}
           </div>
        ) : (
           <button
             className={`bid-btn-3d ${isCooldown ? 'cooldown' : ''}`}
             onClick={placeBid}
             style={!isCooldown ? { background: `linear-gradient(180deg, ${themeColor} 0%, #000 100%)`, boxShadow: `0 6px 0 #064e3b, 0 0 20px ${themeShadow}` } : {}}
           >
             {isCooldown ? `COOLDOWN (${cd}s)` : `BID $${displayBidCost}`}
           </button>
        )}
      </div>

      <div className="action-row">
        <button className="secondary-btn" onClick={openDeposit}>DEPOSIT</button>
        <button className="secondary-btn" onClick={openWithdraw}>WITHDRAW</button>
      </div>

      <div className="history-table glass-panel">
        <div className="table-header">RECENT BIDS</div>
        <div className="table-body">
          {gameState.history.length === 0 ? (
              <div style={{padding:'10px', textAlign:'center', color:'#64748b', fontSize:'12px'}}>No bids yet. Be the first!</div>
          ) : (
              gameState.history.map((bid, i) => (
                <div key={i} className="table-row">
                  <div className="row-user" style={{ color: bid.user === user.email || bid.user === user.username ? themeColor : 'white' }}>
                    {bid.user.split('@')[0]}
                  </div>
                  <div className="row-amt" style={{color: '#94a3b8'}}>${bid.amount.toFixed(2)}</div>
                  <div className="row-time">{new Date(bid.id).toLocaleTimeString([], {hour12:false, hour:'2-digit', minute:'2-digit', second:'2-digit'})}</div>
                </div>
              ))
          )}
        </div>
      </div>

      <style>{`
        .game-room { width: 100%; max-width: 450px; display: flex; flex-direction: column; align-items: center; padding-bottom: 40px; margin: 0 auto; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }

        .casino-header { width: 100%; display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; padding: 10px; }
        .back-btn-pill { background: rgba(255,255,255,0.1); border: none; color: #94a3b8; padding: 8px 16px; border-radius: 20px; font-weight: 700; font-size: 11px; cursor: pointer; transition: 0.2s; }
        .room-badge { padding: 6px 14px; border-radius: 20px; border: 1px solid; font-size: 10px; font-weight: 900; letter-spacing: 1px; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); }
        .wallet-pill { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05)); border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 20px; font-weight: 800; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 6px; }
        .plus { font-size: 10px; background: rgba(255,255,255,0.2); width: 14px; height: 14px; display: flex; align-items: center; justify-content: center; border-radius: 50%; }

        .game-stage-wrapper { position: relative; width: 300px; height: 300px; margin: 10px 0 30px 0; display: flex; justify-content: center; align-items: center; }
        .timer-backdrop { position: absolute; width: 200px; height: 200px; border-radius: 50%; background: radial-gradient(circle, rgba(0,0,0,0) 0%, rgba(0,0,0,0.8) 100%); z-index: 0; }
        .jackpot-core { position: absolute; text-align: center; z-index: 10; display: flex; flex-direction: column; align-items: center; }
        .jackpot-label { font-size: 10px; letter-spacing: 3px; color: #64748b; font-weight: 700; margin-bottom: 5px; text-transform: uppercase; }
        .jackpot-amount { font-size: 48px; font-weight: 900; color: white; line-height: 1; letter-spacing: -1px; }
        .last-bidder-pill { background: rgba(15, 23, 42, 0.8); padding: 6px 12px; border-radius: 12px; font-size: 11px; margin-top: 10px; color: #94a3b8; border: 1px solid rgba(255,255,255,0.1); }

        .controls-area { width: 100%; padding: 0 20px; margin-bottom: 20px; display: flex; justify-content: center; }
        .bid-btn-3d { width: 100%; max-width: 320px; padding: 18px; border: none; border-radius: 16px; font-size: 22px; font-weight: 900; color: white; text-shadow: 0 2px 0 rgba(0,0,0,0.3); cursor: pointer; transition: transform 0.1s, box-shadow 0.1s; position: relative; overflow: hidden; text-transform: uppercase; letter-spacing: 1px; }
        .bid-btn-3d:active { transform: translateY(4px); box-shadow: none !important; }
        .bid-btn-3d::after { content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 50%; background: linear-gradient(to bottom, rgba(255,255,255,0.2), transparent); pointer-events: none; }
        .bid-btn-3d.cooldown { background: #334155 !important; color: #64748b; box-shadow: 0 6px 0 #1e293b !important; cursor: not-allowed; }
        .winner-banner { width: 100%; padding: 20px; text-align: center; font-weight: 900; font-size: 20px; border-radius: 16px; color: black; animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        
        .action-row { display: flex; gap: 15px; width: 100%; padding: 0 30px; margin-bottom: 30px; }
        .secondary-btn { flex: 1; padding: 12px; background: rgba(30, 41, 59, 0.5); border: 1px solid rgba(255,255,255,0.1); color: #cbd5e1; font-weight: 700; font-size: 12px; border-radius: 10px; cursor: pointer; transition: 0.2s; }
        .secondary-btn:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }

        .history-table { width: 90%; background: #0f172a; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3); }
        .table-header { background: #1e293b; padding: 12px 20px; font-size: 11px; font-weight: 800; color: #64748b; letter-spacing: 1px; text-transform: uppercase; border-bottom: 1px solid #334155; }
        .table-body { max-height: 150px; overflow-y: auto; }
        .table-row { display: flex; justify-content: space-between; padding: 10px 20px; border-bottom: 1px solid rgba(255,255,255,0.03); font-size: 13px; font-family: 'JetBrains Mono', monospace; }
        .row-user { font-weight: 700; }
        .row-time { color: #475569; font-size: 11px; }

        .float-bid { position: absolute; font-size: 28px; font-weight: 900; animation: floatUp 0.8s ease-out forwards; pointer-events: none; z-index: 100; top: 40%; }
        @keyframes floatUp { 0% { opacity:1; transform:translateY(0) scale(0.8); } 50% { transform:translateY(-50px) scale(1.2); } 100% { opacity:0; transform:translateY(-100px) scale(1); } }
        .loading-spinner { color: #fbbf24; margin-top: 50px; font-family: monospace; letter-spacing: 2px; }
      `}</style>
    </div>
  );
};

export default GameRoom;
