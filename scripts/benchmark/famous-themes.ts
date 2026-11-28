/**
 * Seven famous light/dark theme pairs, as their projects publish them. The benchmark for
 * src/derived.ts: given one side, how close does theme-book's other side land?
 *
 * Each value was checked against the source cited beside its theme on 2026-11-27.
 */
export type Side = { page: string; ink: string; primary: string; accents: string[] };
export interface FamousPair {
  name: string;
  lightName: string;
  darkName: string;
  source: string;
  light: Side;
  dark: Side;
}

export const FAMOUS_THEMES: FamousPair[] = [
  {
    name: "Solarized", lightName: "Solarized Light", darkName: "Solarized Dark",
    source: "https://ethanschoonover.com/solarized/ (values table: base3/base03, base00/base0, accents)",
    light: { page: "#fdf6e3", ink: "#657b83", primary: "#268bd2", accents: ["#2aa198", "#d33682", "#6c71c4", "#b58900", "#cb4b16"] },
    dark: { page: "#002b36", ink: "#839496", primary: "#268bd2", accents: ["#2aa198", "#d33682", "#6c71c4", "#b58900", "#cb4b16"] },
  },
  {
    name: "Gruvbox", lightName: "Gruvbox Light", darkName: "Gruvbox Dark",
    source: "https://github.com/morhetz/gruvbox/blob/master/colors/gruvbox.vim (light0/dark0, dark1/light1, faded_*/bright_*)",
    light: { page: "#fbf1c7", ink: "#3c3836", primary: "#076678", accents: ["#427b58", "#8f3f71", "#b57614", "#af3a03", "#79740e"] },
    dark: { page: "#282828", ink: "#ebdbb2", primary: "#83a598", accents: ["#8ec07c", "#d3869b", "#fabd2f", "#fe8019", "#b8bb26"] },
  },
  {
    name: "Tokyo", lightName: "Tokyo Night Day", darkName: "Tokyo Night",
    source: "https://github.com/folke/tokyonight.nvim (extras/lua/tokyonight_day.lua; lua/tokyonight/colors/night.lua and storm.lua)",
    light: { page: "#e1e2e7", ink: "#3760bf", primary: "#2e7de9", accents: ["#9854f1", "#007197", "#587539", "#b15c00", "#f52a65"] },
    dark: { page: "#1a1b26", ink: "#c0caf5", primary: "#7aa2f7", accents: ["#bb9af7", "#7dcfff", "#9ece6a", "#ff9e64", "#f7768e"] },
  },
  {
    name: "One", lightName: "One Light", darkName: "One Dark",
    source: "https://github.com/atom/atom (packages/one-light-syntax and one-dark-syntax, styles/colors.less: @syntax-bg, @mono-1, @hue-1..6-2)",
    light: { page: "#fafafa", ink: "#383a42", primary: "#4078f2", accents: ["#a626a4", "#0184bc", "#50a14f", "#cb7701", "#e45649"] },
    dark: { page: "#282c34", ink: "#abb2bf", primary: "#61afef", accents: ["#c678dd", "#56b6c2", "#98c379", "#e5c07b", "#e06c75"] },
  },
  {
    name: "Catppuccin", lightName: "Catppuccin Latte", darkName: "Catppuccin Mocha",
    source: "https://github.com/catppuccin/palette/blob/main/palette.json (latte, mocha)",
    light: { page: "#eff1f5", ink: "#4c4f69", primary: "#8839ef", accents: ["#1e66f5", "#179299", "#40a02b", "#df8e1d", "#d20f39"] },
    dark: { page: "#1e1e2e", ink: "#cdd6f4", primary: "#cba6f7", accents: ["#89b4fa", "#94e2d5", "#a6e3a1", "#f9e2af", "#f38ba8"] },
  },
  {
    name: "Rosé Pine", lightName: "Rosé Pine Dawn", darkName: "Rosé Pine",
    source: "https://github.com/rose-pine/palette/blob/main/palette.json (dawn, main)",
    light: { page: "#faf4ed", ink: "#464261", primary: "#907aa9", accents: ["#286983", "#56949f", "#d7827e", "#ea9d34", "#b4637a"] },
    dark: { page: "#191724", ink: "#e0def4", primary: "#c4a7e7", accents: ["#31748f", "#9ccfd8", "#ebbcba", "#f6c177", "#eb6f92"] },
  },
  {
    name: "GitHub", lightName: "GitHub Light", darkName: "GitHub Dark",
    source: "https://unpkg.com/@primer/primitives/dist/css/functional/themes/ (light.css, dark.css) and https://github.com/primer/github-vscode-theme (src/colors.js overrides for dark fg and accent)",
    light: { page: "#ffffff", ink: "#1f2328", primary: "#0969da", accents: ["#8250df", "#1a7f37", "#9a6700", "#bc4c00", "#cf222e"] },
    dark: { page: "#0d1117", ink: "#e6edf3", primary: "#2f81f7", accents: ["#ab7df8", "#3fb950", "#d29922", "#db6d28", "#f85149"] },
  },
];
