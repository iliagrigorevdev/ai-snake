
const STATE_INTERVAL = 0.2;

const HEAD_RADIUS = 0.3;
const GOAL_RADIUS = 0.25;
const GOAL_RADIUS_INV = 1 / GOAL_RADIUS;
const CONSUMING_GAP = 1 - GOAL_RADIUS;

const GOAL_SEGMENT_COUNT = 16;
const GOAL_RING_COUNT = 16;

const HEAD_RING_COUNT = 6;
const BODY_RING_COUNT = 8;
const TAIL_RING_COUNT = 8;
const SEGMENT_COUNT = 16;
const SEGMENT_MIDDLE = Math.floor(SEGMENT_COUNT / 2);
const SEGMENT_ANGLE = 2 * Math.PI / SEGMENT_COUNT;
const HEAD_RING_ANGLE = (Math.PI / 2) / (HEAD_RING_COUNT - 1);
const TAIL_RING_ANGLE = (Math.PI / 4) / (TAIL_RING_COUNT - 1);
const TAIL_RING_INTERVAL = 0.5 / (TAIL_RING_COUNT - 1);
const HEAD_VERTEX_COUNT = 1 + HEAD_RING_COUNT * SEGMENT_COUNT;
const BODY_VERTEX_COUNT = BODY_RING_COUNT * SEGMENT_COUNT;
const TAIL_VERTEX_COUNT = TAIL_RING_COUNT * SEGMENT_COUNT;
const U_INTERVAL = 2 / SEGMENT_COUNT;

const ZERO = new THREE.Vector2(0, 0);
const HALF_PI = Math.PI / 2;

const GOAL_COLOR = 0xff0000;
const GOAL_ROUGHNESS = 0.2;
const SNAKE_ROUGHNESS = 0.35;

class SnakeGeometry extends THREE.BufferGeometry {

