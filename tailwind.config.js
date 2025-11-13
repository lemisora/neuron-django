/** @type {import('tailwindcss').Config} */
export const content = [
  "./src/templates/**/*.html", // Para plantillas en una carpeta raíz de templates
  "./src/**/templates/**/*.html", // Para plantillas dentro de cada app de Django
  "./src/**/*.js",
];
export const theme = {
  extend: {},
};
export const plugins = [];
