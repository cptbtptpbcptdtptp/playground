import { OrbitControl } from "@oasis-engine/controls";
import {
  AssetType,
  Camera,
  Color,
  ParticleRenderer,
  ParticleRendererBlendMode,
  SystemInfo,
  Texture2D,
  Vector3,
  WebGLEngine
} from "oasis-engine";

//-- create engine object
const engine = new WebGLEngine("o3-demo");
engine.canvas.width = window.innerWidth * SystemInfo.devicePixelRatio;
engine.canvas.height = window.innerHeight * SystemInfo.devicePixelRatio;

const scene = engine.sceneManager.activeScene;
const rootEntity = scene.createRootEntity();

//-- create camera
const cameraEntity = rootEntity.createChild("camera_entity");
cameraEntity.transform.position = new Vector3(0, 0, 50);
cameraEntity.addComponent(Camera);
const controls = cameraEntity.addComponent(OrbitControl);
controls.autoRotate = true;
controls.autoRotateSpeed = 10;

engine.run();

const particleEntity = rootEntity.createChild("particle");

let particles: ParticleRenderer = particleEntity.addComponent(ParticleRenderer);

const spriteSheet = [
  {
    x: 0,
    y: 0,
    w: 100,
    h: 95,
    offX: 0,
    offY: 0,
    sourceW: 100,
    sourceH: 95
  },
  {
    x: 100,
    y: 0,
    w: 48,
    h: 46,
    offX: 0,
    offY: 0,
    sourceW: 48,
    sourceH: 46
  },
  {
    x: 148,
    y: 0,
    w: 97,
    h: 90,
    offX: 0,
    offY: 0,
    sourceW: 97,
    sourceH: 90
  },
  {
    x: 245,
    y: 0,
    w: 148,
    h: 128,
    offX: 0,
    offY: 0,
    sourceW: 148,
    sourceH: 128
  },
  {
    x: 393,
    y: 0,
    w: 118,
    h: 249,
    offX: 0,
    offY: 0,
    sourceW: 118,
    sourceH: 249
  },
  {
    x: 100,
    y: 90,
    w: 124,
    h: 94,
    offX: 0,
    offY: 0,
    sourceW: 124,
    sourceH: 94
  },
  {
    x: 0,
    y: 184,
    w: 249,
    h: 185,
    offX: 0,
    offY: 0,
    sourceW: 249,
    sourceH: 185
  },
  {
    x: 0,
    y: 95,
    w: 86,
    h: 83,
    offX: 0,
    offY: 0,
    sourceW: 86,
    sourceH: 83
  }
];

engine.resourceManager
  .load<Texture2D>({
    url: "https://gw-office.alipayobjects.com/basement_prod/f474fffc-f76c-4a95-80b4-ba42170f3fe9.png",
    type: AssetType.Texture2D
  })
  .then((resource) => {
    particles.maxCount = 400;
    particles.startTimeRandomness = 5;
    particles.position = new Vector3(0, -10, 0);
    particles.velocity = new Vector3(0, 20, 0);
    particles.velocityRandomness = new Vector3(10, 2, 10);
    particles.acceleration = new Vector3(0, -10, 0);
    particles.accelerationRandomness = new Vector3(2, 4, 5);
    particles.rotateVelocity = 1;
    particles.rotateVelocityRandomness = 1;
    particles.size = 1;
    particles.sizeRandomness = 1;
    particles.color = new Color(0.5, 0.5, 0.5);
    particles.colorRandomness = 1;
    particles.isFadeIn = true;
    particles.isFadeOut = true;
    particles.texture = resource;
    particles.spriteSheet = spriteSheet;
    particles.blendMode = ParticleRendererBlendMode.Additive;
    particles.start();
  });