  constructor(bodyLength) {
    if (bodyLength < 3) {
      throw new Error("Invalid body length");
    }
    super();

    this.bodyLength = bodyLength;
    this.ringCount = HEAD_RING_COUNT + (this.bodyLength - 2) * BODY_RING_COUNT + TAIL_RING_COUNT;
    this.vertexCount = HEAD_VERTEX_COUNT + (bodyLength - 2) * BODY_VERTEX_COUNT + TAIL_VERTEX_COUNT;

    this.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * this.vertexCount), 3));
    this.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(3 * this.vertexCount), 3));
    this.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(2 * this.vertexCount), 2));
    this.setIndex(this.createIndices());
    this.generateUVs();

    this.segmentTangent = new THREE.Vector3();
    this.segmentNormal = new THREE.Vector3();
    this.tangent = new THREE.Vector2();
    this.normal = new THREE.Vector2();
    this.vector = new THREE.Vector2();
    this.position = new THREE.Vector2();
  }

  createIndices() {
    var indices = new Array(6 * (this.ringCount - 2) * SEGMENT_COUNT);
    var i = 0;
    var v0 = 0;
    var v1 = 1;
    var v2 = v1 + 1;
    for (var s = 0; s < SEGMENT_COUNT; s++) {
      if (s == SEGMENT_COUNT - 1) {
        v2 -= SEGMENT_COUNT;
      }
      indices[i++] = v0;
      indices[i++] = v1++;
      indices[i++] = v2++;
    }
    v0++;
    var v3;
    for (var r = 0; r < this.ringCount - 3; r++) {
      v2 = v1 + 1;
      v3 = v0 + 1;
      for (var s = 0; s < SEGMENT_COUNT; s++) {
        if (s == SEGMENT_COUNT - 1) {
          v2 -= SEGMENT_COUNT;
          v3 -= SEGMENT_COUNT;
        }
        indices[i++] = v0;
        indices[i++] = v1++;
        indices[i++] = v2;
        indices[i++] = v0++;
        indices[i++] = v2++;
        indices[i++] = v3++;
      }
    }
    v3 = v0 + 1;
    for (var s = 0; s < SEGMENT_COUNT; s++) {
      if (s == SEGMENT_COUNT - 1) {
        v3 -= SEGMENT_COUNT;
      }
      indices[i++] = v0++;
      indices[i++] = v1++;
      indices[i++] = v3++;
    }
    return indices;
  }

  generateUVs() {
    var uvs = this.attributes.uv.array;
    var offset = 0;
    for (var i = 0; i < this.bodyLength; i++) {
      var ringCount;
      if (i == 0) {
        ringCount = HEAD_RING_COUNT + 1;
      } else if (i == this.bodyLength - 1) {
        ringCount = TAIL_RING_COUNT;
      } else {
        ringCount = BODY_RING_COUNT;
      }
      var quarter = i % 4;
      var direction = (quarter < 2 ? 1 : -1);
      var v = (quarter < 3 ? quarter / 2 : 0.5);
      var dv = direction * 0.5 / ringCount;
      for (var r = 0; r < ringCount; r++) {
        if ((i == 0) && (r == 0)) { // head single vertex ring
          uvs[offset++] = 0;
          uvs[offset++] = 0;
        } else {
          var u = 0;
          for (var s = 0; s < SEGMENT_COUNT; s++) {
            uvs[offset++] = u;
            uvs[offset++] = v;
            u += (s < SEGMENT_MIDDLE ? U_INTERVAL : -U_INTERVAL);
          }
          v += dv;
        }
      }
    }
  }

  computeRadius(alpha) {
    var x = (1 - alpha) * 1e2 + alpha * 1e4;
    var k = (Math.log10(x) - 2) / 2;
    return k * HEAD_RADIUS;
  }

  updateRing(ring, position, tangent, normal, radius) {
    var positions = this.attributes.position.array;
    var normals = this.attributes.normal.array;
    if (ring == 0) { // head single vertex ring
      var offset = (ring == 0 ? 0 : 3 * (this.vertexCount - 1));
      positions[offset] = position.x + radius * normal.x;
      positions[offset + 1] = position.y + radius * normal.y;
      positions[offset + 2] = 0;
      normals[offset] = normal.x;
      normals[offset + 1] = normal.y;
      normals[offset + 2] = 0;
    } else {
      this.segmentTangent.set(tangent.x, tangent.y, 0);
      var offset = 3 * (1 + (ring - 1) * SEGMENT_COUNT);
      for (var s = 0; s < SEGMENT_COUNT; s++) {
        this.segmentNormal.set(normal.x, normal.y, 0).applyAxisAngle(this.segmentTangent, s * SEGMENT_ANGLE);
        positions[offset] = position.x + this.segmentNormal.x * radius;
        positions[offset + 1] = position.y + this.segmentNormal.y * radius;
        positions[offset + 2] = this.segmentNormal.z * radius;
        normals[offset++] = this.segmentNormal.x;
        normals[offset++] = this.segmentNormal.y;
        normals[offset++] = this.segmentNormal.z;
      }
    }
  }

  updatePartRing(ring, x, y, dx1, dy1, dx2, dy2, radiusAlpha, ringAlpha) {
    this.position.set(x, y);
    this.tangent.set(dx1, dy1);
    this.normal.set(dy1, -dx1);

    var direction;
    var curvedPath = (dx1 != dx2) || (dy1 != dy2);
    if (curvedPath) {
      var cross = this.tangent.cross(this.vector.set(dx2, dy2));
      direction = (cross > 0 ? 1 : -1);
      this.vector.copy(this.tangent).multiplyScalar(-0.5);
      this.position.add(this.vector);
      this.vector.copy(this.normal).multiplyScalar(-0.5 * direction);
      this.position.add(this.vector);
      var angle = ringAlpha * direction * HALF_PI;
      this.tangent.rotateAround(ZERO, angle);
      this.normal.rotateAround(ZERO, angle);
      this.vector.copy(this.normal).multiplyScalar(0.5 * direction);
      this.position.add(this.vector);
    } else {
      direction = 0;
      this.vector.copy(this.tangent).multiplyScalar(ringAlpha - 0.5);
      this.position.add(this.vector);
    }

    var radius = this.computeRadius(radiusAlpha);
    this.updateRing(ring, this.position, this.tangent, this.normal, radius);

    if (ring == HEAD_RING_COUNT - 1) { // head hemisphere
      for (var r = 1; r < HEAD_RING_COUNT; r++) {
        this.normal.rotateAround(ZERO, HEAD_RING_ANGLE);
        this.updateRing(ring - r, this.position, this.tangent, this.normal, radius);
      }
    } else if (ring == this.ringCount - TAIL_RING_COUNT) { // tail cone
      for (var r = 1; r < TAIL_RING_COUNT; r++) {
        var k = r / (TAIL_RING_COUNT - 1);
        var tailRadius = this.computeRadius((1 - k) * radiusAlpha);
        if (direction != 0) {
          var tailAlpha = ringAlpha - 0.5 * k;
          if (tailAlpha > 0) {
            var angle = -direction * (1 - ringAlpha) * TAIL_RING_ANGLE;
            this.tangent.rotateAround(ZERO, angle);
            this.normal.rotateAround(ZERO, angle);
          } else {
            this.tangent.set(dx1, dy1);
            this.normal.set(dy1, -dx1);
          }
        }
        this.vector.copy(this.tangent).multiplyScalar(-TAIL_RING_INTERVAL);
        this.position.add(this.vector);
        this.updateRing(ring + r, this.position, this.tangent, this.normal, tailRadius);
      }
    }
  }

  updatePartRings(startRing, ringCount, x, y, dx1, dy1, dx2, dy2, dx3, dy3, alpha,
      alphaScale, radiusScaleStart, radiusScaleDecline) {
    var dynamic = (dx3 != 0) || (dy3 != 0);
    var ring = startRing;
    for (var r = 0; r < ringCount; r++) {
      var k = alphaScale * (r + 1) / ringCount;
      var radiusAlpha = radiusScaleStart - k * radiusScaleDecline;
      var ringAlpha = alphaScale - k;
      if (dynamic) {
        ringAlpha += alpha;
      }
      if (ringAlpha <= 1) {
        this.updatePartRing(ring, x, y, dx1, dy1, dx2, dy2, radiusAlpha, ringAlpha);
      } else {
        this.updatePartRing(ring, x + dx2, y + dy2, dx2, dy2, dx3, dy3, radiusAlpha, ringAlpha - 1);
      }
      ring++;
    }
  }

  updateTransition(snakeTransition, alpha) {
    var bodyPositions = snakeTransition.bodyPositions;
    var bodyMovements = snakeTransition.bodyMovements;
    if ((bodyPositions.length != this.bodyLength) || (bodyMovements.length != this.bodyLength)) {
      throw new Error("Inconsistent body length");
    }

    var radiusScaleStart;
    var radiusScaleDecline;
    for (var i = 1; i < this.bodyLength - 1; i++) {
      var currPosition = bodyPositions[i];
      var prevPosition = bodyPositions[i + 1];
      var nextPosition = bodyPositions[i - 1];
      var currMovement = bodyMovements[i];
      var nextMovement = bodyMovements[i - 1];
      var x = currPosition.x;
      var y = currPosition.y;
      var dx1 = currPosition.x - prevPosition.x;
      var dy1 = currPosition.y - prevPosition.y;
      var dx2 = nextPosition.x - currPosition.x;
      var dy2 = nextPosition.y - currPosition.y;

      var dynamic = (currMovement.dx != 0) || (currMovement.dy != 0);
      var dx3, dy3;
      var growingPart = false;
      if (dynamic) {
        dx3 = nextMovement.dx;
        dy3 = nextMovement.dy;
      } else {
        if (i == 1) {
          dx2 = dx1;
          dy2 = dy1;
          dx3 = nextMovement.dx;
          dy3 = nextMovement.dy;
          growingPart = true;
        } else {
          dx3 = 0;
          dy3 = 0;
        }
      }

      if (i == 1) { // add head
        this.updatePartRings(HEAD_RING_COUNT - 1, 1, nextPosition.x, nextPosition.y,
            dx2, dy2, dx3, dy3, dx3, dy3, alpha, 1, 1, 0);
        radiusScaleStart = 1;
        if (growingPart) {
          radiusScaleDecline = 1 / (this.bodyLength - 2.5 + alpha);
        } else {
          radiusScaleDecline = 1 / (this.bodyLength - 1.5);
        }
      }
      var startRing = HEAD_RING_COUNT + (i - 1) * BODY_RING_COUNT;
      if (growingPart) {
        this.updatePartRings(startRing, BODY_RING_COUNT, x, y, dx2, dy2, dx3, dy3, dx3, dy3,
            0, alpha, radiusScaleStart, radiusScaleDecline);
        radiusScaleStart -= alpha * radiusScaleDecline;
      } else {
        this.updatePartRings(startRing, BODY_RING_COUNT, x, y, dx1, dy1, dx2, dy2, dx3, dy3,
            alpha, 1, radiusScaleStart, radiusScaleDecline);
        radiusScaleStart -= radiusScaleDecline;
      }
      if (i == this.bodyLength - 2) { // add tail
        this.updatePartRings(this.ringCount - TAIL_RING_COUNT, 1, x, y, dx1, dy1, dx2, dy2, dx3, dy3,
            alpha, 1, radiusScaleStart, 0);
      }
    }

    this.attributes.position.needsUpdate = true;
    this.attributes.normal.needsUpdate = true;
    this.computeBoundingSphere();
  }

}

