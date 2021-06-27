import {
  AssetType,
  Camera,
  Color,
  Entity,
  MeshRenderer,
  PrimitiveMesh,
  Ray,
  Rect,
  Script,
  Sprite,
  SpriteRenderer,
  Texture2D,
  Transform,
  UnlitMaterial,
  Vector2,
  Vector3,
  WebGLEngine
} from "oasis-engine";
import TWEEN, { Tween } from "@tweenjs/tween.js";

let gameResArray: Texture2D[];

// Design size
setCanvasSize(525, 728);

// Create engine object
const engine = new WebGLEngine("canvas");
engine.canvas.resizeByClientSize();

const scene = engine.sceneManager.activeScene;
const rootEntity = scene.createRootEntity();

// Create camera
const cameraEntity = rootEntity.createChild("camera");
cameraEntity.transform.setPosition(0.3, 0, 5);
const camera = cameraEntity.addComponent(Camera);
// 2D is more suitable for orthographic cameras
camera.isOrthographic = true;
camera.orthographicSize = 4.5;

// Load the resources needed by the game
engine.resourceManager
  .load([
    {
      // Bird
      url: "https://gw.alipayobjects.com/zos/OasisHub/315000157/8356/bird.png",
      type: AssetType.Texture2D
    },
    {
      // Pipe
      url: "https://gw.alipayobjects.com/zos/OasisHub/315000157/5987/pipe.png",
      type: AssetType.Texture2D
    },
    {
      // Background
      url: "https://gw.alipayobjects.com/zos/OasisHub/315000157/5244/background.png",
      type: AssetType.Texture2D
    },
    {
      // Ground
      url: "https://gw.alipayobjects.com/zos/OasisHub/315000157/5230/ground.png",
      type: AssetType.Texture2D
    },
    {
      // Restart
      url: "https://gw.alipayobjects.com/zos/OasisHub/315000157/6695/restart.png",
      type: AssetType.Texture2D
    },
    {
      // Number
      url: "https://gw.alipayobjects.com/zos/OasisHub/315000157/8709/527-number.png",
      type: AssetType.Texture2D
    }
  ])
  .then((texture2DArr: Texture2D[]) => {
    gameResArray = texture2DArr;
    // Initialize each node （I usually go from far to near）
    // background
    const nodeBg = rootEntity.createChild("nodeBg");
    nodeBg.transform.setPosition(0.3, 0, -5);
    addSpriteRender(nodeBg, texture2DArr[2]);

    // Pipe
    const nodePipe = rootEntity.createChild("nodePipe");
    nodePipe.transform.setPosition(0, 0, -3);
    nodePipe.addComponent(ScriptPipe);

    // Bottom
    const nodeGround = rootEntity.createChild("nodeGround");
    nodeGround.transform.setPosition(0, 0, 0);
    const ground1 = nodeGround.createChild("ground1");
    ground1.transform.setPosition(0, -4.125, 0);
    addSpriteRender(ground1, texture2DArr[3]);
    const ground2 = nodeGround.createChild("ground2");
    ground2.transform.setPosition(groundWid, -4.125, 0);
    addSpriteRender(ground2, texture2DArr[3]);
    nodeGround.addComponent(ScriptGround);

    // Bird
    const nodeBird = rootEntity.createChild("nodeBird");
    nodeBird.transform.setPosition(-1, 1.15, 0);
    addSpriteRender(nodeBird, texture2DArr[0]);
    // Death splash screen effect
    const renderer = nodeBird.addComponent(MeshRenderer);
    renderer.mesh = PrimitiveMesh.createPlane(engine, 20, 20);
    const material = new UnlitMaterial(engine);
    // Can be transparent
    material.isTransparent = true;
    renderer.setMaterial(material);
    nodeBird.addComponent(ScriptBird);

    // GUI
    const nodeGui = rootEntity.createChild("nodeGui");
    nodeGui.transform.setPosition(0.3, 0, 1);
    const nodeRestart = nodeGui.createChild("nodeRestart");
    addSpriteRender(nodeRestart, texture2DArr[4]);
    const nodeScore = nodeGui.createChild("nodeScore");
    nodeScore.transform.setPosition(0, 3.2, 0);
    nodeScore.transform.setScale(0.3, 0.3, 0.3);
    nodeGui.addComponent(ScriptGUI);
    nodeScore.addComponent(ScriptScore);

    // GameCtrl controls the global game
    rootEntity.addComponent(GameCtrl);
  });

