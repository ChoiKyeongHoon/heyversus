import "@testing-library/jest-dom";

import { createElement } from "react";

jest.mock("next/image", () => {
  return function MockedNextImage({ alt, ...props }: { alt: string; [key: string]: unknown }) {
    return createElement("img", { alt, ...props });
  };
});
