import { vi } from 'vitest';

class Vector2 {
  x: number;
  y: number;
  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }
  set(x: number, y: number): this {
    this.x = x;
    this.y = y;
    return this;
  }
  copy(v: { x: number; y: number }): this {
    this.x = v.x;
    this.y = v.y;
    return this;
  }
  lengthSq(): number {
    return this.x * this.x + this.y * this.y;
  }
}

class ContainerStub {
  scene: any;
  x: number;
  y: number;
  width: number = 0;
  height: number = 0;
  visible: boolean = true;
  active: boolean = true;
  list: any[] = [];
  destroyed: boolean = false;
  constructor(scene: any, x: number = 0, y: number = 0) {
    this.scene = scene;
    this.x = x;
    this.y = y;
  }
  add(child: any) {
    this.list.push(child);
    return this;
  }
  setSize(w: number, h: number) {
    this.width = w;
    this.height = h;
    return this;
  }
  setVisible(v: boolean) {
    this.visible = v;
    return this;
  }
  setActive(a: boolean) {
    this.active = a;
    return this;
  }
  destroy() {
    this.destroyed = true;
  }
}

export function createGraphicsStub() {
  return {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    fillCircle: vi.fn(),
    lineStyle: vi.fn(),
    strokeRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    arc: vi.fn(),
    closePath: vi.fn(),
    fillPath: vi.fn(),
    destroy: vi.fn()
  };
}

export function createTextStub(text: string = '') {
  const stub: any = {
    text,
    visible: true,
    setOrigin: vi.fn().mockReturnThis(),
    setStroke: vi.fn().mockReturnThis(),
    setVisible: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    setScrollFactor: vi.fn().mockReturnThis(),
    setText: vi.fn(function (this: any, t: string) {
      this.text = t;
      return this;
    }),
    destroy: vi.fn()
  };
  return stub;
}

export function createKey(): any {
  return { isDown: false };
}

export function createCursorKeys(): any {
  return {
    up: createKey(),
    down: createKey(),
    left: createKey(),
    right: createKey(),
    space: createKey(),
    shift: createKey()
  };
}

export function createSceneStub() {
  const wasdKeys = { W: createKey(), A: createKey(), S: createKey(), D: createKey() };
  const keyboardListeners: Record<string, Array<(...args: any[]) => void>> = {};
  const cursorKeys = createCursorKeys();
  const scene: any = {
    add: {
      graphics: vi.fn(() => createGraphicsStub()),
      text: vi.fn((_x: number, _y: number, str: string) => createTextStub(str)),
      existing: vi.fn()
    },
    cameras: {
      main: { width: 896, height: 1112 }
    },
    input: {
      keyboard: {
        enabled: true,
        createCursorKeys: vi.fn(() => cursorKeys),
        addKeys: vi.fn((_keys: string) => wasdKeys),
        on: vi.fn((evt: string, fn: (...args: any[]) => void) => {
          (keyboardListeners[evt] ||= []).push(fn);
        }),
        once: vi.fn((evt: string, fn: (...args: any[]) => void) => {
          (keyboardListeners[evt] ||= []).push(fn);
        })
      },
      on: vi.fn(),
      once: vi.fn()
    },
    _wasdKeys: wasdKeys,
    _cursorKeys: cursorKeys,
    _emit(event: string, ...args: any[]) {
      (keyboardListeners[event] || []).forEach(fn => fn(...args));
    }
  };
  return scene;
}

const phaserMock = {
  AUTO: 0,
  Scene: class {
    constructor(_config: any) {}
  },
  GameObjects: {
    Container: ContainerStub,
    Graphics: class {},
    Text: class {}
  },
  Math: {
    Vector2,
    Distance: {
      Between(x1: number, y1: number, x2: number, y2: number): number {
        return Math.hypot(x1 - x2, y1 - y2);
      }
    }
  },
  Utils: {
    Array: {
      Shuffle<T>(arr: T[]): T[] {
        return arr;
      },
      GetRandom<T>(arr: T[]): T {
        return arr[0];
      }
    }
  },
  Game: class {
    constructor(_config: any) {}
  },
  Types: {} as any
};

export default phaserMock;
