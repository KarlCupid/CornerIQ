import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { ChipButton } from "../../app/screens/onboarding/steps/StepControls";

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

function firstPressable(renderer: ReactTestRenderer): PressableTestInstance {
  const [pressable] = renderer.root.findAllByType("Pressable") as PressableTestInstance[];
  if (!pressable) {
    throw new Error("Pressable not found");
  }
  return pressable;
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

    expect(hoveredStyle.borderColor).toBe("rgba(39, 206, 241, 0.64)");
    expect(hoveredStyle.backgroundColor).toBe("rgba(39, 206, 241, 0.11)");
    expect(hoveredStyle.boxShadow).toContain("rgba(39, 206, 241");
    expect(hoveredStyle.borderColor).not.toBe(idleStyle.borderColor);
    expect(focusedStyle.borderColor).toBe(hoveredStyle.borderColor);
  });
});
