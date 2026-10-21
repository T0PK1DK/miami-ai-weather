type Drop = {
  x: number;
  y: number;
  len: number;
  speed: number;
  drift: number;
  alpha: number;
};

export type ParticleWeather = {
  precipInPerHour: number;
  windMph: number;
  windDir: number;
  isWet: boolean;
};

export class RainField {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private drops: Drop[] = [];
  private weather: ParticleWeather = { precipInPerHour: 0, windMph: 0, windDir: 90, isWet: false };
  private raf = 0;
  private last = 0;
  private running = false;
  private reduceMotion = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    this.ctx = ctx;
    this.reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.resize();
  }

  setWeather(weather: ParticleWeather): void {
    this.weather = weather;
    this.seed(this.targetCount());
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    if (this.reduceMotion) {
      this.ctx.clearRect(0, 0, this.canvas.clientWidth, this.canvas.clientHeight);
      return;
    }
    this.last = performance.now();
    const tick = (t: number) => {
      if (!this.running) return;
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.step(dt);
      this.draw();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  resize(): void {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.seed(this.targetCount());
  }

  private targetCount(): number {
    if (this.reduceMotion) return 0;
    const inches = this.weather.precipInPerHour;
    if (!this.weather.isWet && inches < 0.01) return 18;
    const n = 40 + inches * 900;
    return Math.max(20, Math.min(280, Math.round(n)));
  }

  private seed(count: number): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.drops = Array.from({ length: count }, () => this.spawn(w, h, true));
  }

  private spawn(w: number, h: number, anywhere: boolean): Drop {
    const intensity = Math.min(1, this.weather.precipInPerHour / 0.4);
    return {
      x: Math.random() * (w + 80) - 40,
      y: anywhere ? Math.random() * h : -20 - Math.random() * 40,
      len: 8 + intensity * 18 + Math.random() * 10,
      speed: 280 + intensity * 420 + Math.random() * 120,
      drift: (this.weather.windMph / 12) * Math.sin((this.weather.windDir * Math.PI) / 180),
      alpha: 0.18 + intensity * 0.45
    };
  }

  private step(dt: number): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const want = this.targetCount();
    if (this.drops.length < want) this.drops.push(this.spawn(w, h, false));
    if (this.drops.length > want) this.drops.length = want;
    for (const drop of this.drops) {
      drop.y += drop.speed * dt;
      drop.x += drop.drift * drop.speed * dt * 0.25;
      if (drop.y > h + 20 || drop.x < -60 || drop.x > w + 60) {
        Object.assign(drop, this.spawn(w, h, false));
      }
    }
  }

  private draw(): void {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.ctx.clearRect(0, 0, w, h);
    this.ctx.strokeStyle = "rgba(186, 230, 253, 0.75)";
    this.ctx.lineWidth = 1.15;
    this.ctx.lineCap = "round";
    for (const drop of this.drops) {
      this.ctx.globalAlpha = drop.alpha;
      this.ctx.beginPath();
      this.ctx.moveTo(drop.x, drop.y);
      this.ctx.lineTo(drop.x + drop.drift * drop.len, drop.y + drop.len);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }
}
