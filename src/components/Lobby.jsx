import React from 'react';

// This component is the "Main Menu" where users select a room.
const Lobby = ({ user, onJoin, onLogout, connectedUsers }) => {
  
  return (
    <div className="lobby-container fade-in">
      {/* HEADER: User Stats */}
      <div className="lobby-header">
        <div className="user-badge">
          <div className="avatar">👤</div>
          <div>
            <div className="username">{user.username}</div>
            <div className="balance">
              <span style={{color:'#fbbf24'}}>⚡</span> ${user.balance.toFixed(2)}
            </div>
          </div>
        </div>
        <button className="logout-btn-small" onClick={onLogout}>⏻</button>
      </div>

      <h2 className="lobby-title">CHOOSE YOUR TABLE</h2>
      <p className="lobby-subtitle">{connectedUsers || 1} Players Online</p>

      {/* ROOM CARDS */}
      <div className="room-grid">
        
        {/* ROOM 1: LOW STAKES ($0.10) */}
        <div className="room-card novice" onClick={() => onJoin('low')}>
          <div className="card-badge">POPULAR</div>
          <div className="room-icon">🛡️</div>
          <h3>Novice Room</h3>
          <p className="room-desc">Perfect for beginners. Low risk, steady wins.</p>
          <div className="room-price">
            <span className="label">BID COST</span>
            <span className="value" style={{color:'#22c55e'}}>$0.10</span>
          </div>
          <button className="join-btn green">PLAY NOW</button>
        </div>

        {/* ROOM 2: HIGH STAKES ($1.00) */}
        <div className="room-card pro" onClick={() => onJoin('high')}>
          <div className="card-badge gold">BIG JACKPOTS</div>
          <div className="room-icon">👑</div>
          <h3>High Roller</h3>
          <p className="room-desc">High risk, massive rewards. Winner takes all.</p>
          <div className="room-price">
            <span className="label">BID COST</span>
            <span className="value" style={{color:'#fbbf24'}}>$1.00</span>
          </div>
          <button className="join-btn gold">ENTER ARENA</button>
        </div>

      </div>

      {/* FOOTER INFO */}
      <div className="lobby-footer">
        <p>Provably Fair • Instant Payouts • Secure</p>
      </div>

      {/* STYLES FOR THIS COMPONENT */}
      <style>{`
        .lobby-container {
          width: 100%;
          max-width: 800px;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 20px;
          color: white;
        }
        .lobby-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255,255,255,0.05);
          padding: 15px;
          border-radius: 16px;
          border: 1px solid rgba(255,255,255,0.1);
          margin-bottom: 30px;
        }
        .user-badge { display: flex; gap: 12px; align-items: center; }
        .avatar { width: 40px; height: 40px; background: #334155; border-radius: 50%; display: flex; alignItems: center; justifyContent: center; font-size: 20px; }
        .username { font-weight: bold; font-size: 14px; }
        .balance { font-family: 'JetBrains Mono', monospace; font-size: 16px; font-weight: 900; color: #fbbf24; }
        .logout-btn-small { background: rgba(239, 68, 68, 0.2); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); width: 35px; height: 35px; border-radius: 8px; cursor: pointer; font-size: 18px; }

        .lobby-title { font-size: 24px; font-weight: 900; margin: 0; letter-spacing: 1px; }
        .lobby-subtitle { color: #94a3b8; font-size: 12px; margin-top: 5px; margin-bottom: 30px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; }

        .room-grid {
          display: flex;
          gap: 20px;
          width: 100%;
          justify-content: center;
          flex-wrap: wrap;
        }

        .room-card {
          flex: 1;
          min-width: 280px;
          max-width: 350px;
          background: linear-gradient(145deg, #1e293b, #0f172a);
          border: 1px solid #334155;
          border-radius: 24px;
          padding: 30px;
          position: relative;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .room-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }
        .room-card.novice:hover { border-color: #22c55e; box-shadow: 0 0 20px rgba(34, 197, 94, 0.2); }
        .room-card.pro:hover { border-color: #fbbf24; box-shadow: 0 0 20px rgba(251, 191, 36, 0.2); }

        .card-badge {
          position: absolute; top: 15px; right: 15px;
          background: #334155; color: #94a3b8;
          font-size: 10px; font-weight: bold; padding: 4px 8px; border-radius: 10px;
        }
        .card-badge.gold { background: rgba(251, 191, 36, 0.2); color: #fbbf24; }

        .room-icon { font-size: 40px; margin-bottom: 15px; }
        .room-card h3 { margin: 0; font-size: 20px; font-weight: bold; }
        .room-desc { color: #94a3b8; font-size: 12px; line-height: 1.5; margin-bottom: 20px; height: 36px; }

        .room-price {
          background: rgba(0,0,0,0.3);
          width: 100%;
          padding: 10px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }
        .room-price .label { font-size: 10px; color: #64748b; font-weight: bold; }
        .room-price .value { font-size: 16px; font-weight: 900; }

        .join-btn {
          width: 100%; padding: 12px; border: none; border-radius: 12px;
          font-weight: 900; cursor: pointer; color: #0f172a;
        }
        .join-btn.green { background: #22c55e; color: white; }
        .join-btn.gold { background: #fbbf24; color: black; }

        .lobby-footer { margin-top: 40px; font-size: 10px; color: #475569; letter-spacing: 1px; }

        @keyframes popIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        .fade-in { animation: popIn 0.3s ease-out; }
      `}</style>
    </div>
  );
};

export default Lobby;
