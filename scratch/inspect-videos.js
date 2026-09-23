const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'videos');
if (!fs.existsSync(dir)) {
  console.log('No public/videos dir');
  process.exit(0);
}

const files = fs.readdirSync(dir);
console.log('Found video files:', files);

for (const file of files) {
  const filePath = path.join(dir, file);
  const stat = fs.statSync(filePath);
  const buf = fs.readFileSync(filePath);
  
  // Search for 'mvhd', 'tkhd', or video track dimensions
  // In MP4, tkhd contains track width and height as 16.16 fixed point numbers at the end of tkhd box
  let width = 0;
  let height = 0;
  let duration = 0;
  let timescale = 0;
  
  const mvhdIdx = buf.indexOf(Buffer.from('mvhd'));
  if (mvhdIdx !== -1) {
    const version = buf[mvhdIdx + 4];
    const offset = version === 1 ? mvhdIdx + 4 + 16 : mvhdIdx + 4 + 8;
    timescale = buf.readUInt32BE(offset);
    const durationRaw = version === 1 ? Number(buf.readBigUInt64BE(offset + 4)) : buf.readUInt32BE(offset + 4);
    duration = (durationRaw / timescale).toFixed(2);
  }
  
  const tkhdIdx = buf.indexOf(Buffer.from('tkhd'));
  if (tkhdIdx !== -1) {
    const tkhdLen = buf.readUInt32BE(tkhdIdx - 4);
    // width and height are at tkhdIdx - 4 + tkhdLen - 8
    const pos = tkhdIdx - 4 + tkhdLen - 8;
    if (pos >= 0 && pos + 8 <= buf.length) {
      width = buf.readUInt16BE(pos);
      height = buf.readUInt16BE(pos + 4);
    }
  }

  // Look for codec name: 'avc1', 'hvc1', 'vp09', 'hev1'
  let codec = 'Unknown';
  if (buf.includes(Buffer.from('avc1'))) codec = 'H.264 / AVC (avc1)';
  else if (buf.includes(Buffer.from('hvc1')) || buf.includes(Buffer.from('hev1'))) codec = 'H.265 / HEVC';
  else if (buf.includes(Buffer.from('vp09'))) codec = 'VP9';
  else if (buf.includes(Buffer.from('mp4v'))) codec = 'MPEG-4';

  console.log({
    file,
    sizeMB: (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
    format: path.extname(file),
    codec,
    resolution: `${width}x${height}`,
    duration: `${duration}s`,
    alphaTransparency: codec.includes('H.264') ? 'No (H.264 / standard MP4 does not support alpha channel in HTML5 browsers)' : 'Possible'
  });
}
