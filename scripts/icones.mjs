// Gera os PNGs do PWA a partir de web/public/icone.svg (rode depois de mudar o ícone: npm run icones).
import sharp from 'sharp';
import fs from 'node:fs';

const svg = fs.readFileSync('web/public/icone.svg');
for (const t of [180, 192, 512]) {
  await sharp(svg, { density: 300 }).resize(t, t).png().toFile(`web/public/icone-${t}.png`);
}
// "maskable": o Android recorta em círculo/gota, então o desenho fica menor no meio de um fundo cheio
const meio = await sharp(svg, { density: 300 }).resize(380, 380).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#7C5CFC' } })
  .composite([{ input: meio, gravity: 'center' }]).png().toFile('web/public/icone-maskable.png');
console.log('Ícones gerados em web/public/');
