import React from 'react';

const Lobby = ({ 
  user, 
  onJoin, 
  onLogout, 
  connectedUsers, 
  onOpenHelp, 
  onOpenMenu, 
  onOpenProfile, 
  onOpenDeposit 
}) => {

  return (
    <div className="lobby-container fade-in">
      
      {/* NAVIGATION BAR */}
      <nav className="glass-nav">
        <div className="nav-left">
          {/* Clicking Balance opens Deposit */}
          <div className="balance-pill" onClick={onOpenDeposit} style={{cursor: 'pointer'}} title="Deposit">
            <span className="coin-icon">⚡</span> ${user.balance.toFixed(2)} <span className="plus-tiny">+</span>
          </div>
          <div className="live-pill">● {connectedUsers || 1} LIVE</div>
        </div>

        <div className="nav-right">
          {/* Buttons connected to App.jsx functions */}
          <button className="nav-icon-btn" onClick={onOpenHelp} title="Help Rules">❓</button>
          <button className="nav-icon-btn" onClick={onOpenMenu} title="Open Menu">☰</button>
          <button className="logout-btn-minimal" onClick={onLogout} title="Logout">⏻</button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="lobby-hero">
        <h2 className="lobby-title">CHOOSE YOUR TABLE</h2>
        {/* Clicking Name opens Profile */}
        <p className="user-greeting" onClick={onOpenProfile} style={{cursor: 'pointer'}} title="View Profile">
           Welcome, <span style={{color:'#fbbf24', textDecoration:'underline'}}>{user.username}</span>
        </p>
      </div>

      {/* GAME CARDS SECTION */}
      <div className="category-section">
        <h3 className="category-header">🔥 BIDBLAZE ORIGINALS</h3>
        
        <div className="room-grid">
          
          {/* NOVICE ROOM ($0.10) */}
          {/* Visual: Shows +$0.095 to Jackpot (Reflecting 5% House Fee) */}
          <div className="room-card novice-card" onClick={() => onJoin('low')}>
            <div className="card-badge popular">POPULAR</div>
            <div className="card-content">
               <div className="icon-glow-silver">🛡️</div>
               <h3 className="room-name">Novice</h3>
               <div className="stat-row">
                  <span className="stat-label">JACKPOT ADDS</span>
                  <span className="stat-val green">+$0.095</span>
               </div>
               <div className="bid-cost-tiny">Bid Cost: $0.10</div>
            </div>
            <button className="action-btn-green">PLAY</button>
          </div>

          {/* HIGH ROLLER ($1.00) */}
          {/* Visual: Shows +$0.95 to Jackpot (Reflecting 5% House Fee) */}
          <div className="room-card pro-card" onClick={() => onJoin('high')}>
            <div className="card-badge gold">LEGENDARY</div>
            <div className="card-content">
               <div className="icon-glow-gold">👑</div>
               <h3 className="room-name">High Roller</h3>
               <div className="stat-row">
                  <span className="stat-label">JACKPOT ADDS</span>
                  <span className="stat-val gold">+$0.95</span>
               </div>
               <div className="bid-cost-tiny">Bid Cost: $1.00</div>
            </div>
            <button className="action-btn-gold">PLAY</button>
          </div>

        </div>
      </div>

      <div className="lobby-footer">Verified Fair • House Fee 5% • Secure v2.4</div>

      {/* STYLES */}
      <style>{`
        /* LAYOUT */
        .lobby-container { width: 100%; max-width: 500px; display: flex; flex-direction: column; align-items: center; padding: 15px; margin: 0 auto; box-sizing: border-box; }

        /* NAV BAR */
        .glass-nav { width: 100%; display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); padding: 10px 15px; border-radius: 16px; margin-bottom: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.4); }
        .nav-left { display: flex; align-items: center; gap: 8px; }
        .nav-right { display: flex; align-items: center; gap: 5px; }

        .balance-pill { background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 20px; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 5px; transition: 0.2s; color: white; }
        .balance-pill:active { transform: scale(0.95); background: rgba(255,255,255,0.15); }
        .plus-tiny { font-size: 10px; background: #22c55e; width: 12px; height: 12px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-left: 2px; }
        
        .live-pill { font-size: 9px; font-weight: 700; color: #4ade80; background: rgba(34, 197, 94, 0.15); padding: 4px 8px; border-radius: 8px; }
        
        .nav-icon-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; opacity: 0.7; padding: 5px; transition: 0.2s; }
        .nav-icon-btn:hover { opacity: 1; transform: scale(1.1); }
        
        .logout-btn-minimal { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; margin-left: 5px; }

        /* HERO */
        .lobby-hero { text-align: center; margin-bottom: 25px; }
        .lobby-title { font-size: 24px; font-weight: 900; margin: 0; background: linear-gradient(to bottom, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.5px; }
        .user-greeting { margin: 5px 0 0 0; font-size: 13px; color: #64748b; font-weight: 500; }

        /* CATEGORY */
        .category-section { width: 100%; margin-bottom: 20px; }
        .category-header { font-size: 11px; color: #94a3b8; letter-spacing: 1.5px; margin-bottom: 12px; display: flex; align-items: center; gap: 6px; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; }

        /* GRID FIX FOR MOBILE - SIDE BY SIDE */
        .room-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; width: 100%; }
        
        /* CARD DESIGN */
        .room-card { position: relative; background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 15px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; height: 200px; transition: 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.2); }
        .room-card:active { transform: scale(0.98); }
        
        .card-badge { position: absolute; top: 10px; right: 10px; font-size: 7px; font-weight: 900; padding: 3px 6px; border-radius: 4px; text-transform: uppercase; }
        .popular { background: rgba(255,255,255,0.1); color: #cbd5e1; }
        .gold { background: linear-gradient(135deg, #fbbf24, #b45309); color: black; box-shadow: 0 2px 8px rgba(251, 191, 36, 0.3); }

        .card-content { text-align: center; margin-top: 15px; }
        .icon-glow-silver { font-size: 32px; margin-bottom: 5px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.15)); }
        .icon-glow-gold { font-size: 32px; margin-bottom: 5px; filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.3)); }
        .room-name { margin: 0; font-size: 16px; font-weight: 800; color: white; letter-spacing: 0.5px; }
        
        .stat-row { margin-top: 10px; background: rgba(0,0,0,0.3); padding: 6px; border-radius: 8px; display: flex; flex-direction: column; gap: 2px; border: 1px solid rgba(255,255,255,0.03); }
        .stat-label { font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
        .stat-val { font-size: 14px; font-weight: 800; }
        .stat-val.green { color: #4ade80; text-shadow: 0 0 10px rgba(74, 222, 128, 0.2); }
        .stat-val.gold { color: #fbbf24; text-shadow: 0 0 10px rgba(251, 191, 36, 0.2); }
        
        .bid-cost-tiny { font-size: 9px; color: #64748b; margin-top: 8px; font-weight: 600; }

        /* BUTTONS */
        .action-btn-green, .action-btn-gold { width: 100%; padding: 10px; border: none; border-radius: 10px; font-weight: 800; font-size: 12px; margin-top: 10px; cursor: pointer; transition: 0.2s; }
        .action-btn-green { background: #22c55e; color: white; box-shadow: 0 3px 0 #15803d; }
        .action-btn-green:active { transform: translateY(3px); box-shadow: none; }
        
        .action-btn-gold { background: #fbbf24; color: black; box-shadow: 0 3px 0 #b45309; }
        .action-btn-gold:active { transform: translateY(3px); box-shadow: none; }
        
        .lobby-footer { margin-top: 30px; color: #475569; font-size: 10px; opacity: 0.5; text-align: center; font-weight: 500; letter-spacing: 0.5px; }
        
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
};

export default Lobby;
