const express = require('express');
const http    = require('http');
const { WebSocketServer } = require('ws');
const path    = require('path');

const COLS = 7;
const ROWS = 6;
const SIZE = COLS * ROWS;

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocketServer({ server });

app.use(express.static(__dirname));

const users  = new Map();
const rooms  = new Map();
const wsMeta = new Map();

wss.on('connection', ws => {
  console.log('New connection');
  
  ws.on('message', msg => {
    let data;
    try { 
      data = JSON.parse(msg);
      console.log('Received:', data);
    } catch (e) {
      console.error('Invalid JSON:', e);
      return;
    }

    switch (data.type) {
      case 'set_nick': {
        const nick = data.nickname.trim();
        if (!nick || users.has(nick)) {
          return ws.send(JSON.stringify({ 
            type: 'nick_error', 
            error: 'Nickname taken or invalid.' 
          }));
        }
        users.set(nick, ws);
        wsMeta.set(ws, { nickname: nick, roomId: null, symbol: null });
        ws.send(JSON.stringify({ type: 'nick_ok', nickname: nick }));
        broadcastUserList();
        break;
      }
      
      case 'challenge': {
        const target = users.get(data.to);
        if (!target) return;
        
        const challenger = wsMeta.get(ws);
        if (!challenger) return;
        
        target.send(JSON.stringify({ 
          type: 'challenge_request', 
          from: challenger.nickname 
        }));
        break;
      }
      
      case 'challenge_response': {
        const { from, accept } = data;
        const challenger = users.get(from);
        const responder = wsMeta.get(ws);
        if (!challenger || !responder) return;

        if (accept) {
          const roomId = `${from}#${responder.nickname}#${Date.now()}`;
          const board  = Array(SIZE).fill(null);
          
          const challengerMeta = wsMeta.get(challenger);
          challengerMeta.roomId = roomId;
          challengerMeta.symbol = 'X';
          
          responder.roomId = roomId;
          responder.symbol = 'O';
          
          rooms.set(roomId, { 
            players: [challenger, ws], 
            playerNames: [challengerMeta.nickname, responder.nickname],
            board, 
            turn: 'X',
            finished: false, 
            winner: null,
            lastMove: null
          });
          
          challenger.send(JSON.stringify({ 
            type: 'init', 
            symbol: 'X',
            opponent: responder.nickname
          }));
          
          ws.send(JSON.stringify({ 
            type: 'init', 
            symbol: 'O',
            opponent: challengerMeta.nickname
          }));
          
          broadcastState(roomId);
        } else {
          challenger.send(JSON.stringify({ 
            type: 'challenge_declined', 
            from: responder.nickname 
          }));
        }
        break;
      }
      
      case 'move': {
        const meta = wsMeta.get(ws);
        if (!meta?.roomId || !meta?.symbol) return;
        
        const room = rooms.get(meta.roomId);
        if (!room || room.finished || room.turn !== meta.symbol) return;

        const col = data.col;
        if (col < 0 || col >= COLS) return;

        let placed = -1;
        for (let r = ROWS - 1; r >= 0; r--) {
          const idx = r * COLS + col;
          if (room.board[idx] === null) {
            room.board[idx] = meta.symbol;
            placed = idx;
            break;
          }
        }
        if (placed < 0) return;
        
        room.lastMove = placed;

        room.turn = meta.symbol === 'X' ? 'O' : 'X';

        if (checkWin(room.board, meta.symbol)) {
          room.finished = true;
          room.winner = meta.symbol;
        } else if (room.board.every(c => c !== null)) {
          room.finished = true;
          room.winner = 'draw';
        }

        broadcastState(meta.roomId);
        break;
      }
      
      case 'reset_game': {
        const meta = wsMeta.get(ws);
        if (!meta?.roomId) return;
        
        const room = rooms.get(meta.roomId);
        if (!room) return;
        
        room.board    = Array(SIZE).fill(null);
        room.turn     = 'X';
        room.finished = false;
        room.winner   = null;
        room.lastMove = null;
        
        broadcastState(meta.roomId);
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log('Connection closed');
    const meta = wsMeta.get(ws);
    if (meta?.roomId) {
      const room = rooms.get(meta.roomId);
      if (room) {
        room.players.filter(p => p !== ws).forEach(p => {
          if (p.readyState === p.OPEN) {
            p.send(JSON.stringify({ type: 'opponent_left' }));
          }
        });
        rooms.delete(meta.roomId);
      }
    }
    
    if (meta?.nickname) {
      users.delete(meta.nickname);
    }
    wsMeta.delete(ws);
    
    broadcastUserList();
  });
});

function broadcastUserList() {
  const list = Array.from(users.keys());
  const payload = JSON.stringify({ type: 'user_list', users: list });
  
  users.forEach(ws => {
    if (ws.readyState === ws.OPEN) {
      ws.send(payload);
    }
  });
}

function broadcastState(roomId) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  const msg = JSON.stringify({
    type: 'state',
    board: room.board,
    turn: room.turn,
    finished: room.finished,
    winner: room.winner,
    lastMove: room.lastMove
  });
  
  room.players.forEach(p => {
    if (p.readyState === p.OPEN) {
      p.send(msg);
    }
  });
}

function checkWin(b, s) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if ([0,1,2,3].every(k => b[r*COLS + c+k] === s)) return true;
    }
  }
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r <= ROWS - 4; r++) {
      if ([0,1,2,3].every(k => b[(r+k)*COLS + c] === s)) return true;
    }
  }
  for (let r = 0; r <= ROWS - 4; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if ([0,1,2,3].every(k => b[(r+k)*COLS + c+k] === s)) return true;
    }
  }
  for (let r = 3; r < ROWS; r++) {
    for (let c = 0; c <= COLS - 4; c++) {
      if ([0,1,2,3].every(k => b[(r-k)*COLS + c+k] === s)) return true;
    }
  }
  return false;
}

process.on('SIGINT', () => {
  console.log('Server shutting down...');
  wss.clients.forEach(client => {
    client.send(JSON.stringify({ type: 'server_shutdown' }));
    client.terminate();
  });
  process.exit(0);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Connect Four server listening on http://localhost:${PORT}`));