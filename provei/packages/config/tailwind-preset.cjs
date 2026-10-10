const tokens = require('./src/tokens.json');

/** Tailwind preset partilhado (web e NativeWind). Cores e raios vêm dos tokens da marca. */
module.exports = {
  theme: {
    screens: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
    extend: {
      colors: {
        branco: tokens.color.branco,
        nevoa: tokens.color.nevoa,
        verde: { DEFAULT: tokens.color.verde, escuro: tokens.color.verdeEscuro, fresco: tokens.color.verdeFresco, tinta: tokens.color.verdeTinta },
        amarelo: { DEFAULT: tokens.color.amarelo, tinta: tokens.color.amareloTinta },
        tinta: { DEFAULT: tokens.color.tinta, 2: tokens.color.tinta2 },
        linha: tokens.color.linha,
        erro: tokens.color.erro,
      },
      borderRadius: { s: '8px', m: '16px', l: '28px', pill: '999px' },
      transitionDuration: { fast: '150ms', base: '250ms', slow: '400ms' },
    },
  },
};