engine.run();

/**
 * We can customize the size of the interface that is finally presented to the player
 * @param designWidth
 * @param designHeight
 */
function setCanvasSize(designWidth: number, designHeight: number) {
  const canvas = document.getElementById("canvas");
  const parentEle = canvas.parentElement;
  const style = canvas.style;
  style.width = designWidth + "px";
  style.height = designHeight + "px";
  style.marginLeft = (parentEle.clientWidth - designWidth) / 2 + "px";
  style.marginTop = (parentEle.clientHeight - designHeight) / 2 + "px";
}

/**
 * General method for adding spriterender to nodes
 * @param node
 * @param texture2D
 */
function addSpriteRender(node: Entity, texture2D: Texture2D) {
  let renderer = node.addComponent(SpriteRenderer);
  renderer.sprite = new Sprite(engine, texture2D, null, null, 100);
}

class ScriptPipe extends Script {
  // When there is no pipe in the pool, use this instance to clone
  private _originPipe: Entity;
  // All current pipes
  private _nowPipeArr: Array<Entity> = [];
  // Pool for reuse
  private _pipePool: Array<Entity> = [];
  // Timestamp of the start of the game
  private _curStartTimeStamp: number;

  onAwake() {
    const { engine, entity } = this;
    // Init originPipe
    const pipe = (this._originPipe = new Entity(engine));
    const node1 = pipe.createChild("node1");
    const node2 = pipe.createChild("node2");
    node1.transform.setPosition(0, -5.4, 0);
    node2.transform.setPosition(0, 5.4, 0);
    node2.transform.setScale(1, -1, 1);
    addSpriteRender(node1, gameResArray[1]);
    addSpriteRender(node2, gameResArray[1]);
    this._pipePool.push(pipe);

    // Control the performance of the pipe according to the change of the game state
    engine.on(GameEvent.stateChange, (gameState: EnumGameState) => {
      switch (gameState) {
        case EnumGameState.Idel:
          this.enabled = false;
          this.destroyPipe();
          break;
        case EnumGameState.Start:
          this.enabled = true;
          this._curStartTimeStamp = engine.time.nowTime;
          break;
        case EnumGameState.End:
          this.enabled = false;
          break;
      }
    });

    // When checkHit is monitored, check the collision between the pipe and the bird
    engine.on(GameEvent.checkHit, (birdY) => {
      var len = this._nowPipeArr.length;
      for (var i = 0; i < len; i++) {
        var pipePos = this._nowPipeArr[i].transform.position;
        if (Math.abs(pipePos.x) < 0.9) {
          if (Math.abs(pipePos.y - birdY) > 1.2) {
            engine.dispatch(GameEvent.gameOver);
          }
          break;
        }
      }
    });
  }

  /**
   * Three things will be done here every frame：
   *    1.Adjust the generation of the pipe
   *    2.Adjust the position of the pipe
   *    3.Judge whether to get a point
   * @param deltaTime
   */
  onUpdate(deltaTime: number) {
    // The water pipe will be displayed after the start of the game pipeDebutTime
    if (engine.time.nowTime - this._curStartTimeStamp >= pipeDebutTime) {
      let bAddScore = false;
      // After deltaTime, the distance the pipe has moved
      const changeVal = deltaTime * birdHorizontalV;
      const pipeLen = this._nowPipeArr.length;
      // Adjust the position of all pipes
      if (pipeLen > 0) {
        for (let i = pipeLen - 1; i >= 0; i--) {
          const pipe = this._nowPipeArr[i];
          const pipeTrans = pipe.transform;
          const pipePos = pipeTrans.position;
          if (pipePos.x < -4.6) {
            // The invisible pipe can be destroyed
            this.destroyPipe(i);
          } else {
            if (!bAddScore && pipePos.x > -1 && pipePos.x - changeVal <= -1) {
              // Get a point
              engine.dispatch(GameEvent.addScore);
              bAddScore = true;
            }
            pipeTrans.setPosition(pipePos.x - changeVal, pipePos.y, pipePos.z);
          }
          // Judge whether the pipe needs to be regenerated according to the X coordinate
          if (i == pipeLen - 1 && pipePos.x <= 4.6 - pipeHorizontalDis) {
            this.createPipe(4.6, pipeRandomPosY * Math.random() - pipeRandomPosY / 2 + 0.8, 0);
          }
        }
      } else {
        // Need to regenerate a pipe
        this.createPipe(4.6, pipeRandomPosY * Math.random() - pipeRandomPosY / 2 + 0.8, 0);
      }
    }
  }

