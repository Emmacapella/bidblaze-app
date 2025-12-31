import React from 'react';

const WalletVault = ({ onClose, userAddress, userEmail, currentCredits }) => {
  return (
    <div className="modal-overlay">
      <div className="glass-card fade-in" style={{textAlign:'left'}}>
        <button className="close-btn" onClick={onClose}>✕</button>
        <h2 style={{color:'#3b82f6', marginTop:0, textAlign:'center'}}>WALLET VAULT</h2>

        <div style={{background:'rgba(255,255,255,0.05)', padding:'15px', borderRadius:'12px', marginBottom:'15px'}}>
           <p style={{fontSize:'12px', color:'#94a3b8', marginBottom:'5px'}}>LOGGED IN AS</p>
           <div style={{color:'white', fontWeight:'bold', fontSize:'14px'}}>{userEmail}</div>
           <div style={{fontSize:'10px', color:'#64748b', marginTop:'5px'}}>{userAddress}</div>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
           <span style={{color:'#94a3b8'}}>Game Balance:</span>
           <span style={{color:'#22c55e', fontSize:'24px', fontWeight:'bold'}}>${currentCredits.toFixed(2)}</span>
        </div>

        <p style={{fontSize:'11px', color:'#64748b', textAlign:'center'}}>
           Funds are secured on the blockchain.
        </p>
      </div>
    </div>
  );
};

export default WalletVault;

