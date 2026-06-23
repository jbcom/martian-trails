import * as PIXI from "pixi.js";
import type { GameState } from "./GameState";
import { CONSTANTS, TERRAIN_ZONES } from "./GameState";

export class Renderer {
  public app: PIXI.Application;
  private layerWorld = new PIXI.Container();
  private layerSky = new PIXI.Container();
  private layerStars = new PIXI.Container();
  private layerCelestial = new PIXI.Container();
  private layerMnt = new PIXI.Container();
  private layerDune = new PIXI.Container();
  private layerBaseBg = new PIXI.Container();
  private layerGround = new PIXI.Container();
  private layerTracks = new PIXI.Container();
  private layerObstacles = new PIXI.Container();
  private layerFgRocks = new PIXI.Container();
  private layerRover = new PIXI.Container();
  private layerBaseFg = new PIXI.Container();
  private layerDust = new PIXI.Container();
  private layerWeather = new PIXI.Container();

  private skyBox!: PIXI.Graphics;
  private sunGfx!: PIXI.Graphics;
  private phobosGfx!: PIXI.Graphics;
  private groundGfx!: PIXI.Graphics;
  private rover!: PIXI.Container & {
    wheels?: PIXI.Container[];
    beam?: PIXI.Graphics;
    beacon?: PIXI.Graphics;
  };
  private baseAirlock!: PIXI.Container;

  private mountains: PIXI.Graphics[] = [];
  private dunes: PIXI.Graphics[] = [];
  private fgRocks: PIXI.Graphics[] = [];
  private obstacles: PIXI.Graphics[] = [];
  private envParticles: (PIXI.Graphics & { baseVx: number; baseVy: number })[] = [];
  private dustPool: (PIXI.Graphics & { vx: number; vy: number })[] = [];
  private tracksPool: PIXI.Graphics[] = [];
  private meteors: (PIXI.Graphics & { vx: number; vy: number })[] = [];
  private steamPool: (PIXI.Graphics & { vx: number; vy: number })[] = [];

  constructor(container: HTMLElement) {
    this.app = new PIXI.Application({
      resizeTo: container,
      backgroundColor: 0x1a0b08,
      antialias: true,
    });
    container.appendChild(this.app.view as any);

    this.app.stage.addChild(this.layerWorld);
    this.layerWorld.addChild(
      this.layerSky,
      this.layerStars,
      this.layerCelestial,
      this.layerMnt,
      this.layerDune,
      this.layerBaseBg,
      this.layerGround,
      this.layerTracks,
      this.layerObstacles,
      this.layerFgRocks,
      this.layerRover,
      this.layerBaseFg,
      this.layerDust,
      this.layerWeather,
    );

    this.initGraphics();
  }