  private createPipe(posX, posY, posZ) {
    const pipePool = this._pipePool;
    var pipe = pipePool.length > 0 ? pipePool.pop() : this._originPipe.clone();
    pipe.transform.setPosition(posX, posY, posZ);
    this.entity.addChild(pipe);
    this._nowPipeArr.push(pipe);
  }

  /**
   * It’s not really destroyed, we just put it in the pool
   * @param pipeIndex If pipeIndex is less than 0, we recycle all pipes
   */
  private destroyPipe(pipeIndex: number = -1) {
    const nowPipeArr = this._nowPipeArr;
    if (pipeIndex >= 0) {
      const pipe = nowPipeArr[pipeIndex];
      this.entity.removeChild(pipe);
      this._pipePool.push(pipe);
      nowPipeArr.splice(pipeIndex, 1);
    } else {
      for (let index = nowPipeArr.length - 1; index >= 0; index--) {
        const pipe = nowPipeArr[index];
        this.entity.removeChild(pipe);
        this._pipePool.push(pipe);
      }
      nowPipeArr.length = 0;
    }
  }
}

class ScriptScore extends Script {
  // The sprite array used by the score（0～9）
  private _spriteArray: Sprite[] = [];
  // Interval between each number
  private _numInv = 1.5;
  // Each number in the score
  private _scoreEntitys: NumberEntity[] = [];
  private _myScore = 0;

  onAwake() {
    // Init spriteArray
    const spriteArray = this._spriteArray;
    for (var i = 0; i < 10; i++) {
      spriteArray.push(new Sprite(engine, gameResArray[5], new Rect(i * 0.1, 0, 0.1, 1)));
    }

    engine.on(GameEvent.addScore, () => {
      ++this._myScore;
      this.showScore("" + this._myScore);
    });

    // Control the performance of the score according to the change of the game state
    engine.on(GameEvent.stateChange, (gameState: EnumGameState) => {
      switch (gameState) {
        case EnumGameState.Idel:
          this.entity.isActive = false;
          break;
        case EnumGameState.Start:
          this._myScore = 0;
          this.entity.isActive = true;
          this.showScore("0");
          break;
        case EnumGameState.End:
          break;
      }
    });
  }

  private showScore(scoreNumStr: string) {
    const scoreLen = scoreNumStr.length;
    const { entity, _numInv: inv, _scoreEntitys: scoreEntitys, _spriteArray: spriteArray } = this;
    var nowEntityLen = scoreEntitys.length;
    let scoreEntity: NumberEntity;
    // If the entity is not enough, new one
    if (scoreLen > nowEntityLen) {
      for (let i = nowEntityLen; i < scoreLen; i++) {
        scoreEntity = new NumberEntity(engine, "num" + i);
        scoreEntitys.push(scoreEntity);
        entity.addChild(scoreEntity);
      }
    }

    // At the moment nowEntityLen >= scoreLen
    nowEntityLen = scoreEntitys.length;
    const startX = ((1 - scoreLen) * inv) / 2;
    for (let i = 0; i < nowEntityLen; i++) {
      scoreEntity = scoreEntitys[i];
      if (i >= scoreLen) {
        scoreEntity.isActive = false;
      } else {
        scoreEntity.isActive = true;
        scoreEntity.transform.setPosition(startX + i * inv, 0, 0);
        scoreEntity.showNumber(spriteArray[parseInt(scoreNumStr[i])]);
      }
    }
  }
}

class ScriptGround extends Script {
  // Swap two pieces of ground to achieve constant movement
  private leftGround: Entity;
  private rightGround: Entity;

  onAwake() {
    const entity = this.entity;
    this.leftGround = entity.findByName("ground1");
    this.rightGround = entity.findByName("ground2");
    // Control the performance of the ground according to the change of the game state
    engine.on(GameEvent.stateChange, (gameState: EnumGameState) => {
      switch (gameState) {
        case EnumGameState.Idel:
        case EnumGameState.Start:
          this.enabled = true;
          break;
        case EnumGameState.End:
          this.enabled = false;
          break;
        default:
          break;
      }
    });

    // When checkHit is monitored, check the collision between the ground and the bird
    engine.on(GameEvent.checkHit, (birdY) => {
      birdY < groundY && engine.dispatch(GameEvent.gameOver);
    });
  }

