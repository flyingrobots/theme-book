export default {
  name: "school",
  version: "1.0.0",
  extends: { preset: "shadcn", version: "1.0.0" },
  apply({ dark, rules }) {
    dark.set("background", rules.closest(rules.color("oklch(0.145 0 0)"), rules.ref("neutrals")));
  },
};
