import type { DeputadoSexo } from "@vota-comigo/shared-types";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import { DeputadoSexoControl } from "../deputado-sexo-control";

function render(
  sexo: DeputadoSexo | null,
  onChange: (sexo: DeputadoSexo | null) => void = () => {},
): string {
  return renderToStaticMarkup(
    createElement(DeputadoSexoControl, { onChange, sexo }),
  );
}

describe("DeputadoSexoControl", () => {
  describe("when listing the options", () => {
    it("spells out both options under a labelled group", () => {
      // Act
      const html = render(null);

      // Assert
      expect(html).toContain("Feminino");
      expect(html).toContain("Masculino");
      expect(html).toContain("Filtrar por sexo");
      expect(html).toContain('role="group"');
    });

    it("marks nothing as pressed", () => {
      // Act
      const html = render(null);

      // Assert
      expect(html).not.toContain('aria-pressed="true"');
    });
  });

  describe("when one option is selected", () => {
    it("marks only that option as pressed", () => {
      // Act
      const html = render("F");

      // Assert
      const pressed = html.match(/aria-pressed="true"/g) ?? [];
      expect(pressed).toHaveLength(1);
      expect(html).toMatch(/aria-pressed="true"[^>]*>Feminino</);
    });
  });

  describe("when the selected option is clicked again", () => {
    it("clears the filter instead of keeping it", () => {
      // Arrange
      const onChange = vi.fn();
      const control = DeputadoSexoControl({ onChange, sexo: "F" });
      const chipGroup = control as unknown as {
        props: { onToggle: (valor: DeputadoSexo) => void };
      };

      // Act
      chipGroup.props.onToggle("F");

      // Assert
      expect(onChange).toHaveBeenCalledWith(null);
    });

    it("replaces the selection when the other option is clicked", () => {
      // Arrange
      const onChange = vi.fn();
      const control = DeputadoSexoControl({ onChange, sexo: "F" });
      const chipGroup = control as unknown as {
        props: { onToggle: (valor: DeputadoSexo) => void };
      };

      // Act
      chipGroup.props.onToggle("M");

      // Assert
      expect(onChange).toHaveBeenCalledWith("M");
    });
  });
});
