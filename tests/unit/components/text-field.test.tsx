import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "@/components/forms/text-field";

import { renderWithIntl } from "../intl";

describe("TextField", () => {
  it("links the label, the help text and the translated error to the input", () => {
    renderWithIntl(
      <TextField
        name="password"
        label="Contraseña"
        description="Mínimo 12"
        error="passwordTooShort"
      />,
    );

    const input = screen.getByLabelText("Contraseña");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Mínimo 12 Mínimo 12 caracteres.",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Mínimo 12 caracteres.",
    );
  });

  it("is not marked invalid without an error", () => {
    renderWithIntl(<TextField name="email" label="Email" />);
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
