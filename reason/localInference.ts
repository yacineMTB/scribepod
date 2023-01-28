import axios from 'axios';
import FormData from 'form-data';

export interface Thots {
  intent: string;
  person_is: string;
  extra_state: string;
  thoughts: string;
  response: string;
}

export const postAudioData = async (file: any): Promise<string> => {
  const form = new FormData();
  form.append('audio_data', file.buffer, {
    filename: 'test.wav',
    contentType: 'audio/wav',
    knownLength: file.size
  });

  try {
    const response = await axios.post("http://0.0.0.0:5000/transcribe", form, {
      headers: {
        ...form.getHeaders()
      }
    });
    return response.data;
  } catch (e) {
    console.error(e)
  }

  return ''
}


export const generateThoughts = async (conversation: string[]): Promise<Thots> => {
  const with_person_prepended = conversation.map((sentence) => 'person: ' + sentence);
  try {
    const response = await axios.post("http://0.0.0.0:5000/generate_thots", {conversation_speech: with_person_prepended}, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data
  } catch (e) {
    console.error(e)
  }
  return {
    intent: '',
    person_is: '',
    extra_state: '',
    thoughts: '',
    response: ''
  };
}


