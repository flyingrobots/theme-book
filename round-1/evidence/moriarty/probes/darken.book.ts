export default {
  name: "darken",
  version: "1.0.0",
  extends: { preset: "shadcn", version: "1.1.0" },
  apply({ light, rules }) {
    light.set("primary", rules.color("#a0a0ff"));
  },
};
