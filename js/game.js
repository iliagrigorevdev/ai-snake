
const GOAL_PLANE = 0; // goal position
const CONSUME_PLANE = 1; // goal consumed
const HEAD_PLANE = 2; // head position
const TAIL_PLANE = 3; // tail position
const BODY_PLANE = 4; // body positions
const DIRECTION_PLANE0 = 5; // bit 0 of 4 body directions
const DIRECTION_PLANE1 = 6; // bit 1 of 4 body directions

class Game {

  constructor(boardSize, startLength = 3) {
    if ((boardSize < 2) || (startLength < 2) || (startLength > boardSize)) {
      throw new Error("Invalid parameters");
    }
    this.boardSize = boardSize;
    this.startLength = startLength;
    this.planeCount = 7;
    this.actionSize = 4; // directions: 0 - x++, 1 - y++, 2 - x--, 3 - y--
    this.board = null;
  }

  reset(x0, y0, direction0) {
    if ((direction0 < 0) || (direction0 >= 4)) {
      throw new Error("Invalid direction");
    }
    this.board = this.createBoard();
    this.board[TAIL_PLANE][y0][x0] = 1; // tail
    var bodyMovement = this.getBodyMovement(direction0)
    for (var i = 0; i < this.startLength; i++) {
      var x = x0 + i * bodyMovement.dx;
      var y = y0 + i * bodyMovement.dy;
      if ((x < 0) || (x >= this.boardSize) || (y < 0) || (y >= this.boardSize)) {
        throw new Error("Invalid position");
      }
      this.board[BODY_PLANE][y][x] = 1; // body
      this.setBodyDirection(x, y, direction0);
      if (i == this.startLength - 1) {
        this.board[HEAD_PLANE][y][x] = 1; // head
      }
    }
    var goalPosition = this.getRandomFreePosition();
    this.board[GOAL_PLANE][goalPosition.y][goalPosition.x] = 1; // goal
  }

  createBoard() {
    var board = new Array(this.planeCount);
    for (var p = 0; p < this.planeCount; p++) {
      board[p] = new Array(this.boardSize);
      for (var y = 0; y < this.boardSize; y++) {
        board[p][y] = new Array(this.boardSize);
        for (var x = 0; x < this.boardSize; x++) {
          board[p][y][x] = 0;
        }
      }
    }
    return board;
  }

  setBodyDirection(x, y, direction) {
    // 0 - x++, 1 - y++, 2 - x--, 3 - y--
    if ((direction < 0) || (direction > 3)) {
      throw new Error("Invalid direction");
    }
    this.board[DIRECTION_PLANE0][y][x] = (direction & 1);
    this.board[DIRECTION_PLANE1][y][x] = (direction & 2);
  }

  getBodyDirection(x, y) {
    var bit0 = this.board[DIRECTION_PLANE0][y][x];
    var bit1 = this.board[DIRECTION_PLANE1][y][x];
    return bit1 | bit0;
  }

  getBodyMovement(direction) {
    if (direction == 0) {
      return { dx: 1, dy: 0 }; // x++
    } else if (direction == 1) {
      return { dx: 0, dy: 1 }; // y++
    } else if (direction == 2) {
      return { dx: -1, dy: 0 }; // x--
    } else {
      return { dx: 0, dy: -1 }; // y--
    }
  }

  executeAction(action) {
    if ((action < 0) || (action >= this.actionSize)) {
      throw new Error("Invalid action");
    }
    var headPosition = this.getHeadPosition();
    var headDirection = this.getBodyDirection(headPosition.x, headPosition.y);
    var nextHeadDirection = action;
    var headMovement = this.getBodyMovement(nextHeadDirection);
    var nextHeadX = headPosition.x + headMovement.dx;
    var nextHeadY = headPosition.y + headMovement.dy;

    this.board[HEAD_PLANE][headPosition.y][headPosition.x] = 0; // clear old head position
    this.board[HEAD_PLANE][nextHeadY][nextHeadX] = 1; // set new head position
    this.board[BODY_PLANE][nextHeadY][nextHeadX] = 1; // set new head-body position
    this.setBodyDirection(nextHeadX, nextHeadY, nextHeadDirection); // set new head direction

    // Iterate from head to tail
    var nextX = nextHeadX;
    var nextY = nextHeadY;
    var x = headPosition.x;
    var y = headPosition.y;
    var nextDirection = nextHeadDirection;
    var direction = headDirection;
    var goalConsumed = (this.board[CONSUME_PLANE][headPosition.y][headPosition.x] != 0);
    var bodyPositions = [];
    var bodyMovements = [];
    while (true) {
      bodyPositions.push({ x: x, y: y });
      if (goalConsumed && ((x != headPosition.x) || (y != headPosition.y))) {
        bodyMovements.push({ dx: 0, dy: 0 });
      } else {
        var nextBodyMovement = this.getBodyMovement(nextDirection);
        bodyMovements.push(nextBodyMovement);
        if (goalConsumed) {
          bodyPositions.push({ x: x, y: y });
          bodyMovements.push({ dx: 0, dy: 0 });
        }
      }

      if (this.board[TAIL_PLANE][y][x] != 0) { // tail reached
        if (goalConsumed) {
          // Do not move tail if goal consumed (grow snake)
          this.board[CONSUME_PLANE][headPosition.y][headPosition.x] = 0; // clear consumed goal
        } else {
          if (this.board[HEAD_PLANE][y][x] == 0) { // if new head position not equal to previous tail position
            this.board[BODY_PLANE][y][x] = 0; // clear old tail-body position
          }
          this.board[TAIL_PLANE][y][x] = 0; // clear old tail position
          this.board[TAIL_PLANE][nextY][nextX] = 1; // set new tail position
        }
        var goalAchieved = (this.board[GOAL_PLANE][nextHeadY][nextHeadX] != 0);
        if (goalAchieved) {
          this.board[GOAL_PLANE][nextHeadY][nextHeadX] = 0; // clear goal position
          this.board[CONSUME_PLANE][nextHeadY][nextHeadX] = 1; // set consumed goal at head position
          var goalPosition = this.getRandomFreePosition(); // next random goal
          if (goalPosition != null) { // if there is free space
            this.board[GOAL_PLANE][goalPosition.y][goalPosition.x] = 1; // set next goal
          }
        }
        break;
      }

      nextX = x;
      nextY = y;
      var bodyMovement = this.getBodyMovement(direction);
      x -= bodyMovement.dx;
      y -= bodyMovement.dy;
      nextDirection = direction;
      direction = this.getBodyDirection(x, y);
    }

    return { bodyPositions: bodyPositions, bodyMovements: bodyMovements };
  }