  private initGraphics() {
    const width = this.app.screen.width;
    const height = this.app.screen.height;

    // Sky
    this.skyBox = new PIXI.Graphics();
    this.skyBox.beginFill(0xffffff);
    this.skyBox.drawRect(0, 0, width, height);
    this.skyBox.endFill();
    this.layerSky.addChild(this.skyBox);

    // Stars
    for (let i = 0; i < 250; i++) {
      const star = new PIXI.Graphics();
      star.beginFill(0xffffff, Math.random() * 0.8 + 0.2);
      star.drawCircle(0, 0, Math.random() * 1.5);
      star.endFill();
      star.x = Math.random() * width;
      star.y = Math.random() * (height * 0.55);
      this.layerStars.addChild(star);
    }

    // Celestial Bodies
    this.sunGfx = new PIXI.Graphics();
    this.sunGfx.beginFill(0xffddaa, 1);
    this.sunGfx.drawCircle(0, 0, 25);
    this.sunGfx.endFill();
    this.sunGfx.beginFill(0xffaa55, 0.4);
    this.sunGfx.drawCircle(0, 0, 60);
    this.sunGfx.endFill();
    this.layerCelestial.addChild(this.sunGfx);

    this.phobosGfx = new PIXI.Graphics();
    this.phobosGfx.beginFill(0x888888);
    this.phobosGfx.drawCircle(0, 0, 8);
    this.phobosGfx.endFill();
    this.layerCelestial.addChild(this.phobosGfx);

    // Parallax Landscapes (Mountains, Dunes)
    for (let i = 0; i < 2; i++) {
      const m = this.generateTerrain(this.hexColor("#4a1f18"), 0.45, 250);
      m.x = i * width;
      this.layerMnt.addChild(m);
      this.mountains.push(m);
    }
    for (let i = 0; i < 2; i++) {
      const d = this.generateTerrain(this.hexColor("#8a3324"), 0.65, 120);
      d.x = i * width;
      this.layerDune.addChild(d);
      this.dunes.push(d);
    }

    // Ground
    this.groundGfx = new PIXI.Graphics();
    this.groundGfx.beginFill(0xffffff);
    this.groundGfx.drawRect(0, height - 120, width, 120);
    this.groundGfx.endFill();
    this.groundGfx.tint = this.hexColor("#cc7052");
    this.layerGround.addChild(this.groundGfx);

    // Foreground Rocks
    for (let i = 0; i < 5; i++) {
      const r = new PIXI.Graphics();
      r.beginFill(this.hexColor("#5c2a21"));
      r.drawCircle(0, 0, Math.random() * 20 + 10);
      r.endFill();
      r.x = Math.random() * width;
      r.y = height - Math.random() * 50 - 10;
      r.scale.y = 0.5;
      this.layerFgRocks.addChild(r);
      this.fgRocks.push(r);
    }

    // Airlock Garage Base Setup
    this.baseAirlock = new PIXI.Container();
    const backWall = new PIXI.Graphics();
    backWall.beginFill(0x110a08);
    backWall.drawRect(0, 0, width, height);
    backWall.endFill();

    const floorP = new PIXI.Graphics();
    floorP.beginFill(0x241411);
    floorP.drawRect(0, height - 140, width, 140);
    floorP.endFill();

    const panel = new PIXI.Graphics();
    panel.beginFill(0x1f120e);
    panel.lineStyle(2, 0x5c2a21);
    panel.drawRect(width * 0.1, height * 0.15, width * 0.8, height * 0.7);
    panel.lineStyle(0);
    panel.beginFill(0xcc7052, 0.15);
    for (let stripe = 0; stripe < width; stripe += 60) {
      panel.drawPolygon([
        stripe,
        height * 0.15,
        stripe + 25,
        height * 0.15,
        stripe + 55,
        height * 0.85,
        stripe + 30,
        height * 0.85,
      ]);
    }
    panel.endFill();

    this.baseAirlock.addChild(backWall, floorP, panel);
    this.layerBaseBg.addChild(this.baseAirlock);

    // Create & Mount Rover
    this.rover = this.createRover();
    this.rover.x = width * 0.25;
    this.rover.y = height - 120;
    this.layerRover.addChild(this.rover);

    // Environmental Wind / Regolith particles
    for (let i = 0; i < 120; i++) {
      const p = new PIXI.Graphics() as any;
      p.beginFill(this.hexColor("#e89b71"), Math.random() * 0.5);
      p.drawCircle(0, 0, Math.random() * 2 + 1);
      p.endFill();
      p.x = Math.random() * width;
      p.y = Math.random() * height;
      p.baseVx = -(Math.random() * 4 + 1);
      p.baseVy = Math.random() - 0.5;
      this.envParticles.push(p);
      this.layerWeather.addChild(p);
    }
  }

  private generateTerrain(color: number, heightRatio: number, variance: number): PIXI.Graphics {
    const g = new PIXI.Graphics();
    const w = this.app.screen.width;
    const h = this.app.screen.height;
    const baseY = h * heightRatio;

    g.beginFill(color);
    g.moveTo(0, h);
    g.lineTo(0, baseY);

    const pts = 20;
    const step = w / pts;
    for (let i = 1; i <= pts; i++) {
      g.lineTo(
        i * step,
        baseY -
          (Math.sin(i * 0.8) * variance * 0.5 + Math.cos(i * 1.3) * variance * 0.5) -
          variance / 2,
      );
    }
    g.lineTo(w, h);
    g.endFill();
    return g;
  }

