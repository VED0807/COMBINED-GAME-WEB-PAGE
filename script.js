const cells = [...document.querySelectorAll(".cell")];
const board = document.querySelector("#board");
const turnBanner = document.querySelector("#turn-banner");
const message = document.querySelector("#game-message");
const winningLine = document.querySelector("#winning-line");
const difficulty = document.querySelector("#difficulty");
const starter = document.querySelector("#starter");
const toast = document.querySelector("#toast");

const winningCombos = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

let game = {
  board: Array(9).fill(""),
  current: "X",
  active: true,
  mode: "friend",
  scores: { X: 0, O: 0 },
  streak: 0,
  bestStreak: 0,
  round: 0,
  starterPreference: "alternate",
  humanSymbol: "X",
  computerSymbol: "O",
  winningCombo: [],
};
let computerTimer;

function getResult(state) {
  for (const combo of winningCombos) {
    const [a, b, c] = combo;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) {
      return { winner: state[a], combo };
    }
  }
  return state.every(Boolean) ? { winner: "draw", combo: [] } : null;
}

function render() {
  const currentTurnSymbol = document.querySelector("#turn-symbol");
  const currentTurnName = document.querySelector("#turn-name");
  cells.forEach((cell, index) => {
    const value = game.board[index];
    cell.textContent = value;
    const isWinningCell = game.winningCombo.includes(index);
    cell.className = `cell${value ? ` ${value.toLowerCase()}` : ""}${isWinningCell ? " win" : ""}`;
    cell.disabled = Boolean(value) || !game.active || (game.mode === "cpu" && game.current === game.computerSymbol);
    cell.setAttribute("aria-label", `${["Top left", "Top center", "Top right", "Middle left", "Center", "Middle right", "Bottom left", "Bottom center", "Bottom right"][index]}, ${value || "empty"}`);
  });
  document.querySelector("#score-x").textContent = game.scores.X;
  document.querySelector("#score-o").textContent = game.scores.O;
  document.querySelector("#best-streak").textContent = `${game.bestStreak} WIN${game.bestStreak === 1 ? "" : "S"}`;
  if (currentTurnSymbol && currentTurnName) {
    currentTurnSymbol.textContent = game.current;
    currentTurnSymbol.className = `turn-symbol ${game.current === "X" ? "x-text" : "o-text"}`;
    currentTurnName.textContent = game.mode === "cpu" && game.current === game.computerSymbol
      ? "COMPUTER"
      : game.mode === "cpu" ? "YOU" : `PLAYER ${game.current}`;
  }
}

function play(index, isComputerMove = false) {
  if (!game.active || game.board[index] || (game.mode === "cpu" && game.current === game.computerSymbol && !isComputerMove)) return;
  game.board[index] = game.current;
  const result = getResult(game.board);
  if (result) finish(result);
  else {
    game.current = game.current === "X" ? "O" : "X";
    render();

    if (game.mode === "cpu" && game.current === game.computerSymbol) {
      computerTimer = window.setTimeout(computerMove, 400);
    }
  }
}

function finish(result) {
  game.active = false;
  if (result.winner === "draw") {
    message.textContent = "GRID LOCKED — THAT'S A DRAW";
    turnBanner.innerHTML = "<span>✦</span><span>NO WINNER THIS ROUND</span>";
    showToast("A perfectly balanced battle.");
  } else {
    game.scores[result.winner] += 1;
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    game.winningCombo = result.combo;
    const winnerName = game.mode === "cpu"
      ? result.winner === game.computerSymbol ? "COMPUTER" : "YOU"
      : `PLAYER ${result.winner}`;
    message.textContent = `${winnerName} TAKES THE ROUND`;
    turnBanner.innerHTML = `<span class="turn-symbol ${result.winner === "X" ? "x-text" : "o-text"}">${result.winner}</span><span>VICTORY IS YOURS</span>`;
    showToast(`${winnerName === "COMPUTER" ? "The computer" : winnerName === "YOU" ? "You" : `Player ${result.winner}`} wins!`);
  }
  render();
  if (result.winner !== "draw") showWinningLine(result.combo);
}