  onUpdate(deltaTime: number) {
    // After deltaTime, the distance the ground has moved
    const changeVal = deltaTime * birdHorizontalV;
    const leftTransform = this.leftGround.transform;
    const rightTransform = this.rightGround.transform;
    const leftPosition = leftTransform.position;
    const rightPosition = rightTransform.position;
    leftPosition.x -= changeVal;
    rightPosition.x -= changeVal;
    if (leftPosition.x < -groundWid) {
      // The invisible ground can be moved to the right
      leftPosition.x = rightPosition.x + groundWid;
    }
    leftTransform.position = leftPosition;
    rightTransform.position = rightPosition;
    // Swap
    var temp = this.leftGround;
    this.leftGround = this.rightGround;
    this.rightGround = temp;
  }
}

class GameCtrl extends Script {
  private _gameState: EnumGameState;
  private _tempViewportVec2 = new Vector2();
  private _tempRay = new Ray();
  onAwake() {
    const { entity } = this;
    engine.on(GameEvent.reStartGame, () => {
      this.gameState = EnumGameState.Idel;
    });

    engine.on(GameEvent.gameOver, () => {
      this.gameState = EnumGameState.End;
    });

    const webCanvas = engine.canvas._webCanvas;
    const camera = entity.findByName("camera").getComponent(Camera);
    const viewport = camera.viewport;
    const tempViewportVec2 = this._tempViewportVec2;
    const tempRay = this._tempRay;
    const onTouchEnd = (touchEvt) => {
      if (!touchEvt) {
        return;
      }
      switch (this._gameState) {
        case EnumGameState.End:
          const { changedTouches = [], target } = touchEvt;
          const { left = 0, top = 0 } = target && target.getBoundingClientRect();
          if (changedTouches.length > 0) {
            const mPos = changedTouches[0];
            tempViewportVec2.setValue(
              ((mPos.clientX - left) / webCanvas.clientWidth - viewport.x) / viewport.z,
              ((mPos.clientY - top) / webCanvas.clientHeight - viewport.y) / viewport.w
            );
            camera.viewportPointToRay(tempViewportVec2, tempRay);
            engine.dispatch(GameEvent.checkHitGui, tempRay);
          }
          if (touchEvt) break;
        default:
          break;
      }
    };
    const onMouseUp = (touchEvt) => {
      if (!touchEvt) {
        return;
      }
      switch (this._gameState) {
        case EnumGameState.End:
          const { pageX, pageY, target } = touchEvt;
          const { offsetLeft = 0, offsetTop = 0 } = target;
          tempViewportVec2.setValue(
            ((pageX - offsetLeft) / webCanvas.clientWidth - viewport.x) / viewport.z,
            ((pageY - offsetTop) / webCanvas.clientHeight - viewport.y) / viewport.w
          );
          camera.viewportPointToRay(tempViewportVec2, tempRay);
          engine.dispatch(GameEvent.checkHitGui, tempRay);
        default:
          break;
      }
    };
    const onMouseDown = () => {
      switch (this._gameState) {
        case EnumGameState.Idel:
          this.gameState = EnumGameState.Start;
          engine.dispatch(GameEvent.fly);
          break;
        case EnumGameState.Start:
          engine.dispatch(GameEvent.fly);
          break;
        default:
          break;
      }
    };
    //Monitor mouse events
    webCanvas.addEventListener(CanvasEvent.mouseup, onMouseUp);
    webCanvas.addEventListener(CanvasEvent.touchend, onTouchEnd);
    webCanvas.addEventListener(CanvasEvent.touchstart, onMouseDown);
    webCanvas.addEventListener(CanvasEvent.mousedown, onMouseDown);
  }

  onStart() {
    // Give a state at the beginning
    this.gameState = EnumGameState.Idel;
  }

  onUpdate() {
    // Update TWEEN
    TWEEN.update();
  }

  /**
   * The status will be distributed to all objects in the game
   */
  set gameState(state: EnumGameState) {
    if (this._gameState != state) {
      this._gameState = state;
      engine.dispatch(GameEvent.stateChange, state);
    }
  }
}

