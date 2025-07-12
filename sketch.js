let state = "choose";
let songs = [];
let songNames = ["Kesariya", "Something Just Like This"];
let songFiles = [
  "New Project.mp3",
  "Something Just Like This - The Chainsmokers (Acapella - Vocals Only).mp3"
];
let currentSongIndex = -1;

let fftSong, fftMic;
let bgImg;
let waveScroll = 0;
let waveSpeed = 2;
let overlayAlpha = 150;
let lineYPositions = [];
let vibgyorColors = ["#FF0000", "#FFA500", "#FFFF00", "#00FF00", "#0000FF", "#4B0082", "#8F00FF"];
let wavelengthMap = [];
let frozenSongIndex = null;
let frozenMicIndex = null;

let pauseButton, backButton, recordButton, stopRecordButton, compareButton;
let mic;
let micRecording = false;
let micData = [];
let songData = [];
let compareResult = "";

function preload() {
  bgImg = loadImage('https://www.shutterstock.com/image-vector/abstract-music-notes-wavy-background-600nw-2478080513.jpg');
  for (let file of songFiles) songs.push(loadSound(file));
}

function setup() {
  createCanvas(1000, 1000);
  textAlign(CENTER, CENTER);
  textFont('Georgia');
  noStroke();

  fftSong = new p5.FFT(0.1, 2048);
  fftMic = new p5.FFT(0.1, 2048);

  let topMargin = 200;
  let bottomMargin = height - 150;
  for (let i = 0; i < vibgyorColors.length; i++) {
    let y = map(i, 0, vibgyorColors.length - 1, topMargin, bottomMargin);
    lineYPositions.push(y);
    wavelengthMap.push(map(i, 0, vibgyorColors.length - 1, 300, 80));
  }

  createChoiceButtons();
}

function draw() {
  if (state === "choose") {
    drawChoiceScreen();
  } else if (state === "listen") {
    drawListeningScreen();
  } else if (state === "record") {
    drawRecordingScreen();
  }
}

function drawChoiceScreen() {
  backgroundImage();
  fill(0, 0, 0, overlayAlpha);
  rect(0, 0, width, height);
  fill(255);
  textSize(48);
  textStyle(BOLD);
  text("🎵 Choose Your Bollywood Song!", width / 2, 150);
}

function drawListeningScreen() {
  background(0, 40);
  drawBlackGrid();
  drawWhiteGuideLines();

  let song = songs[currentSongIndex];
  if (song && song.isPlaying()) {
    fftSong.setInput(song);
    let freqData = fftSong.analyze();
    let maxIndex = freqData.indexOf(max(freqData));
    let nyquist = sampleRate() / 2;
    let currentFreq = maxIndex * nyquist / freqData.length;
    if (currentFreq > 100 && currentFreq < 520) songData.push(currentFreq);

    let activeLineIndex = mapFrequencyToLine(currentFreq);
    if (activeLineIndex !== null) frozenSongIndex = activeLineIndex;
  }

  if (frozenSongIndex !== null) drawSmoothWaveOnLine(frozenSongIndex);

  fill(255);
  textSize(32);
  textStyle(BOLD);
  text(`🎵 Playing: ${songNames[currentSongIndex]}`, width / 2, 50);
  text(compareResult, width / 2, 90);
}

