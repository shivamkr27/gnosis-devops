import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

const STITCH_DIR = '../stitch_gnosis_gamified_learning_platform';
const ASSETS_DIR = './public/assets';

if (!fs.existsSync(ASSETS_DIR)) {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        resolve(false);
        return;
      }
      const fileStream = fs.createWriteStream(path.join(ASSETS_DIR, filename));
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });
    }).on('error', (err) => {
      resolve(false);
    });
  });
}

async function extract() {
  const folders = fs.readdirSync(STITCH_DIR);
  const regex = /src="(https:\/\/[^"]+)"/g;

  const allUrls = new Set();

  for (const folder of folders) {
    const htmlPath = path.join(STITCH_DIR, folder, 'code.html');
    if (fs.existsSync(htmlPath)) {
      const html = fs.readFileSync(htmlPath, 'utf8');
      let match;
      while ((match = regex.exec(html)) !== null) {
        if (!match[1].includes('tailwindcss.com')) {
          allUrls.add(match[1]);
        }
      }
    }
  }

  let i = 1;
  const imageMap = {};
  for (const url of allUrls) {
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 10);
    const filename = `img_${hash}.jpg`;
    console.log(`Downloading ${i}/${allUrls.size}: ${filename}`);
    await downloadImage(url, filename);
    imageMap[url] = `/assets/${filename}`;
    i++;
  }

  fs.writeFileSync('./public/assets/image_map.json', JSON.stringify(imageMap, null, 2));
  console.log("Done");
}

extract();