  private createRover(): PIXI.Container {
    const r = new PIXI.Container() as any;
    const body = new PIXI.Graphics();
    body.beginFill(0x3d3c3a);
    body.lineStyle(2, 0x111111);
    body.moveTo(15, -25);
    body.lineTo(130, -25);
    body.lineTo(150, 15);
    body.lineTo(-10, 15);
    body.closePath();
    body.endFill();

    const glass = new PIXI.Graphics();
    glass.beginFill(this.hexColor("#e89b71"), 0.8);
    glass.moveTo(125, -20);
    glass.lineTo(142, 5);
    glass.lineTo(90, 5);
    glass.lineTo(90, -20);
    glass.closePath();
    glass.endFill();

    const beacon = new PIXI.Graphics();
    beacon.beginFill(0x44ffaa, 1);
    beacon.drawCircle(40, -32, 4);
    beacon.endFill();
    r.beacon = beacon;

    const beam = new PIXI.Graphics();
    beam.beginFill(0xffddaa, 0.4);
    beam.moveTo(145, 5);
    beam.lineTo(800, -100);
    beam.lineTo(800, 100);
    beam.lineTo(145, 15);
    beam.closePath();
    beam.endFill();
    beam.blendMode = PIXI.BLEND_MODES.ADD;
    beam.alpha = 0;
    r.beam = beam;

    const drawW = (x: number, y: number) => {
      const w = new PIXI.Container();
      const t = new PIXI.Graphics();
      t.beginFill(0x1a1a1a);
      t.lineStyle(4, 0x000000);
      t.drawCircle(0, 0, 18);
      t.endFill();

      const h = new PIXI.Graphics();
      h.beginFill(0x888888);
      h.drawRect(-2, -18, 4, 36);
      h.drawRect(-18, -2, 36, 4);
      h.endFill();

      w.addChild(t, h);
      w.x = x;
      w.y = y;
      return w;
    };

    const w1 = drawW(15, 15);
    const w2 = drawW(70, 15);
    const w3 = drawW(125, 15);

    r.addChild(beam, body, glass, beacon, w1, w2, w3);
    r.wheels = [w1, w2, w3];
    return r;
  }

  public triggerAirlockOpen(onComplete: () => void) {
    let doorMove = 0;
    const anim = setInterval(() => {
      this.baseAirlock.y -= 5;
      doorMove += 5;
      if (Math.random() < 0.4) this.spawnSteam();
      if (doorMove > this.app.screen.height) {
        clearInterval(anim);
        this.baseAirlock.visible = false;
        this.clearSteam();
        onComplete();
      }
    }, 16);
  }

  public triggerAirlockClose(onComplete: () => void) {
    this.baseAirlock.y = -this.app.screen.height;
    this.baseAirlock.visible = true;
    let doorMove = this.app.screen.height;
    const anim = setInterval(() => {
      this.baseAirlock.y += 5;
      doorMove -= 5;
      if (Math.random() < 0.3) this.spawnSteam();
      if (doorMove <= 0) {
        clearInterval(anim);
        this.baseAirlock.y = 0;
        this.clearSteam();
        onComplete();
      }
    }, 16);
  }

  private spawnSteam() {
    const s = new PIXI.Graphics() as any;
    s.beginFill(0xfff5eb, 0.4);
    s.drawCircle(0, 0, Math.random() * 15 + 5);
    s.endFill();
    s.x = this.app.screen.width * 0.15 + Math.random() * (this.app.screen.width * 0.7);
    s.y = this.app.screen.height * 0.2;
    s.vx = Math.random() - 0.5;
    s.vy = Math.random() * 3 + 1;
    s.alpha = 1;
    this.steamPool.push(s);
    this.layerBaseFg.addChild(s);
  }

  private clearSteam() {
    for (const s of this.steamPool) {
      this.layerBaseFg.removeChild(s);
    }
    this.steamPool = [];
  }

