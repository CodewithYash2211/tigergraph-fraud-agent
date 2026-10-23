// Render the report SVGs only. Pass the path to an already-installed sharp module.
// No packages, experiment runs or network calls are needed.
const fs = require('node:fs');
const path = require('node:path');
const sharp = require(process.argv[2] || 'sharp');
(async () => {
  for (const name of fs.readdirSync(__dirname).filter(n => n.endsWith('.svg'))) {
    await sharp(path.join(__dirname, name), {density: 192})
      .resize({width: 2880}).png().toFile(path.join(__dirname, name.replace(/\.svg$/, '.png')));
  }
  console.log('Rendered 10 PNGs at 2× SVG dimensions.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
