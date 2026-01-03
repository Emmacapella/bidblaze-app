const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');
const { Server } = require('socket.io');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');
const axios = require('axios');
const bcrypt = require('bcryptjs'); // REQUIRED: npm install bcryptjs

const app = express();
app.use(cors());

// CONFIG
const SUPABASE_URL = 'https://zshodgjnjqirmcqbzujm.supabase.co';
const SUPABASE_KEY = "sb_secret_dxJx8Bv-KWIgeVvjJvxZEA_Fzxhsjjz";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const PING_URL = "https://bidblaze-server.onrender.com";
const ADMIN_WALLET = "0x6edadf13a704cd2518cd2ca9afb5ad9dee3ce34c";

const API_KEYS = {
    BSC: "YQYHD2PR83K37I6D8Y87YU7QK9RVRJDUJV",
    ETH: "YQYHD2PR83K37I6D8Y87YU7QK9RVRJDUJV",
    BASE: "YQYHD2PR83K37I6D8Y87YU7QK9RVRJDUJV"
};

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

let gameState = { status: 'ACTIVE', endTime: Date.now() + 300000, jackpot: 100.00, bidCost: 1.00, lastBidder: null, history: [], recentWinners: [], connectedUsers: 0, restartTimer: null, bidders: [], userInvestments: {} };

// Keep-Alive Mechanism
setInterval(() => { https.get(PING_URL).on('error', () => {}); }, 300000);

// GAME LOOP
setInterval(async () => {
  const now = Date.now();
  if (gameState.status === 'ACTIVE') {
    if (now >= gameState.endTime) {
      gameState.status = 'ENDED'; gameState.restartTimer = now + 15000;
      if (gameState.bidders.length === 1) {
          const lone = gameState.bidders[0];
          const ref = gameState.userInvestments[lone] || 0;
          const { data: u } = await supabase.from('users').select('balance').eq('email', lone).single();
          if (u) await supabase.from('users').update({ balance: u.balance + ref }).eq('email', lone);
      } else if (gameState.bidders.length > 1 && gameState.lastBidder) {
          const win = gameState.lastBidder;
          const amt = gameState.jackpot;
          const { data: u } = await supabase.from('users').select('balance').eq('email', win).single();
          if (u) await supabase.from('users').update({ balance: u.balance + amt }).eq('email', win);
          gameState.recentWinners.unshift({ user: win, amount: amt, time: Date.now() });
          if (gameState.recentWinners.length > 5) gameState.recentWinners.pop();
      }
    }
  } else if (gameState.status === 'ENDED') {
    if (now >= gameState.restartTimer) {
      gameState.status = 'ACTIVE'; gameState.endTime = now + 300000; gameState.jackpot = 50.00; gameState.lastBidder = null; gameState.history = []; gameState.bidders = []; gameState.userInvestments = {};
    }
  }
  io.emit('gameState', gameState);
}, 100);

// HELPER: RETRY LOGIC
async function checkTxWithRetry(url, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url);
            if (response.data && response.data.result) return response.data.result;
        } catch (e) { console.log(`Retry ${i+1} failed`); }
        await new Promise(r => setTimeout(r, 3000)); // Wait 3s
    }
    return null;
}

