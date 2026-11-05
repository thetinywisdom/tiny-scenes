import { scenes } from './scenes/manifest.js';

const list = document.querySelector('#scenes');
const base = import.meta.env.BASE_URL;

scenes.forEach((scene, index) => {
  const link = document.createElement('a');
  link.className = 'scene';
  link.href = base + scene.href;

  const num = document.createElement('span');
  num.className = 'num';
  num.textContent = String(index + 1).padStart(2, '0');

  const copy = document.createElement('span');
  const title = document.createElement('strong');
  title.textContent = scene.title;
  const blurb = document.createElement('em');
  blurb.textContent = scene.blurb;
  copy.append(title, blurb);

  const go = document.createElement('span');
  go.className = 'go';
  go.textContent = 'Open';

  link.append(num, copy, go);
  list.appendChild(link);
});