function drawRecordingScreen() {
  background(0, 40);
  drawBlackGrid();
  drawWhiteGuideLines();

  // Process Karaoke
  let karaokeSong = songs[currentSongIndex];
  if (karaokeSong && karaokeSong.isPlaying()) {
    fftSong.setInput(karaokeSong);
    let freqData = fftSong.analyze();
    let maxIndex = freqData.indexOf(max(freqData));
    let nyquist = sampleRate() / 2;
    let currentFreq = maxIndex * nyquist / freqData.length;
    if (currentFreq > 100 && currentFreq < 520) {
      let activeLineIndex = mapFrequencyToLine(currentFreq);
      if (activeLineIndex !== null) frozenSongIndex = activeLineIndex;
    }
  }

  // Process Mic
  if (mic) {
    fftMic.setInput(mic);
    let freqData = fftMic.analyze();
    let maxIndex = freqData.indexOf(max(freqData));
    let nyquist = sampleRate() / 2;
    let currentFreq = maxIndex * nyquist / freqData.length;
    if (micRecording && currentFreq > 100 && currentFreq < 520) micData.push(currentFreq);

    let activeLineIndex = mapFrequencyToLine(currentFreq);
    if (activeLineIndex !== null) frozenMicIndex = activeLineIndex;
  }

  // Draw Waves
  if (frozenSongIndex !== null) drawSmoothWaveOnLineHalf(frozenSongIndex, 0, width / 2);
  if (frozenMicIndex !== null) drawSmoothWaveOnLineHalf(frozenMicIndex, width / 2, width);

  // Divider
  stroke(255);
  strokeWeight(4);
  line(width / 2, 0, width / 2, height);

  fill(150);
  textSize(32);
  text("🎤 Recording Your Singing with Karaoke Playing", width / 2, 50);
}

function drawWhiteGuideLines() {
  stroke(255, 180);
  strokeWeight(2);
  for (let y of lineYPositions) line(0, y, width, y);
}

function drawSmoothWaveOnLine(index) {
  let yPos = lineYPositions[index];
  let col = vibgyorColors[index];
  let wavelength = wavelengthMap[index];
  let amplitude = 50;

  stroke(col);
  strokeWeight(4);
  noFill();
  beginShape();
  for (let x = 0; x < width; x += 5) {
    let angle = (x + waveScroll) / wavelength * TWO_PI;
    let y = yPos + sin(angle) * amplitude;
    curveVertex(x, y);
  }
  endShape();

  waveScroll += waveSpeed;
}

function drawSmoothWaveOnLineHalf(index, xStart, xEnd) {
  let yPos = lineYPositions[index];
  let col = vibgyorColors[index];
  let wavelength = wavelengthMap[index];
  let amplitude = 50;

  stroke(col);
  strokeWeight(4);
  noFill();
  beginShape();
  for (let x = xStart; x < xEnd; x += 5) {
    let angle = (x + waveScroll) / wavelength * TWO_PI;
    let y = yPos + sin(angle) * amplitude;
    curveVertex(x, y);
  }
  endShape();

  waveScroll += waveSpeed;
}

function mapFrequencyToLine(freq) {
  let minFreq = 100;
  let maxFreq = 520;
  if (freq < minFreq || freq > maxFreq) return null;
  let bandWidth = (maxFreq - minFreq) / vibgyorColors.length;
  for (let i = 0; i < vibgyorColors.length; i++) {
    let bandStart = minFreq + i * bandWidth;
    let bandEnd = bandStart + bandWidth;
    if (freq >= bandStart && freq < bandEnd) return i;
  }
  return null;
}

function createChoiceButtons() {
  removeElements();
  for (let i = 0; i < songNames.length; i++) {
    let btn = createButton(`▶ ${songNames[i]}`);
    btn.position(width / 2 - 150, 250 + i * 80);
    styleButton(btn, '#4caf50', '#81c784');
    btn.mousePressed(() => playSelectedSong(i));
  }
}

function playSelectedSong(index) {
  stopMic();
  stopAllSongs();

  currentSongIndex = index;
  frozenSongIndex = null;
  frozenMicIndex = null;
  songData = [];
  micData = [];
  compareResult = "";

  let song = songs[currentSongIndex];
  fftSong.setInput(song);
  song.play();
  state = "listen";
  removeElements();

  pauseButton = createButton("⏸ Pause / Play");
  pauseButton.position(150, 78);
  styleButton(pauseButton, '#ff9800', '#ffc107');
  pauseButton.mousePressed(togglePlayPause);

  recordButton = createButton("🎤 Record Your Singing");
  recordButton.position(350, 78);
  styleButton(recordButton, '#3f51b5', '#7986cb');
  recordButton.mousePressed(startRecording);

  compareButton = createButton("🔍 Compare");
  compareButton.position(750, 78);
  styleButton(compareButton, '#009688', '#4db6ac');
  compareButton.mousePressed(compareRecordings);

  backButton = createButton("🔙 Back");
  backButton.position(550, 78);
  styleButton(backButton, '#9e9e9e', '#cfcfcf');
  backButton.mousePressed(goBack);
}