  private spawnMeteor() {
    const m = new PIXI.Graphics() as any;
    m.lineStyle(2, 0xffffff, 0.8);
    m.moveTo(0, 0);
    m.lineTo(20, 20);
    m.x = Math.random() * (this.app.screen.width * 0.8) + this.app.screen.width * 0.2;
    m.y = -20;
    m.vx = -(12 + Math.random() * 10);
    m.vy = 12 + Math.random() * 10;
    m.alpha = 1;
    this.meteors.push(m);
    this.layerCelestial.addChild(m);
  }

  private spawnDust() {
    const p = new PIXI.Graphics() as any;
    p.beginFill(this.hexColor("#e89b71"), 0.6);
    p.drawCircle(0, 0, Math.random() * 8 + 3);
    p.endFill();
    p.x = this.rover.x - 10 + (Math.random() - 0.5) * 15;
    p.y = this.rover.y + 20 + (Math.random() - 0.5) * 5;
    p.vx = -(Math.random() * 3 + 2);
    p.vy = -(Math.random() * 2);
    p.alpha = 1;
    this.dustPool.push(p);
    this.layerDust.addChild(p);
  }

  public update(state: GameState) {
    const delta = this.app.ticker.deltaTime;
    const isMoving = state.isDriving && state.resources.power > 0 && state.mode === "travel";

    // Particle engines
    const stormMult = state.weather === "dust_storm" ? 4 : 1;
    for (const p of this.envParticles) {
      p.x += p.baseVx * delta * stormMult;
      p.y += p.baseVy * delta * (stormMult > 1 ? 3 : 1);
      if (p.x < 0) p.x = this.app.screen.width;
      if (p.y > this.app.screen.height) p.y = 0;
      if (p.y < 0) p.y = this.app.screen.height;
    }

    // Steam vents
    for (let i = this.steamPool.length - 1; i >= 0; i--) {
      const s = this.steamPool[i];
      s.x += s.vx;
      s.y += s.vy;
      s.alpha -= 0.01;
      s.scale.x += 0.05;
      s.scale.y += 0.05;
      if (s.alpha <= 0) {
        this.layerBaseFg.removeChild(s);
        this.steamPool.splice(i, 1);
      }
    }

    if (state.mode !== "travel") return;

    // Dust particles
    for (let i = this.dustPool.length - 1; i >= 0; i--) {
      const p = this.dustPool[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.alpha -= 0.02 * delta;
      p.scale.x += 0.05;
      p.scale.y += 0.05;
      if (p.alpha <= 0) {
        this.layerDust.removeChild(p);
        this.dustPool.splice(i, 1);
      }
    }

    // Tire tracks
    for (let i = this.tracksPool.length - 1; i >= 0; i--) {
      const speed = (CONSTANTS.BASE_SPEED / 60) * delta * state.pace * state.terrain.speed;
      this.tracksPool[i].x -= speed * 0.4;
      this.tracksPool[i].alpha -= 0.005 * delta;
      if (this.tracksPool[i].alpha <= 0) {
        this.layerTracks.removeChild(this.tracksPool[i]);
        this.tracksPool.splice(i, 1);
      }
    }

    // Meteors
    for (let i = this.meteors.length - 1; i >= 0; i--) {
      const m = this.meteors[i];
      m.x += m.vx * delta;
      m.y += m.vy * delta;
      m.alpha -= 0.02 * delta;
      if (m.alpha <= 0) {
        this.layerCelestial.removeChild(m);
        this.meteors.splice(i, 1);
      }
    }

    // Sky Lerps & Celestial Bodies Tracking
    const cSine = (Math.sin(state.dayCycle * Math.PI * 2 - Math.PI / 2) + 1) / 2;
    this.sunGfx.x = this.app.screen.width * state.dayCycle;
    this.sunGfx.y =
      this.app.screen.height * 0.6 -
      Math.sin(state.dayCycle * Math.PI) * (this.app.screen.height * 0.4);
    this.phobosGfx.x = this.app.screen.width * ((state.dayCycle * 2.5) % 1);
    this.phobosGfx.y =
      this.app.screen.height * 0.5 -
      Math.sin(((state.dayCycle * 2.5) % 1) * Math.PI) * (this.app.screen.height * 0.3);

    if (state.weather === "dust_storm") {
      this.skyBox.tint = this.hexColor("#3a1511");
      this.layerStars.alpha = 0;
      this.rover.beam!.alpha = 0.8;
      this.layerCelestial.alpha = 0;
    } else {
      this.skyBox.tint = this.lerpColor(this.hexColor("#5c2a21"), this.hexColor("#0a0504"), cSine);
      this.layerStars.alpha = cSine;
      this.rover.beam!.alpha = cSine;
      this.layerCelestial.alpha = 1;
      this.phobosGfx.alpha = cSine;
      this.sunGfx.alpha = 1 - cSine;
      if (cSine > 0.8 && Math.random() < 0.005 * delta) {
        this.spawnMeteor();
      }
    }

    // Rover motion
    this.rover.y =
      this.app.screen.height -
      120 +
      (isMoving ? Math.sin(Date.now() / (100 / state.pace)) * (2 * state.pace) : 0);
    this.rover.beacon!.tint = isMoving ? 0x44ffaa : 0xff4444;
    this.groundGfx.tint = this.lerpColor(
      this.groundGfx.tint,
      this.hexColor(state.terrain.color),
      0.02 * delta,
    );

    if (isMoving) {
      const speed = (CONSTANTS.BASE_SPEED / 60) * delta * state.pace * state.terrain.speed;

      // Parallax shifts
      for (const m of this.mountains) {
        m.x -= speed * 0.15;
        if (m.x <= -this.app.screen.width) m.x = this.app.screen.width - 5;
      }
      for (const d of this.dunes) {
        d.x -= speed * 0.5;
        if (d.x <= -this.app.screen.width) d.x = this.app.screen.width - 5;
      }
      for (const r of this.fgRocks) {
        r.x -= speed * 1.5;
        if (r.x <= -50) {
          r.x = this.app.screen.width + 50;
          r.y = this.app.screen.height - Math.random() * 50 - 10;
        }
      }

      // Wheel rotations
      if (this.rover.wheels) {
        for (const w of this.rover.wheels) {
          w.rotation += 0.2 * state.pace * delta;
        }
      }

      if (Math.random() < 0.4 * state.pace && state.weather !== "dust_storm") {
        this.spawnDust();
      }

      // Live Track footprints creation
      if (Date.now() % 100 < 40) {
        const track = new PIXI.Graphics();
        track.beginFill(0x1a0b08, 0.4);
        track.drawRect(0, 0, 18, 6);
        track.endFill();
        track.x = this.rover.x + 20;
        track.y = this.rover.y + 32;
        this.layerTracks.addChild(track);
        this.tracksPool.push(track);
      }

      // Camera Shake Mechanics
      let shakeMag = 0;
      if (state.pace > 1) shakeMag += (state.pace - 1) * 2;
      if (state.terrain.name === "Boulder Field") shakeMag += 2.5;
      if (this.layerWorld) {
        if (shakeMag > 0) {
          this.layerWorld.x = (Math.random() - 0.5) * shakeMag;
          this.layerWorld.y = (Math.random() - 0.5) * shakeMag;
        } else {
          this.layerWorld.x = 0;
          this.layerWorld.y = 0;
        }
      }
    }
  }

  public resize() {
    this.app.resize();
  }

  public destroy() {
    this.app.destroy(true, { children: true, texture: true, baseTexture: true });
  }

  private hexColor(str: string): number {
    return Number.parseInt(str.replace("#", "0x"));
  }

  private lerpColor(a: number, b: number, amt: number): number {
    const ar = a >> 16;
    const ag = (a >> 8) & 0xff;
    const ab = a & 0xff;
    const br = b >> 16;
    const bg = (b >> 8) & 0xff;
    const bb = b & 0xff;
    return (
      ((ar + amt * (br - ar)) << 16) +
      ((ag + amt * (bg - ag)) << 8) +
      Math.floor(ab + amt * (bb - ab))
    );
  }
}
