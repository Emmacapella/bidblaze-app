import React from 'react';

// "Professional Casino" Theme Lobby
const Lobby = ({ user, onJoin, onLogout, connectedUsers }) => {

  return (
    <div className="lobby-container fade-in">
      {/* HEADER: Glass Bar */}
      <div className="lobby-header glass-effect">
        <div className="user-badge">
          <div className="avatar-circle">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <div className="username">{user.username}</div>
            <div className="balance-row">
              <span className="coin-icon">⚡</span> 
              <span className="balance-val">${user.balance.toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        {/* Cleaner Logout Button */}
        <button className="logout-btn-minimal" onClick={onLogout}>
          <span style={{fontSize: '18px'}}>⏻</span>
        </button>
      </div>

      <div style={{textAlign: 'center', marginBottom: '30px'}}>
        <h2 className="lobby-title">SELECT TABLE</h2>
        <div className="online-pill">
           <span className="dot">●</span> {connectedUsers || 1} ONLINE
        </div>
      </div>

      {/* ROOM GRID */}
      <div className="room-grid">

        {/* ROOM 1: NOVICE ($0.10) */}
        <div className="room-card novice-card" onClick={() => onJoin('low')}>
          <div className="card-badge popular">POPULAR</div>
          <div className="icon-glow-silver">🛡️</div>
          <h3 className="room-name">Novice Room</h3>
          <p className="room-desc">Low risk. Perfect for strategy.</p>
          
          <div className="stat-row">
             <span className="stat-label">ENTRY COST</span>
             <span className="stat-val green">$0.10</span>
          </div>

          <button className="action-btn-green">ENTER ROOM</button>
        </div>

        {/* ROOM 2: HIGH ROLLER ($1.00) */}
        <div className="room-card pro-card" onClick={() => onJoin('high')}>
          <div className="card-badge gold">LEGENDARY</div>
          <div className="icon-glow-gold">👑</div>
          <h3 className="room-name">High Roller</h3>
          <p className="room-desc">High stakes. Massive Jackpots.</p>

          <div className="stat-row">
             <span className="stat-label">ENTRY COST</span>
             <span className="stat-val gold">$1.00</span>
          </div>

          <button className="action-btn-gold">ENTER ARENA</button>
        </div>

      </div>

      {/* FOOTER */}
      <div className="lobby-footer">
        Verified Fair • Instant Payouts • Secure v2.1
      </div>

      {/* --- PROFESSIONAL STYLES --- */}
      <style>{`
        /* LAYOUT */
        .lobby-container {
          width: 100%;
          max-width: 500px; /* Tighter width for mobile focus */
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          color: white;
          margin: 0 auto;
        }

        /* GLASS HEADER */
        .lobby-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          border-radius: 50px; /* Pill shape header */
          margin-bottom: 40px;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(12px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .user-badge { display: flex; gap: 12px; align-items: center; }
        .avatar-circle {
          width: 38px; height: 38px;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: bold; font-size: 16px;
          box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
        }
        .user-info { display: flex; flex-direction: column; }
        .username { font-size: 12px; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; }
        .balance-row { display: flex; align-items: center; gap: 4px; }
        .coin-icon { font-size: 12px; color: #fbbf24; }
        .balance-val { font-size: 16px; font-weight: 800; color: white; }

        .logout-btn-minimal {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #ef4444;
          width: 38px; height: 38px;
          border-radius: 50%;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: 0.2s;
        }
        .logout-btn-minimal:active { transform: scale(0.95); background: rgba(239, 68, 68, 0.1); }

        /* TITLES */
        .lobby-title {
          font-size: 28px; font-weight: 900; margin: 0 0 8px 0;
          background: linear-gradient(to bottom, #fff, #cbd5e1);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: -1px;
        }
        .online-pill {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(34, 197, 94, 0.1);
          color: #4ade80;
          font-size: 11px; font-weight: 700;
          padding: 4px 10px; border-radius: 20px;
          border: 1px solid rgba(34, 197, 94, 0.2);
        }
        .dot { font-size: 8px; animation: pulse 2s infinite; }

        /* CARDS */
        .room-grid { width: 100%; display: flex; flex-direction: column; gap: 20px; }
        
        .room-card {
          position: relative;
          background: linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.9) 100%);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 24px;
          padding: 25px;
          cursor: pointer;
          transition: 0.2s;
          overflow: hidden;
        }
        .room-card:active { transform: scale(0.98); }
        
        .novice-card:hover { border-color: rgba(34, 197, 94, 0.3); }
        .pro-card:hover { border-color: rgba(251, 191, 36, 0.3); }

        .card-badge {
          position: absolute; top: 12px; right: 12px;
          font-size: 10px; font-weight: 800; letter-spacing: 0.5px;
          padding: 4px 8px; border-radius: 6px;
          text-transform: uppercase;
        }
        .popular { background: rgba(255,255,255,0.1); color: #cbd5e1; }
        .gold { background: linear-gradient(135deg, #fbbf24, #b45309); color: black; box-shadow: 0 2px 10px rgba(251, 191, 36, 0.3); }

        .icon-glow-silver { font-size: 40px; margin-bottom: 10px; filter: drop-shadow(0 0 15px rgba(255,255,255,0.1)); }
        .icon-glow-gold { font-size: 40px; margin-bottom: 10px; filter: drop-shadow(0 0 15px rgba(251, 191, 36, 0.3)); }

        .room-name { margin: 0; font-size: 20px; font-weight: 800; color: white; }
        .room-desc { margin: 5px 0 20px 0; color: #94a3b8; font-size: 13px; }

        .stat-row {
          display: flex; justify-content: space-between; align-items: center;
          background: rgba(0,0,0,0.2);
          padding: 12px 16px; border-radius: 12px;
          margin-bottom: 15px;
        }
        .stat-label { font-size: 10px; font-weight: 700; color: #64748b; letter-spacing: 1px; }
        .stat-val { font-size: 16px; font-weight: 800; }
        .stat-val.green { color: #4ade80; }
        .stat-val.gold { color: #fbbf24; }

        /* BUTTONS */
        .action-btn-green {
          width: 100%; padding: 14px; border: none; border-radius: 14px;
          background: linear-gradient(to bottom, #22c55e, #16a34a);
          color: white; font-weight: 800; font-size: 14px; letter-spacing: 0.5px;
          box-shadow: 0 4px 0 #15803d; /* 3D effect */
          cursor: pointer;
        }
        .action-btn-green:active { transform: translateY(4px); box-shadow: none; }

        .action-btn-gold {
          width: 100%; padding: 14px; border: none; border-radius: 14px;
          background: linear-gradient(to bottom, #fbbf24, #d97706);
          color: #0f172a; font-weight: 800; font-size: 14px; letter-spacing: 0.5px;
          box-shadow: 0 4px 0 #b45309; /* 3D effect */
          cursor: pointer;
        }
        .action-btn-gold:active { transform: translateY(4px); box-shadow: none; }

        .lobby-footer { margin-top: 40px; color: #475569; font-size: 10px; letter-spacing: 1px; opacity: 0.6; }

        .fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0% { opacity:0.5; } 50% { opacity:1; } 100% { opacity:0.5; } }
      `}</style>
    </div>
  );
};

export default Lobby;
