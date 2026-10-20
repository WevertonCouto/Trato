// Gera os ícones a partir de web/public/icone.svg (rode depois de mudar o ícone: npm run icones).
// PWA: web/public/icone-*.png. Android (se a pasta android/ existir): ícones do launcher e telas de abertura.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const ROXO = '#7C5CFC';
const CREME = '#FBF6EE';
const svg = fs.readFileSync('web/public/icone.svg');
// só o pet, sem o fundo roxo (vira a camada da frente do ícone adaptável do Android e a tela de abertura)
const soPet = Buffer.from(fs.readFileSync('web/public/icone.svg', 'utf8').replace(/<rect[^>]*\/>|<circle cx="(420|70)"[^>]*\/>/g, ''));

const png = (fonte, t) => sharp(fonte, { density: 300 }).resize(t, t).png();

for (const t of [180, 192, 512]) await png(svg, t).toFile(`web/public/icone-${t}.png`);
// "maskable": o Android recorta em círculo/gota, então o desenho fica menor no meio de um fundo cheio
const meio = await png(svg, 380).toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: ROXO } })
  .composite([{ input: meio, gravity: 'center' }]).png().toFile('web/public/icone-maskable.png');
console.log('Ícones do PWA gerados em web/public/');

const res = 'android/app/src/main/res';
if (fs.existsSync(res)) {
  const densidades = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
  for (const [d, f] of Object.entries(densidades)) {
    const dir = path.join(res, `mipmap-${d}`);
    const t = Math.round(48 * f);
    await png(svg, t).toFile(path.join(dir, 'ic_launcher.png'));
    const redondo = Buffer.from(`<svg width="${t}" height="${t}"><circle cx="${t / 2}" cy="${t / 2}" r="${t / 2}"/></svg>`);
    await png(svg, t).composite([{ input: redondo, blend: 'dest-in' }]).toFile(path.join(dir, 'ic_launcher_round.png'));
    // camada da frente: 108dp, desenho dentro da zona segura de 66dp
    const tf = Math.round(108 * f);
    const pet = await png(soPet, Math.round(tf * 0.62)).toBuffer();
    await sharp({ create: { width: tf, height: tf, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: pet, gravity: 'center' }]).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
  }
  fs.writeFileSync(path.join(res, 'values/ic_launcher_background.xml'),
    `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${ROXO}</color>\n</resources>\n`);
  // telas de abertura: mesmo tamanho das que o Capacitor criou, fundo creme e o pet no meio
  const splashes = fs.readdirSync(res).filter((d) => d.startsWith('drawable')).map((d) => path.join(res, d, 'splash.png')).filter((f) => fs.existsSync(f));
  for (const f of splashes) {
    const { width, height } = await sharp(f).metadata();
    const pet = await png(soPet, Math.round(Math.min(width, height) * 0.4)).toBuffer();
    const buf = await sharp({ create: { width, height, channels: 4, background: CREME } }).composite([{ input: pet, gravity: 'center' }]).png().toBuffer();
    fs.writeFileSync(f, buf);
  }
  console.log(`Ícones e ${splashes.length} telas de abertura do Android gerados.`);
}