function showWinningLine(combo) {
  const [a, b, c] = combo;
  winningLine.className = "winning-line";
  if (a === 0 && b === 1 && c === 2) winningLine.classList.add("row-top");
  else if (a === 3 && b === 4 && c === 5) winningLine.classList.add("row-middle");
  else if (a === 6 && b === 7 && c === 8) winningLine.classList.add("row-bottom");
  else if (a === 0 && b === 3 && c === 6) winningLine.classList.add("column-left");
  else if (a === 1 && b === 4 && c === 7) winningLine.classList.add("column-middle");
  else if (a === 2 && b === 5 && c === 8) winningLine.classList.add("column-right");
  else if (a === 0 && b === 4 && c === 8) winningLine.classList.add("diagonal-down");
  else if (a === 2 && b === 4 && c === 6) winningLine.classList.add("diagonal-up");
}

function computerMove() {
  if (!game.active || game.mode !== "cpu" || game.current !== game.computerSymbol) return;
  const empty = game.board.map((value, index) => value ? null : index).filter((index) => index !== null);
  let move;
  if (difficulty.value === "smart") {
    move = findBestMove();
  } else {
    move = empty[Math.floor(Math.random() * empty.length)];
  }
  play(move, true);
}

function findBestMove() {
  let bestScore = -Infinity;
  let move = 0;
  game.board.forEach((value, index) => {
    if (value) return;
    game.board[index] = game.computerSymbol;
    const score = minimax(game.board, false);
    game.board[index] = "";
    if (score > bestScore) { bestScore = score; move = index; }
  });
  return move;
}

function minimax(state, maximizing) {
  const result = getResult(state);
  if (result?.winner === game.computerSymbol) return 10;
  if (result?.winner === game.humanSymbol) return -10;
  if (result?.winner === "draw") return 0;
  const scores = [];
  state.forEach((value, index) => {
    if (value) return;
    state[index] = maximizing ? game.computerSymbol : game.humanSymbol;
    scores.push(minimax(state, !maximizing));
    state[index] = "";
  });
  return maximizing ? Math.max(...scores) : Math.min(...scores);
}

function newRound() {
  window.clearTimeout(computerTimer);
  game.round += 1;
  game.board = Array(9).fill("");
  game.winningCombo = [];
  winningLine.className = "winning-line";
  const computerStarts = game.mode === "cpu" && (
    game.starterPreference === "computer" ||
    (game.starterPreference === "alternate" && game.round % 2 === 0)
  );
  game.computerSymbol = computerStarts ? "X" : "O";
  game.humanSymbol = computerStarts ? "O" : "X";
  game.current = computerStarts ? game.computerSymbol : game.humanSymbol;
  game.active = true;
  game.streak = 0;
  message.textContent = "";
  turnBanner.innerHTML = `<span class="turn-symbol ${game.current === "X" ? "x-text" : "o-text"}" id="turn-symbol">${game.current}</span><span><b id="turn-name"></b>'S TURN</span>`;
  render();
  if (game.mode === "cpu" && game.current === game.computerSymbol) {
    computerTimer = window.setTimeout(computerMove, 400);
  }
}