io.on('connection', (socket) => {
  gameState.connectedUsers++;

  // --- 1. NEW: Secure Admin Wallet Fetch ---
  socket.on('getGameConfig', () => {
      socket.emit('gameConfig', { adminWallet: ADMIN_WALLET });
  });

  // --- 2. NEW: Registration (Sign Up) ---
  socket.on('register', async ({ username, email, password }) => {
      if (!username || !email || !password) {
          socket.emit('authError', 'All fields are required.');
          return;
      }
      
      try {
          // Check if email already exists
          const { data: existingUser } = await supabase.from('users').select('email').eq('email', email).single();
          if (existingUser) {
              socket.emit('authError', 'Email already registered.');
              return;
          }

          // Hash the password
          const hashedPassword = await bcrypt.hash(password, 10);

          // Insert into Supabase
          const { data, error } = await supabase.from('users').insert([
              { 
                  username, 
                  email: email.toLowerCase().trim(), 
                  password_hash: hashedPassword, 
                  balance: 0.00 
              }
          ]).select().single();

          if (error) throw error;

          // Success
          socket.emit('authSuccess', { username: data.username, email: data.email, balance: data.balance });

      } catch (err) {
          console.error("Registration Error:", err);
          socket.emit('authError', 'Registration failed. Please try again.');
      }
  });

  // --- 3. NEW: Login ---
  socket.on('login', async ({ email, password }) => {
      if (!email || !password) {
          socket.emit('authError', 'Email and password required.');
          return;
      }

      try {
          // Fetch user
          const { data: user, error } = await supabase.from('users').select('*').eq('email', email.toLowerCase().trim()).single();
          
          if (error || !user) {
              socket.emit('authError', 'User not found.');
              return;
          }

          // Verify Password
          if (!user.password_hash) {
              socket.emit('authError', 'This account uses wallet login. Please use a wallet.');
              return;
          }

          const match = await bcrypt.compare(password, user.password_hash);
          if (!match) {
              socket.emit('authError', 'Incorrect password.');
              return;
          }

          // Success
          socket.emit('authSuccess', { username: user.username, email: user.email, balance: user.balance });

      } catch (err) {
          console.error("Login Error:", err);
          socket.emit('authError', 'Login failed. Try again.');
      }
  });

  // --- 4. EXISTING LOGIC (Updated to fetch Username too) ---
  socket.on('getUserBalance', async (email) => {
    if (!email) return;
    const cleanEmail = email.toLowerCase().trim();
    socket.join(cleanEmail);
    
    let { data: u } = await supabase.from('users').select('balance, username').eq('email', cleanEmail).single();
    
    // Auto-create for wallet users if they don't exist (Legacy support)
    if (!u) { 
        await supabase.from('users').insert([{ email: cleanEmail, balance: 0.00, username: 'Player' }]); 
        u = { balance: 0.00, username: 'Player' }; 
    }
    
    socket.emit('balanceUpdate', u.balance);
    const { data: w } = await supabase.from('withdrawals').select('*').eq('user_email', cleanEmail).order('created_at', { ascending: false });
    socket.emit('withdrawalHistory', w || []);
  });

  socket.on('placeBid', async (email) => {
    if (gameState.status !== 'ACTIVE') return;
    const cleanEmail = email.toLowerCase().trim();
    
    const { data: u } = await supabase.from('users').select('balance').eq('email', cleanEmail).single();
    if (!u || u.balance < gameState.bidCost) { socket.emit('bidError', 'Insufficient Funds'); return; }
    
    await supabase.from('users').update({ balance: u.balance - gameState.bidCost }).eq('email', cleanEmail);
    socket.emit('balanceUpdate', u.balance - gameState.bidCost);
    
    gameState.jackpot += (gameState.bidCost * 0.95); 
    gameState.lastBidder = cleanEmail;
    
    if (!gameState.bidders.includes(cleanEmail)) gameState.bidders.push(cleanEmail);
    gameState.userInvestments[cleanEmail] = (gameState.userInvestments[cleanEmail] || 0) + gameState.bidCost;
    if (gameState.endTime - Date.now() < 10000) gameState.endTime = Date.now() + 10000;
    
    gameState.history.unshift({ id: Date.now(), user: cleanEmail, amount: gameState.bidCost });
    if (gameState.history.length > 50) gameState.history.pop();
    io.emit('gameState', gameState);
  });

  socket.on('verifyDeposit', async ({ email, txHash, network }) => {
      const cleanEmail = email.toLowerCase().trim();
      const { data: u } = await supabase.from('users').select('balance').eq('email', cleanEmail).single();
      if (!u) { socket.emit('depositError', 'User not found'); return; }

      let url = "";
      if (network === 'BSC') url = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${API_KEYS.BSC}`;
      else if (network === 'ETH') url = `https://api.etherscan.io/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${API_KEYS.ETH}`;
      else if (network === 'BASE') url = `https://api.basescan.org/api?module=proxy&action=eth_getTransactionByHash&txhash=${txHash}&apikey=${API_KEYS.BASE}`;

      const tx = await checkTxWithRetry(url); // USE RETRY LOGIC

      if (!tx) { socket.emit('depositError', 'Transaction not found on chain. Please wait a moment and try again.'); return; }
      if (tx.to.toLowerCase() !== ADMIN_WALLET.toLowerCase()) { socket.emit('depositError', 'Incorrect Receiver Address'); return; }

      const { data: used } = await supabase.from('deposits').select('id').eq('tx_hash', txHash).single();
      if (used) { socket.emit('depositError', 'Transaction already used'); return; }

      let rate = network === 'BSC' ? 600 : 3000;
      const amt = parseInt(tx.value, 16) / 1e18;
      const newBal = u.balance + (amt * rate);

      await supabase.from('users').update({ balance: newBal }).eq('email', cleanEmail);
      await supabase.from('deposits').insert([{ user_email: cleanEmail, amount: amt, tx_hash: txHash, status: 'COMPLETED', network }]);

      socket.emit('depositSuccess', newBal);
      socket.emit('balanceUpdate', newBal);
  });

  socket.on('requestWithdrawal', async ({ email, amount, address, network }) => {
      const cleanEmail = email.toLowerCase().trim();
      const { data: u } = await supabase.from('users').select('balance').eq('email', cleanEmail).single();
      if (!u || u.balance < amount) { socket.emit('withdrawalError', 'Insufficient Balance'); return; }
      await supabase.from('users').update({ balance: u.balance - amount }).eq('email', cleanEmail);
      await supabase.from('withdrawals').insert([{ user_email: cleanEmail, amount, wallet_address: address, network, status: 'PENDING' }]);
      socket.emit('withdrawalSuccess', u.balance - amount);
      socket.emit('balanceUpdate', u.balance - amount);
      const { data: w } = await supabase.from('withdrawals').select('*').eq('user_email', cleanEmail).order('created_at', { ascending: false });
      socket.emit('withdrawalHistory', w || []);
  });

  socket.on('adminAction', ({ password, action, value }) => {
     if (action === 'RESET') { gameState = { ...gameState, status: 'ACTIVE', endTime: Date.now() + 300000, jackpot: 50.00, history: [], bidders: [], userInvestments: {} }; }
     else if (action === 'SET_JACKPOT') gameState.jackpot = parseFloat(value);
     else if (action === 'ADD_TIME') gameState.endTime = Date.now() + (parseInt(value)*1000);
  });
  socket.on('disconnect', () => { gameState.connectedUsers--; });
});

app.use(express.static(path.join(__dirname, 'dist')));
app.get(/.*/, (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
