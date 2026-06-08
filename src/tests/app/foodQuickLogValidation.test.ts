import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import type { QuickLogActions } from "../../hooks/useQuickLogs";
import { validateFoodLogEnergy } from "../../engine/nutrition/foodLogEnergyValidation";

vi.mock("react-native", () => {
  const component =
    (name: string) =>
    ({ children, ...props }: { children?: React.ReactNode }) =>
      React.createElement(name, props, children);
  return {
    Pressable: component("Pressable"),
    Text: component("Text"),
    TextInput: component("TextInput"),
    View: component("View")
  };
});

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function quickLogActions(): QuickLogActions {
  return {
    logBodyMass: vi.fn(),
    logReadiness: vi.fn(),
    logCycle: vi.fn(),
    validateFoodEnergy: validateFoodLogEnergy,
    logFood: vi.fn(),
    logHydration: vi.fn(),
    markFoodStillLoggingToday: vi.fn(),
    markFoodDoneLoggingToday: vi.fn(),
    markFoodNotTrackingToday: vi.fn(),
    logProtectedWorkout: vi.fn()
  };
}

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(element);
  });
  if (!renderer) {
    throw new Error("renderer did not initialize");
  }
  return renderer;
}

function changeInput(renderer: ReactTestRenderer, placeholder: string, value: string): void {
  const input = renderer.root.findAllByType("TextInput").find((item) => item.props.placeholder === placeholder);
  if (!input) {
    throw new Error(`missing input ${placeholder}`);
  }
  (input.props as { onChangeText: (nextValue: string) => void }).onChangeText(value);
}

async function pressLogFood(renderer: ReactTestRenderer): Promise<void> {
  const button = renderer.root.findAllByType("Pressable")[0];
  if (!button) {
    throw new Error("missing food button");
  }
  await (button.props as { onPress: () => Promise<void> | void }).onPress();
}

describe("FoodQuickLogCard macro energy validation", () => {
  it("blocks impossible calories and macros before calling logFood", async () => {
    const { FoodQuickLogCard } = await import("../../app/screens/logging/LogCards");
    const actions = quickLogActions();
    const renderer = render(React.createElement(FoodQuickLogCard, { actions, busy: false }));

    act(() => {
      changeInput(renderer, "Calories", "5");
      changeInput(renderer, "Protein g", "500");
      changeInput(renderer, "Carbs g", "0");
      changeInput(renderer, "Fat g", "0");
    });

    await act(async () => {
      await pressLogFood(renderer);
    });

    expect(actions.logFood).not.toHaveBeenCalled();
    expect(JSON.stringify(renderer.toJSON())).toContain("protein/carbs/fat estimate 2000 kcal");
  });
});
