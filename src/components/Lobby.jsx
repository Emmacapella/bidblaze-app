import React from 'react';

// "Professional Casino" Theme Lobby
const Lobby = ({ user, onJoin, onLogout, connectedUsers }) => {

  return (
    <div className="lobby-container fade-in">
      
      {/* 1. RESTORED NAVIGATION BAR */}
      <nav className="glass-nav">
        {/* Left: Balance & Live Count */}
        <div className="nav-left">
          <div className="balance-pill">
            <span className="coin-icon">⚡</span> 
            ${user.balance.toFixed(2)}
          </div>
          <div className="live-pill">
            <span className="dot">●</span> {connectedUsers || 1} LIVE
          </div>
        </div>

        {/* Right: Actions */}
        <div className="nav-right">
          <button className="nav-icon-btn" title="Help">❓</button>
          <button className="nav-icon-btn" title="Menu">☰</button>
          <button className="logout-btn-minimal" onClick={onLogout} title="Logout">⏻</button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <div className="lobby-hero">
        <h2 className="lobby-title">CHOOSE YOUR TABLE</h2>
        <p className="user-greeting">Welcome back, <span style={{color:'#fbbf24'}}>{user.username}</span></p>
      </div>

      {/* 2. CATEGORY HEADER */}
      <div className="category-section">
        <h3 className="category-header">
          <span className="fire-icon">🔥</span> BIDBLAZE ORIGINALS
        </h3>
        
        {/* 3. SIDE-BY-SIDE GRID */}
        <div className="room-grid">

          {/* ROOM 1: NOVICE ($0.10) */}
          <div className="room-card novice-card" onClick={() => onJoin('low')}>
            <div className="card-badge popular">POPULAR</div>
            <div className="card-content">
               <div className="icon-glow-silver">🛡️</div>
               <h3 className="room-name">Novice</h3>
               <div className="stat-row">
                  <span className="stat-label">ENTRY</span>
                  <span className="stat-val green">$0.10</span>
               </div>
            </div>
            <button className="action-btn-green">PLAY</button>
          </div>

          {/* ROOM 2: HIGH ROLLER ($1.00) */}
          <div className="room-card pro-card" onClick={() => onJoin('high')}>
            <div className="card-badge gold">LEGENDARY</div>
            <div className="card-content">
               <div className="icon-glow-gold">👑</div>
               <h3 className="room-name">High Roller</h3>
               <div className="stat-row">
                  <span className="stat-label">ENTRY</span>
                  <span className="stat-val gold">$1.00</span>
               </div>
            </div>
            <button className="action-btn-gold">PLAY</button>
          </div>

        </div>
      </div>

      {/* FOOTER */}
      <div className="lobby-footer">
        Verified Fair • Instant Payouts • Secure v2.2
      </div>

      {/* --- PROFESSIONAL STYLES --- */}
      <style>{`
        /* LAYOUT */
        .lobby-container {
          width: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 15px;
          color: white;
          margin: 0 auto;
        }

        /* NAVIGATION BAR RESTORED */
        .glass-nav {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 10px 15px;
          border-radius: 20px;
          margin-bottom: 30px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .nav-left { display: flex; align-items: center; gap: 10px; }
        .nav-right { display: flex; align-items: center; gap: 8px; }

        .balance-pill {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          padding: 6px 12px;
          border-radius: 30px;
          font-weight: 800;
          font-size: 14px;
          display: flex; align-items: center; gap: 5px;
        }
        .coin-icon { color: #fbbf24; }
        
        .live-pill {
          font-size: 10px; font-weight: 700; color: #4ade80;
          display: flex; align-items: center; gap: 4px;
          background: rgba(34, 197, 94, 0.1);
          padding: 4px 8px; border-radius: 10px;
        }
        .dot { animation: pulse 2s infinite; }

        .nav-icon-btn {
          background: transparent; border: none; font-size: 18px; cursor: pointer;
          opacity: 0.7; transition: 0.2s;
        }
        .nav-icon-btn:hover { opacity: 1; transform: scale(1.1); }

        .logout-btn-minimal {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          width: 32px; height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px;
        }

        /* HERO */
        .lobby-hero { text-align: center; margin-bottom: 25px; }
        .lobby-title {
          font-size: 24px; font-weight: 900; margin: 0;
          background: linear-gradient(to bottom, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -0.5px;
        }
        .user-greeting { margin: 5px 0 0 0; font-size: 13px; color: #64748b; }

        /* CATEGORY SECTION */
        .category-section { width: 100%; margin-bottom: 20px; }
        .category-header {
          font-size: 12px; color: #94a3b8; letter-spacing: 1px; margin-bottom: 15px;
          display: flex; align-items: center; gap: 6px; font-weight: 800;
          border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;
        }
        .fire-icon { font-size: 14px; }

        /* GRID LAYOUT - SIDE BY SIDE */
        .room-grid {
          display: grid;
          grid-template-columns: 1fr 1fr; /* Two equal columns */
          gap: 15px;
          width: 100%;
        }

        /* COMPACT CARD STYLES */
        .room-card {
          position: relative;
          background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 20px;
          padding: 15px;
          cursor: pointer;
          transition: 0.2s;
          display: flex; flex-direction: column; justify-content: space-between;
          height: 200px; /* Fixed height for uniformity */
        }
        .room-card:active { transform: scale(0.96); }
        .novice-card:hover { border-color: rgba(34, 197, 94, 0.4); box-shadow: 0 0 15px rgba(34, 197, 94, 0.1); }
        .pro-card:hover { border-color: rgba(251, 191, 36, 0.4); box-shadow: 0 0 15px rgba(251, 191, 36, 0.1); }

        .card-badge {
          position: absolute; top: 10px; right: 10px;
          font-size: 8px; font-weight: 900;
          padding: 3px 6px; border-radius: 4px;
        }
        .popular { background: rgba(255,255,255,0.1); color: #cbd5e1; }
        .gold { background: linear-gradient(135deg, #fbbf24, #b45309); color: black; }

        .card-content { text-align: center; margin-top: 10px; }
        .icon-glow-silver { font-size: 32px; margin-bottom: 5px; filter: drop-shadow(0 0 10px rgba(255,255,255,0.1)); }
        .icon-glow-gold { font-size: 32px; margin-bottom: 5px; filter: drop-shadow(0 0 10px rgba(251, 191, 36, 0.3)); }

        .room-name { margin: 0; font-size: 16px; font-weight: 800; color: white; }

        .stat-row {
          margin-top: 10px;
          background: rgba(0,0,0,0.3);
          padding: 6px 10px; border-radius: 8px;
          display: flex; flex-direction: column; gap: 2px;
        }
        .stat-label { font-size: 8px; font-weight: 700; color: #64748b; letter-spacing: 0.5px; }
        .stat-val { font-size: 14px; font-weight: 800; }
        .stat-val.green { color: #4ade80; }
        .stat-val.gold { color: #fbbf24; }

        /* BUTTONS */
        .action-btn-green, .action-btn-gold {
          width: 100%; padding: 10px; border: none; border-radius: 10px;
          font-weight: 800; font-size: 12px; margin-top: 10px; cursor: pointer;
        }
        .action-btn-green { background: #22c55e; color: white; box-shadow: 0 3px 0 #15803d; }
        .action-btn-gold { background: #fbbf24; color: black; box-shadow: 0 3px 0 #b45309; }
        
        .lobby-footer { margin-top: 30px; color: #475569; font-size: 10px; opacity: 0.6; }
        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0% { opacity:0.5; } 50% { opacity:1; } 100% { opacity:0.5; } }
      `}</style>
    </div>
  );
};

export default Lobby;
