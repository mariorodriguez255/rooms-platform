import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Home page", () => {
  it("shows the product name and tagline in Spanish", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "rooms-platform" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Sigue publicando en idealista/),
    ).toBeInTheDocument();
  });
});