class ScriptGUI extends Script {
  onAwake() {
    const { entity } = this;
    const resetBtnNode = entity.findByName("nodeRestart");
    const resetBtnRenderer = resetBtnNode.getComponent(SpriteRenderer);
    engine.on(GameEvent.checkHitGui, (tempRay) => {
      if (!resetBtnNode.isActive || !tempRay) {
        return;
      }
      // Check whether the ray intersects the bounding box
      if (tempRay.intersectBox(resetBtnRenderer.bounds) >= 0) {
        // Tell gamectrl to restart the game
        engine.dispatch(GameEvent.reStartGame);
      }
    });

    // Control the performance of the GUI according to the change of the game state
    engine.on(GameEvent.stateChange, (gameState: EnumGameState) => {
      switch (gameState) {
        case EnumGameState.Idel:
        case EnumGameState.Start:
          resetBtnNode.isActive = false;
          break;
        case EnumGameState.End:
          break;
        default:
          break;
      }
    });

    engine.on(GameEvent.showGui, () => {
      resetBtnNode.isActive = true;
    });
  }
}

class ScriptBird extends Script {
  /** Offsets of sprite sheet animation */
  private _regions: Vector2[] = [new Vector2(0, 0), new Vector2(1 / 3, 0), new Vector2(2 / 3, 0)];
  /** Reciprocal Of SliceWidth */
  private _reciprocalSliceWidth: number = 1 / 3;
  /** Reciprocal Of SliceHeight */
  private _reciprocalSliceHeight: number = 1;
  /** Frame interval time, the unit of time is ms */
  private _frameInterval = 150;
  /** Total frames */
  private _totalFrames = 3;

  private _sprite: Sprite;
  private _material: UnlitMaterial;
  private _curFrameIndex: number;
  private _birdTransform: Transform;
  private _yoyoTween;
  private _dropTween;
  private _startY: number;
  private _flyStartTime: number;
  private _gameState: EnumGameState;
  private _cumulativeTime: number = 0;
  private _birdState = EnumBirdState.Alive;

  onAwake() {
    const { entity } = this;
    const transform = (this._birdTransform = entity.transform);
    this._material = <UnlitMaterial>entity.getComponent(MeshRenderer).getMaterial();
    this._sprite = entity.getComponent(SpriteRenderer).sprite;
    this._setFrameIndex(0);
    this.materialAlpha = 0;
    this.initTween();

    engine.on(GameEvent.fly, () => {
      // Record start time and location
      this._startY = this.birdPosY;
      this._flyStartTime = engine.time.nowTime;

      // Flying performance
      this.stopAllTween();
      this.birdRotationZ = 20;
      this._dropTween.start();
    });

    // Control the performance of the bird according to the change of the game state
    engine.on(GameEvent.stateChange, (gameState: EnumGameState) => {
      this._gameState = gameState;
      switch (gameState) {
        case EnumGameState.Idel:
          transform.setPosition(0, 0, 0);
          transform.rotation = new Vector3(0, 0, 0);
          this.setBirdState(EnumBirdState.Alive);
          this._yoyoTween.start();
          break;
        case EnumGameState.Start:
          break;
        case EnumGameState.End:
          this.setBirdState(EnumBirdState.Dead);
          this.stopAllTween();
          this.showShock();
          setTimeout(() => {
            if (this.birdPosY > groundY) {
              new TWEEN.Tween(this).to({ birdRotationZ: -90 }, (this.birdPosY - groundY) * 40).start();
              new TWEEN.Tween(this)
                .to({ birdPosY: groundY }, (this.birdPosY - groundY) * 120)
                .onComplete(() => {
                  engine.dispatch(GameEvent.showGui);
                })
                .start();
            } else {
              engine.dispatch(GameEvent.showGui);
            }
          }, 300);
          break;
      }
    });
  }

  /**
   *  There is a death splash screen effect when you die
   */
  private showShock() {
    new TWEEN.Tween(this).to({ materialAlpha: 1 }, 80).start();
    new TWEEN.Tween(this).to({ materialAlpha: 0 }, 80).delay(100).start();
  }

  private initTween() {
    if (!this._yoyoTween) {
      this._yoyoTween = new TWEEN.Tween(this)
        .to({ birdPosY: 0.25 }, 380)
        .repeat(Infinity)
        .yoyo(true)
        .easing(TWEEN.Easing.Sinusoidal.InOut);

      this._dropTween = new TWEEN.Tween(this).to({ birdRotationZ: -90 }, 380).delay(520);
    }
  }

