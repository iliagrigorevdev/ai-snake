
var model;
var boardSize;
var game;

var textElement = document.createElement("DIV");
textElement.style = "position: fixed; left: 0; top: 0; margin: 50px;"
    + " white-space: pre; font-family: monospace; font-size: 20px;";
document.body.appendChild(textElement);

function resetGame() {
  game = new Game(boardSize);
}

function displayBoard() {
  var lines = game.getDisplayTextLines();
  textElement.innerHTML = lines.join("<br>");
}

function getObservation() {
  var board = game.getBoard();
  var boardSize = game.getBoardSize();
  var observation = new Array(boardSize);
  for (var y = 0; y < boardSize; y++) {
    observation[y] = new Array(boardSize);
    for (var x = 0; x < boardSize; x++) {
      observation[y][x] = [board[GOAL_PLANE][y][x], board[HEAD_PLANE][y][x], board[BODY_PLANE][y][x]];
    }
  }
  return observation;
}

function nextMove() {
  var observation = getObservation();
  var observationTensor = tf.tensor([observation]);
  var action = model.predict(observationTensor).dataSync()[0];
  observationTensor.dispose();

  var valids = game.getValidMoves();
  var done;
  if (valids[action]) {
    game.executeAction(action);
    done = (game.isGameOver() || (!game.isGoalConsumed() && game.isLooped()));
  } else {
    done = true;
  }

  if (done) {
    resetGame();
  }
  displayBoard();
}

tf.enableProdMode();
tf.loadGraphModel("ai/model.json").then(result => {
  model = result;
  boardSize = 6;

  resetGame();
  displayBoard();

  setInterval(function() {
    if (!document.webkitHidden) {
      requestAnimationFrame(animate);
    }
  }, 100);
});

var animate = function() {
  nextMove();
};