function togglePlayPause() {
  let song = songs[currentSongIndex];
  if (song.isPlaying()) song.pause();
  else song.play();
}

function startRecording() {
  stopAllSongs();
  micData = [];
  frozenSongIndex = null;
  frozenMicIndex = null;
  compareResult = "";

  if (!mic) {
    mic = new p5.AudioIn();
    mic.start(() => fftMic.setInput(mic));
  } else {
    fftMic.setInput(mic);
  }

  let song = songs[currentSongIndex];
  if (song) {
    song.play();
    song.setVolume(0.5);
  }

  micRecording = true;
  state = "record";
  removeElements();

  stopRecordButton = createButton("⏹ Stop Recording");
  stopRecordButton.position(300, 78);
  styleButton(stopRecordButton, '#e53935', '#ef5350');
  stopRecordButton.mousePressed(stopRecording);

  backButton = createButton("🔙 Back");
  backButton.position(550, 78);
  styleButton(backButton, '#9e9e9e', '#cfcfcf');
  backButton.mousePressed(goBack);
}

function stopRecording() {
  micRecording = false;
  stopAllSongs();
  compareRecordings();
  state = "listen";
  removeElements();

  pauseButton = createButton("⏸ Pause / Play");
  pauseButton.position(width / 2 - 125, 300);
  styleButton(pauseButton, '#ff9800', '#ffc107');
  pauseButton.mousePressed(togglePlayPause);

  recordButton = createButton("🎤 Record Your Singing");
  recordButton.position(width / 2 - 125, 370);
  styleButton(recordButton, '#3f51b5', '#7986cb');
  recordButton.mousePressed(startRecording);

  compareButton = createButton("🔍 Compare");
  compareButton.position(width / 2 - 125, 440);
  styleButton(compareButton, '#009688', '#4db6ac');
  compareButton.mousePressed(compareRecordings);

  backButton = createButton("🔙 Back");
  backButton.position(width / 2 - 125, 510);
  styleButton(backButton, '#9e9e9e', '#cfcfcf');
  backButton.mousePressed(goBack);
}

function compareRecordings() {
  if (micData.length === 0 || songData.length === 0) {
    compareResult = "✅ Match: 0.0%";
    return;
  }

  let tolerance = 20;
  let hits = 0;

  for (let micFreq of micData) {
    let closestSongFreq = songData.reduce((a, b) =>
      abs(a - micFreq) < abs(b - micFreq) ? a : b
    );
    if (abs(micFreq - closestSongFreq) <= tolerance) hits++;
  }

  let matchPercentage = (hits / micData.length) * 100;
  compareResult = `✅ Match: ${matchPercentage.toFixed(1)}%`;
}

function goBack() {
  stopAllSongs();
  stopMic();
  frozenSongIndex = null;
  frozenMicIndex = null;
  state = "choose";
  compareResult = "";
  removeElements();
  createChoiceButtons();
}

function stopAllSongs() {
  for (let s of songs) if (s.isPlaying()) s.stop();
}

function stopMic() {
  if (mic) {
    mic.stop();
    mic = null;
  }
}

function drawBlackGrid() {
  stroke('#00cccc');
  strokeWeight(0.5);
  for (let x = 0; x < width; x += 50) line(x, 0, x, height);
  for (let y = 0; y < height; y += 50) line(0, y, width, y);
}

function backgroundImage() {
  if (bgImg) image(bgImg, 0, 0, width, height);
  else background(0);
}

function styleButton(btn, color1, color2) {
  btn.style('width', '150px');
  btn.style('height', '45px');
  btn.style('font-size', '18px');
  btn.style('border', 'none');
  btn.style('border-radius', '10px');
  btn.style('color', 'white');
  btn.style('cursor', 'pointer');
  btn.style('background', `linear-gradient(45deg, ${color1}, ${color2})`);
  btn.style('box-shadow', `0 4px 10px 0 ${color2}`);
  btn.mouseOver(() => btn.style('filter', 'brightness(1.2)'));
  btn.mouseOut(() => btn.style('filter', 'brightness(1)'));
}
