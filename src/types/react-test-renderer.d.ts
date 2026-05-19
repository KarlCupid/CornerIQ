declare module "react-test-renderer" {
  import type { ReactElement } from "react";

  export interface ReactTestRenderer {
    toJSON(): unknown;
  }

  export function create(element: ReactElement): ReactTestRenderer;
  export function act(callback: () => void): void;
}