  isValidMove(action) {
    var headPosition = this.getHeadPosition();
    var direction = this.getBodyDirection(headPosition.x, headPosition.y);
    var nextDirection = action;
    var rotation = nextDirection - direction;
    if (Math.abs(rotation % 4) == 2) {
      return false; // can't turn back
    }
    var bodyMovement = this.getBodyMovement(nextDirection);
    var nextX = headPosition.x + bodyMovement.dx;
    var nextY = headPosition.y + bodyMovement.dy;
    var goalConsumed = (this.board[CONSUME_PLANE][headPosition.y][headPosition.x] != 0);
    // Valid if not outside and not collide body or collide tail without growing
    return ((nextX >= 0) && (nextX < this.boardSize) && (nextY >= 0) && (nextY < this.boardSize)
        && ((this.board[BODY_PLANE][nextY][nextX] == 0)
        || (!goalConsumed && (this.board[TAIL_PLANE][nextY][nextX] != 0))));
  }

  getValidMoves(anyMoveDetection = false) {
    var valids = new Array(this.actionSize);
    for (var action = 0; action < this.actionSize; action++) {
      var validAction = this.isValidMove(action);
      if (anyMoveDetection && validAction) {
        return true;
      }
      valids[action] = validAction;
    }
    return (anyMoveDetection ? false : valids);
  }

  getHeadPosition() {
    for (var y = 0; y < this.boardSize; y++) {
      for (var x = 0; x < this.boardSize; x++) {
        if (this.board[HEAD_PLANE][y][x] != 0) {
          return { x: x, y: y };
        }
      }
    }
    throw new Error("The head must always exist");
  }

  getGoalPosition() {
    for (var y = 0; y < this.boardSize; y++) {
      for (var x = 0; x < this.boardSize; x++) {
        if (this.board[GOAL_PLANE][y][x] != 0) {
          return { x: x, y: y };
        }
      }
    }
    return null;
  }

  isGameOver() {
    return !this.getValidMoves(true);
  }

  isGoalConsumed() {
    var headPosition = this.getHeadPosition();
    return (this.board[CONSUME_PLANE][headPosition.y][headPosition.x] != 0);
  }

  getRandomFreePosition() {
    var positions = [];
    for (var y = 0; y < this.boardSize; y++) {
      for (var x = 0; x < this.boardSize; x++) {
        if (this.board[BODY_PLANE][y][x] == 0) {
          positions.push({ x: x, y: y });
        }
      }
    }
    if (positions.length > 0) {
      return positions[Math.floor(Math.random() * positions.length)];
    } else {
      return null;
    }
  }

  // Board example of size 6x6
  // 'x' - head, 'o' - body, '+' - goal
  //     1 2 3 4 5 6
  //   * * * * * * * *
  // 1 *             *
  // 2 *   o         *
  // 3 *   o o o   + *
  // 4 *       o     *
  // 5 *       o x   *
  // 6 *             *
  //   * * * * * * * *
  getDisplayTextLines() {
    var lines = [];
    var line = "";
    for (var i = 0; i < this.boardSize + 2; i++) {
      line += " *";
    }
    lines.push(line);
    for (var y = 0; y < this.boardSize; y++) {
      line = " * ";
      for (var x = 0; x < this.boardSize; x++) {
        if (this.board[CONSUME_PLANE][y][x] != 0) { // consumed goal
          line += "#";
        } else if (this.board[HEAD_PLANE][y][x] != 0) { // head
          line += "x";
        } else if (this.board[BODY_PLANE][y][x] != 0) { // body
          line += "o";
        } else if (this.board[GOAL_PLANE][y][x] != 0) { // goal
          line += "+";
        } else {
          line += " ";
        }
        line += " ";
      }
      line += "*";
      lines.push(line);
    }
    line = "";
    for (var i = 0; i < this.boardSize + 2; i++) {
      line += " *";
    }
    lines.push(line);
    return lines;
  }
}
