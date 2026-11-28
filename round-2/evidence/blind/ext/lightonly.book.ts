// Sets a light token only; under the old moods dark extends light and inherits it.
export default {
  name: "lightonly",
  version: "1.0.0",
  extends: { preset: "shadcn", version: "1.1.0" },
  apply({ light, rules }) {
    light.set("chart-1", rules.color("#123456"));
  },
};
