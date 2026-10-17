import axe from "axe-core";

export const axeViolations = async (container: Element) => {
  const results = await axe.run(container, { rules: { "color-contrast": { enabled: false } } });
  return results.violations.map(({ id, help }) => `${id}: ${help}`);
};
