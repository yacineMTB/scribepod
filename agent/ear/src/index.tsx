// Source: https://github.com/mdn/dom-examples/tree/main/media/web-dictaphonea
// This code is bad on purpose
import './index.css'; // TODO: Actually make this a sane typescrcipt babel setup


const INTERVAL = 1000;
const FLUSH = 25;

let transcribedTextState = [''];
const canvas: any = document.querySelector('.visualizer') || {};
const mainSection: any = document.querySelector('.main-controls') || {};
const transcriptionElement: any = document.querySelector('.transcription') || {};
const responseElement: any = document.querySelector('.response') || {};


const updateTranscription = (transcribedText: string[]) => {
  transcriptionElement.innerHTML = transcribedText.join(' ');
}

const updateResponse = (response: string) => {
  responseElement.innerHTML = response;
}

let audioCtx: any;
const canvasCtx = canvas.getContext("2d");


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

const postSilenceDetect = async (): Promise<string> => {
  // send a get request to 4200/silence_detect
  console.log('spacekey')
  const response = await fetch(`http://0.0.0.0:4200/silence_detect`, { method: "GET" });
  let responseText = '';
  if (response.status === 200) {
    responseText = await response.text();
  }
  updateResponse('>' + responseText);
  return responseText;
}


function keyDownTextField(e: any) {
  var keyCode = e.keyCode;
  if (keyCode === 32) {
    postSilenceDetect();
  } else {
  }
}

document.addEventListener("keydown", keyDownTextField, false);


const postAudioDataToReason = async (blob: Blob, chunkNumber: number): Promise<any> => {
  const myHeaders = new Headers();
  myHeaders.append("Accept", "application/json");
  myHeaders.append("Accept", "text/plain");
  myHeaders.append("Accept", "*/*");

  const formData = new FormData();
  formData.append("audio_data", blob, 'temp_recording');
  console.log(formData);
  console.log(blob);
  const response = await fetch(`http://0.0.0.0:4200/conversation?chunk=${chunkNumber}`, {
    method: "POST",
    body:
      formData,
    headers: myHeaders
  });
  if (response.status === 200) {
    const { transcriptionResponse, conversationState } = await response.json();
    return {transcriptionResponse, conversationState};
  }
  return {transcriptionResponse: '', conversationState: {}};
}



const main = async () => {
  const constraints = { audio: true };
  let chunks: any[] = [];

  console.log('hi');
  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  console.log('hi');
  const mediaRecorder = new MediaRecorder(stream);
  visualize(stream);

  let semaphore = true;

  mediaRecorder.ondataavailable = async (e) => {
    const currentBlob = e.data;
    chunks.push(currentBlob);
    if (currentBlob.size > 5000 && semaphore) { // bug
      const blob = new Blob(chunks, { 'type': 'audio/ogg; codecs=opus' });


      semaphore = false;
      let transcribedText;
      try {
        const response = await postAudioDataToReason(blob, chunks.length);
        transcribedText = response.transcriptionResponse;

        updateResponse('>' + JSON.stringify(response.conversationState, null, 2));
      } catch (e) {
        throw e;
      } finally {
        semaphore = true;
      }
      if (chunks.length >= FLUSH) {
        chunks = [];
        transcribedTextState[transcribedTextState.length - 1] = transcribedText;
        console.log('TRANSCRIPTION: ' + transcribedText)
        // generateClipElement(blob);
        transcribedTextState.push('');
      } else {
        transcribedTextState[transcribedTextState.length - 1] = transcribedText;
      }
      console.log(transcribedText);
      updateTranscription(transcribedTextState);
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