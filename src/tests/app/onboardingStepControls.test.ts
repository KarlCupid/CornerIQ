import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { BodyMassStep } from "../../app/screens/onboarding/steps/BodyMassStep";
import { ChipButton } from "../../app/screens/onboarding/steps/StepControls";
import { createDefaultOnboardingDraft, type OnboardingDraft } from "../../services/supabase/onboardingService";
import { fixtureAsOfDate } from "../fixtures/engineFixtures";

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

type PressableTestInstance = {
  props: Record<string, unknown>;
};

type InputTestInstance = {
  props: Record<string, unknown>;
};

function render(element: React.ReactElement): ReactTestRenderer {
  let renderer: ReactTestRenderer | null = null;
  act(() => {
    renderer = create(element);
  });
  if (!renderer) {
    throw new Error("render failed");
  }
  return renderer;
}

function outputText(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

function firstPressable(renderer: ReactTestRenderer): PressableTestInstance {
  const [pressable] = renderer.root.findAllByType("Pressable") as PressableTestInstance[];
  if (!pressable) {
    throw new Error("Pressable not found");
  }
  return pressable;
}

function pressableAt(renderer: ReactTestRenderer, index: number): PressableTestInstance {
  const pressable = (renderer.root.findAllByType("Pressable") as PressableTestInstance[])[index];
  if (!pressable) {
    throw new Error(`Pressable ${index} not found`);
  }
  return pressable;
}

function textInputAt(renderer: ReactTestRenderer, index: number): InputTestInstance {
  const input = (renderer.root.findAllByType("TextInput") as InputTestInstance[])[index];
  if (!input) {
    throw new Error(`TextInput ${index} not found`);
  }
  return input;
}

function flattenStyle(style: unknown): Record<string, unknown> {
  const styleItems = Array.isArray(style) ? style : [style];
  return styleItems.filter(Boolean).reduce<Record<string, unknown>>((merged, item) => ({ ...merged, ...(item as Record<string, unknown>) }), {});
}

function renderedStyle(pressable: PressableTestInstance, pressed = false): Record<string, unknown> {
  const style = pressable.props.style;
  if (typeof style !== "function") {
    throw new Error("Pressable style callback missing");
  }
  return flattenStyle(style({ pressed }));
}

describe("onboarding step controls", () => {
  it("makes hovered and focused option boxes visibly distinct from their idle outline", () => {
    const renderer = render(React.createElement(ChipButton, { active: false, label: "Amateur boxer", onPress: vi.fn() }));
    const idleStyle = renderedStyle(firstPressable(renderer));

    act(() => {
      const onHoverIn = firstPressable(renderer).props.onHoverIn;
      if (typeof onHoverIn !== "function") {
        throw new Error("hover handler missing");
      }
      onHoverIn();
    });
    const hoveredStyle = renderedStyle(firstPressable(renderer));

    act(() => {
      const pressable = firstPressable(renderer);
      if (typeof pressable.props.onHoverOut !== "function" || typeof pressable.props.onFocus !== "function") {
        throw new Error("focus handlers missing");
      }
      pressable.props.onHoverOut();
      pressable.props.onFocus();
    });
    const focusedStyle = renderedStyle(firstPressable(renderer));

    expect(hoveredStyle.borderColor).toBe("rgba(232, 240, 255, 0.36)");
    expect(hoveredStyle.backgroundColor).toBe("rgba(169, 185, 207, 0.12)");
    expect(hoveredStyle.boxShadow).toContain("rgba(169, 185, 207");
    expect(hoveredStyle.borderColor).not.toBe(idleStyle.borderColor);
    expect(focusedStyle.borderColor).toBe(hoveredStyle.borderColor);
  });

  it("switches onboarding body-mass inputs and examples when display units change", () => {
    const latestDraft: { current: OnboardingDraft | null } = { current: null };

    function Probe() {
      const [draft, setDraft] = React.useState<OnboardingDraft>(() => ({
        ...createDefaultOnboardingDraft(fixtureAsOfDate),
        bodyMass: {
          currentBodyMassKg: 82,
          heightCm: 178,
          preferredUnits: "metric",
          typicalWalkAroundWeightKg: 84
        }
      }));
      latestDraft.current = draft;

      return React.createElement(BodyMassStep, {
        draft,
        setStepError: vi.fn(),
        updateDraft: (updater: (current: OnboardingDraft) => OnboardingDraft) => setDraft(updater)
      });
    }

    const renderer = render(React.createElement(Probe));
    expect(outputText(renderer)).toContain("Current body weight (kg)");
    expect(outputText(renderer)).toContain("Example: 82");
    expect(outputText(renderer)).toContain("Height (cm)");

    act(() => {
      const onPress = pressableAt(renderer, 1).props.onPress;
      if (typeof onPress !== "function") {
        throw new Error("Imperial unit button missing press handler");
      }
      onPress();
    });

    const output = outputText(renderer);
    expect(output).toContain("Current body weight (lb)");
    expect(output).toContain("Example: 180");
    expect(output).toContain("Typical walk-around body weight (lb)");
    expect(output).toContain("Height (in)");
    expect(output).toContain("Example: 70");
    expect(textInputAt(renderer, 0).props.value).toBe("180.8");
    expect(textInputAt(renderer, 2).props.value).toBe("70.1");

    act(() => {
      const onChangeText = textInputAt(renderer, 0).props.onChangeText;
      if (typeof onChangeText !== "function") {
        throw new Error("Current body-mass input missing change handler");
      }
      onChangeText("180");
    });
    if (!latestDraft.current) {
      throw new Error("Draft state was not captured");
    }
    expect(latestDraft.current.bodyMass.currentBodyMassKg).toBeCloseTo(81.647, 3);
  });
});