var model;
var game;

var goalMesh = null;
var snakeMesh = null;
var snakeGeometry = null;
var snakeMaterial = null;
var snakeTransition;
var viewDirty = true;

var skinTexture = new THREE.TextureLoader().load("res/skin.png");

var stateTime = 0;
var lastTime;

var scene = new THREE.Scene();
scene.background = new THREE.Color(0xdddddd);
var camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 100);
camera.position.z = 20;

var ambient = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambient);

var light = new THREE.DirectionalLight(0xffffff, 0.6);
light.position.set(-0.4, 0.6, 1.0);
scene.add(light);

var renderer = new THREE.WebGLRenderer();
//renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
//renderer.gammaOutput = true;
document.body.appendChild(renderer.domElement);

window.addEventListener("resize", onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;

  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function resetGame() {
  var x0 = Math.floor((game.boardSize - 1 - game.startLength) / 2);
  var y0 = Math.floor((game.boardSize - 1) / 2);
  var direction0 = 0; // x++
  game.reset(x0, y0, direction0);
  nextMove();
  viewDirty = true;
}

function getObservation() {
  var observation = new Array(game.boardSize);
  for (var y = 0; y < game.boardSize; y++) {
    observation[y] = new Array(game.boardSize);
    for (var x = 0; x < game.boardSize; x++) {
      observation[y][x] = [game.board[GOAL_PLANE][y][x], game.board[HEAD_PLANE][y][x], game.board[BODY_PLANE][y][x]];
    }
  }
  return observation;
}

function nextMove() {
  var observation = getObservation();
  var observationTensor = tf.tensor([observation], undefined, "int32");
  var action = model.predict(observationTensor).dataSync()[0];
  observationTensor.dispose();

  var valids = game.getValidMoves();
  var done;
  if (valids[action]) {
    var prevSnakeTransition = snakeTransition;
    snakeTransition = game.executeAction(action);
    if ((prevSnakeTransition == null) || (prevSnakeTransition.bodyPositions.length
        != snakeTransition.bodyPositions.length)) {
      viewDirty = true;
    }
    done = game.isGameOver();
  } else {
    done = true;
  }

  if (done) {
    resetGame();
  }
}

function createView() {
  if (snakeMesh != null) {
    scene.remove(snakeMesh);
  }

  snakeGeometry = new SnakeGeometry(snakeTransition.bodyPositions.length);
  if (snakeMaterial == null) {
    snakeMaterial = new THREE.MeshStandardMaterial({ map: skinTexture });
    snakeMaterial.roughness = SNAKE_ROUGHNESS;
  }
  snakeMesh = new THREE.Mesh(snakeGeometry, snakeMaterial);
  var boardOffset = -(game.boardSize - 1) / 2;
  snakeMesh.position.x = boardOffset;
  snakeMesh.position.y = boardOffset;
  scene.add(snakeMesh);

  if (goalMesh == null) {
    var goalGeometry = new THREE.SphereGeometry(GOAL_RADIUS, GOAL_SEGMENT_COUNT, GOAL_RING_COUNT);
    var goalMaterial = new THREE.MeshStandardMaterial({ color: GOAL_COLOR });
    goalMaterial.roughness = GOAL_ROUGHNESS;
    goalMesh = new THREE.Mesh(goalGeometry, goalMaterial);
    scene.add(goalMesh);
  }
  var goalPosition = game.getGoalPosition();
  if (goalPosition != null) {
    goalMesh.position.x = boardOffset + goalPosition.x;
    goalMesh.position.y = boardOffset + goalPosition.y;
    goalMesh.scale.set(1, 1, 1);
    goalMesh.visible = true;
  } else {
    goalMesh.visible = false;
  }
}

function updateView(alpha) {
  snakeGeometry.updateTransition(snakeTransition, alpha);

  if (game.isGoalConsumed()) {
    var goalRadius = GOAL_RADIUS - Math.max(0, GOAL_RADIUS - (1 - alpha));
    var goalScale = goalRadius * GOAL_RADIUS_INV;
    goalMesh.scale.set(goalScale, goalScale, goalScale);
  }
}

tf.enableProdMode();
//tf.enableDebugMode();
tf.loadGraphModel("ai/model.json").then(result => {
  model = result;
  var boardSize = model.executor.graph.placeholders[0].attrParams.shape.value[1];
  game = new Game(boardSize);

  resetGame();

  requestAnimationFrame(animate);
});

var animate = function(timestamp) {
  requestAnimationFrame(animate);

  var deltaTime = (lastTime !== undefined ? 1e-3 * (timestamp - lastTime) : 0);
  lastTime = timestamp;

  stateTime += deltaTime;
  if (stateTime > STATE_INTERVAL) {
    stateTime -= STATE_INTERVAL;
    nextMove();
  }
  if (stateTime > STATE_INTERVAL) {
    stateTime = 0;
  }

  if (viewDirty) {
    createView();
    viewDirty = false;
  }
  var alpha = stateTime / STATE_INTERVAL;
  updateView(alpha);

  renderer.render(scene, camera);
}