  onUpdate(deltaTime: number) {
    switch (this._birdState) {
      case EnumBirdState.Alive:
        const { _frameInterval, _totalFrames } = this;
        this._cumulativeTime += deltaTime;
        if (this._cumulativeTime >= _frameInterval) {
          // Need update frameIndex
          const addFrameCount = Math.floor(this._cumulativeTime / _frameInterval);
          this._cumulativeTime -= addFrameCount * _frameInterval;
          this._setFrameIndex((this._curFrameIndex + addFrameCount) % _totalFrames);
        }
        break;
      case EnumBirdState.Dead:
        this._setFrameIndex(0);
        break;
    }
    if (this._gameState == EnumGameState.Start) {
      this.updateBirdPosY();
    }
  }

  // Free fall and uniform motion are superimposed to obtain the current position
  public updateBirdPosY(): void {
    // How much time has passed
    const subTime = (engine.time.nowTime - this._flyStartTime) / 1000;
    // How long has it been in free fall
    const addToMaxUseTime = (maxDropV - startFlyV) / gravity;
    if (subTime <= addToMaxUseTime) {
      // Free fall
      this.birdPosY = ((startFlyV + (startFlyV + subTime * gravity)) * subTime) / 2 + this._startY;
    } else {
      // Falling at a constant speed
      this.birdPosY =
        this._startY + ((maxDropV + startFlyV) * addToMaxUseTime) / 2 + maxDropV * (subTime - addToMaxUseTime);
    }
  }

  onLateUpdate() {
    // After updating the position, check the collision
    engine.dispatch(GameEvent.checkHit, this.birdPosY);
  }

  private _setFrameIndex(frameIndex: number): void {
    if (this._curFrameIndex !== frameIndex) {
      this._curFrameIndex = frameIndex;
      const frameInfo = this._regions[frameIndex];
      const region = this._sprite.region;
      region.setValue(frameInfo.x, frameInfo.y, this._reciprocalSliceWidth, this._reciprocalSliceHeight);
      this._sprite.region = region;
    }
  }

  public setBirdState(state: EnumBirdState) {
    if (this._birdState != state) {
      this._birdState = state;
    }
  }

  private stopAllTween() {
    this._yoyoTween && this._yoyoTween.stop();
    this._dropTween && this._dropTween.stop();
  }

  private tempColor = new Color(0, 0, 0);
  set materialAlpha(alpha) {
    const { tempColor, _material: material } = this;
    tempColor.a = alpha;
    material.baseColor = new Color(0, 0, 0, alpha);
  }

  get materialAlpha() {
    return this._material.baseColor.a;
  }

  set birdPosY(val) {
    const transform = this._birdTransform;
    const position = transform.position;
    position.y = val;
    transform.position = position;
  }

  get birdPosY() {
    return this._birdTransform.position.y;
  }

  set birdRotationZ(val) {
    const transform = this._birdTransform;
    const rotation = transform.rotation;
    transform.setRotation(rotation.x, rotation.y, val);
  }

  get birdRotationZ() {
    return this._birdTransform.rotation.z;
  }
}

/**
 *  Any number in the score is an Entity
 */
class NumberEntity extends Entity {
  private renderer: SpriteRenderer;
  constructor(engine, name) {
    super(engine, name);
    // We use SpriteRenderer to display numbers
    this.renderer = this.addComponent(SpriteRenderer);
  }

  public showNumber(sprite: Sprite) {
    this.renderer.sprite = sprite;
  }
}

enum EnumBirdState {
  Alive = 0,
  Dead = 1
}

enum EnumGameState {
  Idel = 0,
  Start = 1,
  End = 2
}

const groundY = -3.1;
const groundWid = 7.77;
// Maximum downward speed
const maxDropV = -8;
// Acceleration of gravity
const gravity = -35;
// Initial upward speed given during fly
const startFlyV = 10;
// Vertical distance of pipe
const pipeVerticalDis = 10.8;
// Horizontal distance of pipe
const pipeHorizontalDis = 4;
// Random location range generated by pipes
const pipeRandomPosY = 3.5;
// Horizontal movement speed (bird, pipe, ground...)
const birdHorizontalV = 0.003;
// Water pipe debut time(ms)
const pipeDebutTime = 3000;

const GameEvent = {
  fly: "fly",
  stateChange: "stateChange",
  showGui: "showGui",
  checkHitGui: "checkHitGui",
  checkHit: "checkHit",
  gameOver: "gameOver",
  addScore: "addScore",
  reStartGame: "reStartGame"
};

const CanvasEvent = {
  touchend: "touchend",
  touchstart: "touchstart",
  mouseup: "mouseup",
  mousedown: "mousedown"
};
