import React from 'react';

const Lobby = ({ user, onJoin, onLogout, connectedUsers, onOpenHelp, onOpenMenu }) => {

  return (
    <div className="lobby-container fade-in">
      
      {/* NAVIGATION BAR */}
      <nav className="glass-nav">
        <div className="nav-left">
          <div className="balance-pill">
            <span className="coin-icon">⚡</span> ${user.balance.toFixed(2)}
          </div>
          <div className="live-pill">● {connectedUsers || 1} LIVE</div>
        </div>

        <div className="nav-right">
          <button className="nav-icon-btn" onClick={onOpenHelp}>❓</button>
          <button className="nav-icon-btn" onClick={onOpenMenu}>☰</button>
          <button className="logout-btn-minimal" onClick={onLogout}>⏻</button>
        </div>
      </nav>

      <div className="lobby-hero">
        <h2 className="lobby-title">CHOOSE YOUR TABLE</h2>
        <p className="user-greeting">Welcome, <span style={{color:'#fbbf24'}}>{user.username}</span></p>
      </div>

      <div className="category-section">
        <h3 className="category-header">🔥 BIDBLAZE ORIGINALS</h3>
        
        <div className="room-grid">
          {/* NOVICE ROOM ($0.10) -> 3 DECIMALS */}
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

      <div className="lobby-footer">Verified Fair • House Fee 5% • Secure v2.3</div>

      <style>{`
        .lobby-container { width: 100%; max-width: 500px; display: flex; flex-direction: column; align-items: center; padding: 15px; margin: 0 auto; box-sizing: border-box; }

        .glass-nav { width: 100%; display: flex; justify-content: space-between; align-items: center; background: rgba(15, 23, 42, 0.8); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 16px; margin-bottom: 25px; }
        .nav-left { display: flex; align-items: center; gap: 8px; }
        .nav-right { display: flex; align-items: center; gap: 8px; }

        .balance-pill { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); padding: 5px 10px; border-radius: 20px; font-weight: 800; font-size: 13px; display: flex; align-items: center; gap: 5px; }
        .live-pill { font-size: 10px; font-weight: 700; color: #4ade80; background: rgba(34, 197, 94, 0.1); padding: 4px 8px; border-radius: 8px; }
        .nav-icon-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; opacity: 0.8; padding: 0 5px; }
        .logout-btn-minimal { background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.2); color: #ef4444; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; }

        .lobby-hero { text-align: center; margin-bottom: 20px; }
        .lobby-title { font-size: 22px; font-weight: 900; margin: 0; background: linear-gradient(to bottom, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .user-greeting { margin: 5px 0 0 0; font-size: 12px; color: #64748b; }

        .category-section { width: 100%; margin-bottom: 20px; }
        .category-header { font-size: 11px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; font-weight: 800; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 8px; }

        /* GRID FIX FOR MOBILE */
        .room-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; width: 100%; }
        
        .room-card { position: relative; background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 12px; cursor: pointer; display: flex; flex-direction: column; justify-content: space-between; height: 190px; }
        .card-badge { position: absolute; top: 8px; right: 8px; font-size: 7px; font-weight: 900; padding: 2px 5px; border-radius: 4px; }
        .popular { background: rgba(255,255,255,0.1); color: #cbd5e1; }
        .gold { background: linear-gradient(135deg, #fbbf24, #b45309); color: black; }

        .card-content { text-align: center; margin-top: 15px; }
        .icon-glow-silver { font-size: 28px; margin-bottom: 5px; filter: drop-shadow(0 0 8px rgba(255,255,255,0.1)); }
        .icon-glow-gold { font-size: 28px; margin-bottom: 5px; filter: drop-shadow(0 0 8px rgba(251, 191, 36, 0.3)); }
        .room-name { margin: 0; font-size: 15px; font-weight: 800; color: white; }
        
        .stat-row { margin-top: 8px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 6px; display: flex; flex-direction: column; gap: 1px; }
        .stat-label { font-size: 7px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
        .stat-val { font-size: 13px; font-weight: 800; }
        .stat-val.green { color: #4ade80; }
        .stat-val.gold { color: #fbbf24; }
        
        .bid-cost-tiny { font-size: 9px; color: #64748b; margin-top: 5px; }

        .action-btn-green, .action-btn-gold { width: 100%; padding: 8px; border: none; border-radius: 8px; font-weight: 800; font-size: 11px; margin-top: 8px; }
        .action-btn-green { background: #22c55e; color: white; box-shadow: 0 3px 0 #15803d; }
        .action-btn-gold { background: #fbbf24; color: black; box-shadow: 0 3px 0 #b45309; }
        
        .lobby-footer { margin-top: 20px; color: #475569; font-size: 9px; opacity: 0.5; text-align: center; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
};
export default Lobby;
