import { expect, type Page, test } from "@playwright/test";

interface MockGamepadConfig {
  readonly hasHaptics: boolean;
  readonly id: string;
  readonly index: number;
}

declare global {
  interface Window {
    __qrtGamepadMock: {
      calls: () => unknown[];
      clear: () => void;
      setGamepads: (gamepads: MockGamepadConfig[]) => void;
    };
  }
}

async function installGamepadMock(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const calls: unknown[] = [];
    const slots: unknown[] = [];

    function makeGamepad(gamepad: {
      readonly hasHaptics: boolean;
      readonly id: string;
      readonly index: number;
    }) {
      const vibrationActuator = gamepad.hasHaptics
        ? {
            playEffect(type: string, params: unknown) {
              calls.push({ index: gamepad.index, params, type });
              return Promise.resolve("complete");
            },
            reset() {
              calls.push({ index: gamepad.index, type: "reset" });
              return Promise.resolve("complete");
            }
          }
        : null;

      return {
        axes: [],
        buttons: [],
        connected: true,
        id: gamepad.id,
        index: gamepad.index,
        mapping: "standard",
        timestamp: performance.now(),
        vibrationActuator
      };
    }

    Object.defineProperty(navigator, "getGamepads", {
      configurable: true,
      value: () => slots.slice()
    });

    window.__qrtGamepadMock = {
      calls: () => calls.slice(),
      clear: () => {
        slots.length = 0;
        window.dispatchEvent(new Event("gamepaddisconnected"));
      },
      setGamepads: (gamepads) => {
        slots.length = 0;
        for (const gamepad of gamepads) {
          slots[gamepad.index] = makeGamepad(gamepad);
        }
        window.dispatchEvent(new Event("gamepadconnected"));
      }
    };
  });
}

test.beforeEach(async ({ page }) => {
  await installGamepadMock(page);
});

test("scan discovers a haptic gamepad that appears after polling starts", async ({
  page
}) => {
  await page.goto("/app/");

  const panel = page.getByLabel("Gamepad output");
  await expect(panel).toContainText("0/0 haptic");

  await page.getByRole("button", { name: "Scan" }).click();
  await expect(panel).toContainText("scanning");

  await page.evaluate(() => {
    window.__qrtGamepadMock.setGamepads([
      { hasHaptics: true, id: "Xbox Wireless Controller", index: 0 }
    ]);
  });

  await expect(page.getByRole("combobox", { name: "Gamepad" })).toHaveValue("0");
  await expect(panel).toContainText("1/1 haptic");
  await expect(page.getByRole("button", { name: "Enable" })).toBeEnabled();
});

test("shows connected gamepads even when haptics are unavailable", async ({ page }) => {
  await page.goto("/app/");
  await page.evaluate(() => {
    window.__qrtGamepadMock.setGamepads([
      { hasHaptics: false, id: "DualSense Wireless Controller", index: 1 }
    ]);
  });

  const panel = page.getByLabel("Gamepad output");
  const select = page.getByRole("combobox", { name: "Gamepad" });
  await expect(select).toHaveValue("1");
  await expect(select).toContainText("DualSense Wireless Controller (no haptics)");
  await expect(panel).toContainText("0/1 haptic");
  await expect(page.getByRole("button", { name: "Enable" })).toBeDisabled();
});

test("enabled gamepad output can trigger a dual-rumble test pulse", async ({ page }) => {
  await page.goto("/app/");
  await page.evaluate(() => {
    window.__qrtGamepadMock.setGamepads([
      { hasHaptics: true, id: "Xbox Wireless Controller", index: 0 }
    ]);
  });

  const panel = page.getByLabel("Gamepad output");
  await page.getByRole("button", { name: "Enable" }).click();
  await expect(panel).toContainText("enabled");

  await page.getByRole("button", { name: "Test" }).click();

  await expect
    .poll(() => page.evaluate(() => window.__qrtGamepadMock.calls()))
    .toEqual([
      {
        index: 0,
        params: {
          duration: 220,
          startDelay: 0,
          strongMagnitude: 0.65,
          weakMagnitude: 0.4
        },
        type: "dual-rumble"
      }
    ]);
});

export {};
