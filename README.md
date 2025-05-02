# Connect Four Multiplayer

A real-time multiplayer Connect Four game built with Node.js, Express, WebSockets, and Vue.js.

https://jwk-connect4-3410dc68574f.herokuapp.com/

## Features

- Real-time multiplayer gameplay
- User-friendly interface with animated tokens
- Lobby system with online player list
- Challenge and response mechanism
- Responsive design that works on desktop and mobile
- Visual indication of the last move
- Game state synchronization

## Tech Stack

- **Frontend**: Vue.js 3, CSS3 with animations
- **Backend**: Node.js, Express
- **Real-time Communication**: WebSockets (ws library)
- **User Interface**: Custom CSS with responsive design

## Installation

### Prerequisites

- Node.js (v14.x or later)
- npm (v6.x or later)

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/username/connect-four-multiplayer.git
   cd connect-four-multiplayer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node server.js
   ```

4. Open your browser and navigate to:
   ```
   http://localhost:3000
   ```

## How to Play

1. **Enter a Nickname**: Start by entering a unique nickname to join the game lobby.

2. **Challenge a Player**: In the lobby, you'll see a list of online players. Click the "Challenge" button next to a player's name to invite them to a game.

3. **Accept/Decline Challenges**: If someone challenges you, you'll receive a notification with options to accept or decline the challenge.

4. **Game Rules**: 
   - Players take turns dropping colored tokens into a 7x6 grid.
   - Red tokens (🔴) go first, followed by blue tokens (🔵).
   - The first player to connect four of their tokens in a row (horizontally, vertically, or diagonally) wins.
   - If the grid fills up without anyone connecting four tokens, the game ends in a draw.

5. **Making Moves**: Click on any column to drop your token. The token will fall to the lowest available position in that column.

6. **End of Game**: After a game ends, you can choose to play again with the same opponent or return to the lobby.

## Project Structure

- `index.html` - Main HTML file for the game interface
- `style.css` - CSS styles for the game
- `main.js` - Vue.js frontend application code
- `server.js` - Node.js backend server with WebSocket implementation
