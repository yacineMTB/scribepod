// Source: https://github.com/mdn/dom-examples/tree/main/media/web-dictaphonea
// This code is bad on purpose
import './index.css'; // TODO: Actually make this a sane typescrcipt babel setup

const record: any = document.querySelector('.record') || {};
const stop: any = document.querySelector('.stop') || {};
const soundClips: any = document.querySelector('.sound-clips') || {};
const canvas: any = document.querySelector('.visualizer') || {};
const mainSection: any = document.querySelector('.main-controls') || {};

const INTERVAL = 1000;
const FLUSH = 20;

let transcribedTextState = [''];

stop.disabled = true;
let audioCtx: any;
const canvasCtx = canvas.getContext("2d");

record.style.background = "red";
stop.disabled = false;
record.disabled = true;

function visualize(stream: any) {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }

  const source = audioCtx.createMediaStreamSource(stream);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  draw();

  function draw() {
    const WIDTH = canvas.width
    const HEIGHT = canvas.height;
    requestAnimationFrame(draw);
    analyser.getByteTimeDomainData(dataArray);
    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';
    canvasCtx.beginPath();
    let sliceWidth = WIDTH * 1.0 / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      let v = dataArray[i] / 128.0;
      let y = v * HEIGHT / 2;
      if (i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }
      x += sliceWidth;
    }
    canvasCtx.lineTo(canvas.width, canvas.height / 2);
    canvasCtx.stroke();
  }
}

const postAudioData = async (blob: Blob): Promise<string> => {
  const myHeaders = new Headers();
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Accept", "text/plain");
  myHeaders.append("Accept", "*/*");

  const formData = new FormData();
  formData.append("audio_data", blob, 'temp_recording');
  const response = await fetch("http://0.0.0.0:5000/transcribe", {
    method: "POST",
    body:
      formData,
    headers: myHeaders
  });
  let responseText = '';
  if (response.status === 200) {
    responseText = await response.text();
  }
  return responseText;
}


const generateClipElement = (blob: Blob) => {
  const audioURL = window.URL.createObjectURL(blob);
  const clipContainer = document.createElement('article');
  const audio = document.createElement('audio');
  clipContainer.classList.add('clip');
  audio.setAttribute('controls', '');
  audio.controls = true;
  audio.src = audioURL;
  clipContainer.appendChild(audio);
  soundClips.appendChild(clipContainer);
}

const main = async () => {
  const constraints = { audio: true };
  let chunks: any[] = [];

  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const mediaRecorder = new MediaRecorder(stream);
  visualize(stream);

  let semaphore = true;

  mediaRecorder.ondataavailable = async (e) => {
    const currentBlob = e.data;
    chunks.push(currentBlob);
    if (currentBlob.size > 5000 && semaphore) { // bug
      const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });
      semaphore = false;
      const transcribedText = await postAudioData(blob);
      semaphore = true;
      if (chunks.length >= FLUSH) {
        chunks = [];
        transcribedTextState[transcribedTextState.length - 1] = transcribedText;
        console.log('TRANSCRIPTION: ' + transcribedText )
        generateClipElement(blob);
        transcribedTextState.push('');
      } else {
        transcribedTextState[transcribedTextState.length - 1] = transcribedText;
      }
      console.log(transcribedText);
    }
  }

  mediaRecorder.start();
  const clip = () => {
    mediaRecorder.stop();
  }
  mediaRecorder.onstop = (e) => {
    mediaRecorder.start();
  };
  setInterval(clip, INTERVAL);


}

window.onresize = function () {
  canvas.width = mainSection.offsetWidth;
}

canvas.width = mainSection.offsetWidth;
main();