function showToast(text) {
  toast.textContent = text;
  toast.classList.add("visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("visible"), 2200);
}

const hubScreen = document.querySelector("#hub-screen");
const tttScreen = document.querySelector("#ttt-screen");
const rpsScreen = document.querySelector("#rps-screen");
const roomNumber = document.querySelector("#room-number");
const rpsDifficulty = document.querySelector("#rps-difficulty");
const rpsResult = document.querySelector("#rps-result");
const rpsMessage = document.querySelector("#rps-message");
const playerHand = document.querySelector("#player-hand");
const computerHand = document.querySelector("#computer-hand");
const rpsChoices = [...document.querySelectorAll(".choice-button")];
const rpsIcons = { rock: "✊", paper: "✋", scissors: "✌" };
const counters = { rock: "paper", paper: "scissors", scissors: "rock" };
let rpsGame = {
  scores: { player: 0, computer: 0, draws: 0 },
  streak: 0,
  bestStreak: 0,
  history: [],
};

function showScreen(screen) {
  hubScreen.hidden = screen !== "hub";
  tttScreen.hidden = screen !== "ttt";
  rpsScreen.hidden = screen !== "rps";
  roomNumber.textContent = screen === "rps" ? "02" : screen === "ttt" ? "01" : "00";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function chooseComputerMove(playerChoice) {
  const moves = Object.keys(rpsIcons);
  if (rpsDifficulty.value === "easy") return moves[Math.floor(Math.random() * moves.length)];
  if (rpsDifficulty.value === "hard") return counters[playerChoice];
  const lastChoice = rpsGame.history.at(-1);
  if (lastChoice && Math.random() < 0.65) return counters[lastChoice];
  return moves[Math.floor(Math.random() * moves.length)];
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderRpsScore() {
  document.querySelector("#rps-player-score").textContent = rpsGame.scores.player;
  document.querySelector("#rps-computer-score").textContent = rpsGame.scores.computer;
  document.querySelector("#rps-draw-score").textContent = rpsGame.scores.draws;
  document.querySelector("#rps-best-streak").textContent = `${rpsGame.bestStreak} WIN${rpsGame.bestStreak === 1 ? "" : "S"}`;
}

function playRps(playerChoice) {
  rpsChoices.forEach((button) => { button.disabled = true; });
  const computerChoice = chooseComputerMove(playerChoice);
  const result = playerChoice === computerChoice
    ? "draw"
    : counters[playerChoice] === computerChoice ? "computer" : "player";

  playerHand.textContent = rpsIcons[playerChoice];
  computerHand.textContent = rpsIcons[computerChoice];
  playerHand.className = `hand-display ${result === "player" ? "winner" : ""}`;
  computerHand.className = `hand-display ${result === "computer" ? "winner" : ""}`;
  rpsGame.history.push(playerChoice);

  if (result === "player") {
    rpsGame.scores.player += 1;
    rpsGame.streak += 1;
    rpsGame.bestStreak = Math.max(rpsGame.bestStreak, rpsGame.streak);
    rpsResult.innerHTML = "<span>YOU WIN THE ROUND</span>";
    rpsMessage.textContent = `${capitalize(playerChoice)} beats ${computerChoice}. Nice read.`;
    showToast("Clean win. Keep the streak alive.");
  } else if (result === "computer") {
    rpsGame.scores.computer += 1;
    rpsGame.streak = 0;
    rpsResult.innerHTML = "<span>COMPUTER TAKES IT</span>";
    rpsMessage.textContent = `${capitalize(computerChoice)} beats ${playerChoice}.`;
    showToast("The computer got your number.");
  } else {
    rpsGame.scores.draws += 1;
    rpsGame.streak = 0;
    rpsResult.innerHTML = "<span>IT'S A DRAW</span>";
    rpsMessage.textContent = `Both chose ${playerChoice}. Great minds think alike.`;
  }
  renderRpsScore();
  window.setTimeout(() => rpsChoices.forEach((button) => { button.disabled = false; }), 350);
}

function resetRps() {
  rpsGame = { scores: { player: 0, computer: 0, draws: 0 }, streak: 0, bestStreak: 0, history: [] };
  playerHand.textContent = "?";
  computerHand.textContent = "?";
  playerHand.className = "hand-display";
  computerHand.className = "hand-display";
  rpsResult.innerHTML = "<span>MAKE YOUR MOVE</span>";
  rpsMessage.textContent = "";
  rpsChoices.forEach((button) => { button.disabled = false; });
  renderRpsScore();
}

document.querySelectorAll("[data-game]").forEach((card) => {
  card.addEventListener("click", () => showScreen(card.dataset.game));
});
document.querySelectorAll("[data-back]").forEach((button) => {
  button.addEventListener("click", () => showScreen("hub"));
});
document.querySelector("#brand-home").addEventListener("click", (event) => {
  event.preventDefault();
  showScreen("hub");
});
rpsChoices.forEach((button) => {
  button.addEventListener("click", () => playRps(button.dataset.choice));
});
document.querySelector("#rps-reset").addEventListener("click", () => {
  resetRps();
  showToast("RPS match reset.");
});

cells.forEach((cell) => cell.addEventListener("click", () => play(Number(cell.dataset.index))));
document.querySelector("#new-round").addEventListener("click", newRound);
document.querySelector("#reset-game").addEventListener("click", () => {
  game.scores = { X: 0, O: 0 };
  game.bestStreak = 0;
  newRound();
  showToast("Scoreboard reset.");
});
document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".mode-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    game.mode = button.dataset.mode;
    difficulty.disabled = game.mode !== "cpu";
    starter.disabled = game.mode !== "cpu";
    newRound();
    showToast(game.mode === "cpu" ? "Computer mode engaged." : "Friend mode engaged.");
  });
});

starter.addEventListener("change", () => {
  game.starterPreference = starter.value;
  newRound();
});

render();
