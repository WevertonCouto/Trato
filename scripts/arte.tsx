// Gera as artes de divulgação em HTML (para fotografar no navegador): imagem de destaque da Play (1024×500)
// e imagem de compartilhamento (Open Graph, 1200×630). Uso: npx tsx scripts/arte.tsx  → web/dist/arte-*.html
// Depois de fotografar, scripts/arte-png.mjs recorta no tamanho exato.
import React from 'react';
import fs from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { Pet } from '../web/src/pet.tsx';

// num render só: em renders separados o useId se repete e os degradês dos pets se misturam
const pets = (lista: [string, number, number][]) =>
  renderToStaticMarkup(<>{lista.map(([e, n, t]) => <Pet key={e} especie={e} nivel={n} tamanho={t} />)}</>);

const base = (w: number, h: number, corpo: string) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Nunito:wght@700;800&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;overflow:hidden;background:#5B3FD9}
  #arte{width:${w}px;height:${h}px;background:radial-gradient(120% 120% at 85% 20%,#9C84FF 0%,#7C5CFC 45%,#5B3FD9 100%);font-family:'Nunito',sans-serif;color:#fff;position:relative}
  .logo{font:800 ${Math.round(h * 0.25)}px/1 'Baloo 2',sans-serif;letter-spacing:-.02em}
  .logo .b{color:#FFB199}
  .frase{font:800 ${Math.round(h * 0.075)}px/1.2 'Nunito',sans-serif;opacity:.95}
  #arte{position:relative;overflow:hidden}
  .bolha{position:absolute;border-radius:50%;background:rgba(255,255,255,.08)}
  .pets{position:absolute;display:flex;align-items:flex-end}
</style></head><body><div id="arte">${corpo}</div>
<script>/* ?z=0.5 numa tela 2x: o canto de ${w / 2}×${h / 2} vira ${w}×${h} pixels */ document.getElementById("arte").style.zoom = new URLSearchParams(location.search).get("z") || innerWidth / ${w};</script></body></html>`;

const destaque = base(1024, 500, `
  <div class="bolha" style="width:420px;height:420px;right:-90px;top:-140px"></div>
  <div class="bolha" style="width:260px;height:260px;left:-80px;bottom:-110px"></div>
  <div style="position:absolute;left:64px;top:92px;width:470px">
    <div class="logo">tra<span class="b">to</span></div>
    <div class="frase" style="margin-top:14px">A rotina das crianças<br>vira missão. E elas<br>querem cumprir.</div>
  </div>
  <div class="pets" style="right:40px;bottom:34px;gap:0">${pets([['broto', 3, 170], ['bolota', 5, 240], ['lumi', 4, 190]])}</div>`);

const og = base(1200, 630, `
  <div class="bolha" style="width:520px;height:520px;right:-120px;top:-180px"></div>
  <div class="bolha" style="width:300px;height:300px;left:-90px;bottom:-120px"></div>
  <div style="position:absolute;left:76px;top:120px;width:520px;font-size:0">
    <div class="logo">tra<span class="b">to</span></div>
    <div class="frase" style="margin-top:18px;font-size:40px">A rotina das crianças<br>vira missão. E elas<br>querem cumprir.</div>
    <div style="margin-top:26px;font:800 26px/1 Nunito,sans-serif;background:#fff;color:#5B3FD9;display:inline-block;padding:14px 22px;border-radius:999px">7 dias grátis · Android</div>
  </div>
  <div class="pets" style="right:50px;bottom:60px">${pets([['pingo', 3, 150], ['bolota', 5, 240], ['broto', 4, 170]])}</div>`);

fs.mkdirSync('web/dist', { recursive: true });
fs.writeFileSync('web/dist/arte-destaque.html', destaque);
fs.writeFileSync('web/dist/arte-og.html', og);
console.log('web/dist/arte-destaque.html e web/dist/arte-og.html');
