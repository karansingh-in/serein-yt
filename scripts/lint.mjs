import { globSync, readFileSync } from 'node:fs';

const files = [...globSync('src/**/*.{css,ts}'), 'index.html'];
const problems = [];

const banned = [
  'gradient(',
  'box-shadow',
  'text-shadow',
  'drop-shadow',
  'backdrop-filter',
  'filter: blur',
  'transition: all',
];

const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const lower = text.toLowerCase();

  for (const word of banned) {
    if (lower.includes(word)) problems.push(`${file}: "${word}" is not allowed`);
  }

  const reducedAt = text.indexOf('prefers-reduced-motion');
  const importantAt = text.indexOf('!important');
  if (importantAt !== -1 && (reducedAt === -1 || importantAt < reducedAt)) {
    problems.push(`${file}: "!important" is only allowed inside the reduced-motion block`);
  }

  if (emoji.test(text)) problems.push(`${file}: emoji are not allowed`);

  if (file.endsWith('.css')) {
    const withoutTokens = text
      .replace(/:root\s*\{[^}]*\}/g, '')
      .replace(/:root\[data-theme='dark'\]\s*\{[^}]*\}/g, '');
    if (/#[0-9a-f]{3,8}\b/i.test(withoutTokens)) {
      problems.push(`${file}: colour literal outside the token blocks`);
    }
    if (/font-family:(?!\s*var\()/.test(withoutTokens)) {
      problems.push(`${file}: font-family outside the token blocks`);
    }
  }
}

/* WCAG contrast on the token pairs that carry text */

const css = readFileSync('src/styles.css', 'utf8');

function tokens(selector) {
  const block = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`));
  if (!block) return {};
  const out = {};
  for (const line of block[1].split(';')) {
    const [key, value] = line.split(':');
    if (key?.trim().startsWith('--')) out[key.trim()] = value.trim();
  }
  return out;
}

const luminance = (hex) => {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255);
  const channel = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const ratio = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const themes = [
  ['light', tokens(':root')],
  ['dark', tokens(":root\\[data-theme='dark'\\]")],
];

for (const [name, set] of themes) {
  for (const key of ['--text-1', '--text-2', '--text-3', '--accent']) {
    const value = set[key];
    const pair = set['--bg'];
    if (!value || !pair) {
      problems.push(`contrast: missing ${key} or --bg in ${name}`);
      continue;
    }
    const score = ratio(value, pair);
    const need = key === '--accent' ? 3 : 4.5;
    console.log(`${name.padEnd(5)} ${key.padEnd(10)} ${score.toFixed(2)}:1  ${score >= need ? 'ok' : 'FAIL'}`);
    if (score < need) problems.push(`contrast: ${key} on --bg in ${name} is ${score.toFixed(2)}:1`);
  }
}

if (problems.length) {
  console.error('\n' + problems.join('\n'));
  process.exit(1);
}

console.log('\ndesign rules ok');
