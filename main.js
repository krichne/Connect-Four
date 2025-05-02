const { createApp } = Vue;

createApp({
  data() {
    return {
      ws: null,
      stage: 'nick',
      nickname: '',
      nickError: '',
      users: [],
      incoming: null,
      symbol: null,
      cols: 7,
      rows: 6,
      board: Array(7 * 6).fill(null),
      turn: null,
      finished: false,
      winner: null,
      lastMove: null,
      opponentName: ''
    };
  },
  mounted() {
    console.log('Vue mounted, stage =', this.stage);
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.ws = new WebSocket(`${protocol}//${location.host}`);
    
    this.ws.onmessage = ({ data }) => {
      const msg = JSON.parse(data);
      console.log('Received message:', msg);
      
      switch (msg.type) {
        case 'nick_ok':
          this.stage = 'lobby';
          break;
        case 'nick_error':
          this.nickError = msg.error;
          break;
        case 'user_list':
          this.users = msg.users.filter(n => n !== this.nickname);
          break;
        case 'challenge_request':
          this.incoming = msg;
          this.stage = 'challenge';
          break;
        case 'init':
          this.symbol = msg.symbol;
          this.opponentName = msg.opponent || 'Opponent';
          this.stage = 'game';
          this.resetBoard();
          break;
        case 'challenge_declined':
          alert(`${msg.from} declined.`);
          this.stage = 'lobby';
          break;
        case 'opponent_left':
          alert('Opponent disconnected.');
          this.stage = 'lobby';
          break;
        case 'state':
          this.board = msg.board;
          this.turn = msg.turn;
          this.finished = msg.finished;
          this.winner = msg.winner;
          this.lastMove = msg.lastMove;
          break;
      }
    };
    
    this.ws.onclose = () => {
      alert('Connection closed. Reloading page...');
      setTimeout(() => window.location.reload(), 1000);
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      alert('Connection error. Please try again later.');
    };
  },
  computed: {
    isMyTurn() {
      return this.turn === this.symbol && !this.finished;
    },
    statusMessage() {
      if (this.finished) {
        if (this.winner === 'draw') return "It's a draw!";
        return this.winner === this.symbol ? "You won!" : "You lost...";
      }
      return this.isMyTurn ? "Your turn" : "Opponent's turn";
    }
  },
  methods: {
    setNick() {
      if (!this.nickname.trim()) {
        this.nickError = 'Enter a nickname';
        return;
      }
      this.ws.send(JSON.stringify({
        type: 'set_nick',
        nickname: this.nickname
      }));
    },
    sendChallenge(to) {
      this.ws.send(JSON.stringify({ type: 'challenge', to }));
      alert(`Challenge sent to ${to}`);
    },
    respondChallenge(accept) {
      this.ws.send(JSON.stringify({
        type: 'challenge_response',
        from: this.incoming.from,
        accept
      }));
      
      if (accept) {
        this.opponentName = this.incoming.from;
      } else {
        this.stage = 'lobby';
      }
    },
    resetBoard() {
      this.board = Array(this.cols * this.rows).fill(null);
      this.finished = false;
      this.winner = null;
      this.lastMove = null;
    },
    playInColumn(col) {
      if (!this.isMyTurn || this.finished) return;
      if (col < 0 || col >= this.cols) return;
      
      if (this.board[col] !== null) return;
      
      this.ws.send(JSON.stringify({ type: 'move', col }));
    },
    reset() {
      this.ws.send(JSON.stringify({ type: 'reset_game' }));
    },
    getCellClass(index) {
      const classes = [];
      if (index === this.lastMove) {
        classes.push('last-move');
      }
      return classes.join(' ');
    },
    getToken(cell) {
      if (!cell) return '';
      return cell === 'X' ? '🔴' : '🔵';
    },
    getColumn(index) {
      return index % this.cols;
    },
    handleCellClick(index) {
      if (!this.isMyTurn || this.finished) return;
      const col = this.getColumn(index);
      this.playInColumn(col);
    },
    returnToLobby() {
      window.location.reload();
    }
  }
}).mount('#app');