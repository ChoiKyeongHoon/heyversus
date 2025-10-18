import "@testing-library/jest-dom";

import { createElement } from "react";

jest.mock("next/image", () => {
  return function MockedNextImage({ alt, ...props }) {
    return createElement("img", { alt, ...props });
  };
});
