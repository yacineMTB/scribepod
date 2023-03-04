import os
import tempfile
import flask
from flask import request
from flask import jsonify
from flask_cors import CORS
import whisper
from transformers import T5Tokenizer, T5ForConditionalGeneration

app = flask.Flask(__name__)
CORS(app)
app.config['PROFILE'] = True

whisper_model = None
tokenizer = None
text_model = None
def load_model():
    global whisper_model 
    global tokenizer 
    global text_model 
    whisper_model = whisper.load_model("large", 'cuda')
    tokenizer = T5Tokenizer.from_pretrained("google/flan-t5-xl")
    text_model = T5ForConditionalGeneration.from_pretrained("google/flan-t5-xl", device_map="auto")


@app.route('/transcribe', methods=['POST'])
def transcribe():
    temp_dir = tempfile.mkdtemp()
    save_path = os.path.join(temp_dir, 'temp.wav')
    print(save_path)
    wav_file = request.files['audio_data']
    wav_file.save(save_path)
    result = whisper_model.transcribe(save_path, language='english')
    print('Transcription: ', result['text'])
    return result['text']

STATE_TEMPERATURE = 1.0
PERSON_INTENT_TEMPERATURE = 1.0
PERSON_INFERENCE_TEMPERATURE = 1.0

person_speech = [
    "person: Hey, have you heard about the latest advancements in space technology?",
    "person: I'm really interested in the concept of colonizing Mars.",
    "person: Did you know that SpaceX has plans to send humans to Mars as soon as 2024?"
]
question_intent = [
    'Q: What is the intent of the person speaking?',
]
question_inference = [
    'Q: what kind of person is the person speaking?'
]
example_1_inferences = person_speech + question_inference + \
    ["Answer: This person is: a scientist"]
example_1_intent = person_speech + question_intent + \
    ["Answer: The intent of the person is: to start conversation about space exploration and colonizing Mars"]

def build_state(world_state, conversation):
    prompt = ['Infer some more state about the preceding speaker, do it in JSON. Add to the current state already inferred']
    question = ['Q: What other qualities about the conversation can we infer?']
    answer_line = ['So we already know that' + world_state + ' An additional thing we can infer from the conversation is that']
    input_text = '\n'.join(conversation + prompt +
                            question + answer_line)
    input_ids = tokenizer(input_text, return_tensors="pt").input_ids.to("cuda")
    outputs = text_model.generate(input_ids, max_length=2000, temperature=STATE_TEMPERATURE)
    world_state = tokenizer.decode(outputs[0]).split('<pad>')[
        1].split('</s')[0]
    return world_state

def get_persons_intent(question_speech):
    prompt = example_1_intent + ['\nEXAMPLE 2:'] + question_speech + \
        question_intent + ['Answer: The intent of this person is:']
    input_text = '\n'.join(prompt)
    input_ids = tokenizer(input_text, return_tensors="pt").input_ids.to("cuda")
    outputs = text_model.generate(input_ids, max_length=2000, temperature=PERSON_INTENT_TEMPERATURE)
    intent_of_person = tokenizer.decode(outputs[0]).split('<pad>')[
        1].split('</s')[0]
    return intent_of_person

def get_inference_about_person(question_speech):
    prompt = example_1_inferences + \
        ['\nEXAMPLE 2:'] + question_speech + \
        question_inference + ['Answer: This person is:']
    input_text = '\n'.join(prompt)
    input_ids = tokenizer(input_text, return_tensors="pt",
                          padding='do_not_pad').input_ids.to("cuda")
    outputs = text_model.generate(input_ids, max_length=2000, temperature=PERSON_INFERENCE_TEMPERATURE)
    inference_about_person = tokenizer.decode(
        outputs[0]).split('<pad>')[1].split('</s')[0]
    return inference_about_person


def build_state(world_state, conversation):
    prompt = ['Infer some more state about the preceding speaker. "Person" is speaking to a bot. Youre the bot.']
    question = ['Q: What other qualities about the person we can infer?']
    answer_line = ['So we already know that' + world_state + ' An additional thing we can infer from the conversation is that']
    input_text = '\n'.join(conversation + prompt +
                            question + answer_line)
    input_ids = tokenizer(input_text, return_tensors="pt").input_ids.to("cuda")
    # time the inference
    outputs = text_model.generate(input_ids, max_length=2000, temperature=STATE_TEMPERATURE)
    world_state = tokenizer.decode(outputs[0]).split('<pad>')[
        1].split('</s')[0]
    return world_state


def get_thoughts(conversation):
    prompt = ['This is an entry from psychology book, called, "On ADHD and random thought generation":'] + ['One of a common symptom of ADHD is random thoughts related to the topic at hand. For example, with the following conversation:']
    answer_line = ['The listener will have many different thoughts in quick succession relating to the topic. Write different thoughts that the listener might have, each thought vastly different. Answer:']
    input_text = '\n'.join(prompt + conversation + answer_line)
    input_ids = tokenizer(input_text, return_tensors="pt").input_ids.to("cuda")
    outputs = text_model.generate(input_ids, max_length=50, temperature=1)
    thought = tokenizer.decode(outputs[0]).split('<pad>')[
    1].split('</s')[0]
    return thought

def get_thoughts_2(conversation):
    prompt = ["Person's speech"]
    answer_line = ['Random thoughts about the speech, that you, a sentient robot, could have:']
    input_text = '\n'.join(prompt + conversation + answer_line)
    input_ids = tokenizer(input_text, return_tensors="pt").input_ids.to("cuda")
    outputs = text_model.generate(input_ids, max_length=50, temperature=1)
    thought = tokenizer.decode(outputs[0]).split('<pad>')[
    1].split('</s')[0]
    return thought


def get_persons_intent(question_speech):
    prompt = example_1_intent + ['\nEXAMPLE 2:'] + question_speech + \
        question_intent + ['Answer: The intent of this person is:']
    input_text = '\n'.join(prompt)
    input_ids = tokenizer(input_text, return_tensors="pt").input_ids.to("cuda")
    # time the inference
    outputs = text_model.generate(input_ids, max_length=2000, temperature=PERSON_INTENT_TEMPERATURE)
    intent_of_person = tokenizer.decode(outputs[0]).split('<pad>')[
        1].split('</s')[0]

    return intent_of_person


def get_inference_about_person(question_speech):
    prompt = example_1_inferences + \
        ['\nEXAMPLE 2:'] + question_speech + \
        question_inference + ['Answer: This person is:']
    input_text = '\n'.join(prompt)
    input_ids = tokenizer(input_text, return_tensors="pt",
                          padding='do_not_pad').input_ids.to("cuda")
    outputs = text_model.generate(input_ids, max_length=2000, temperature=PERSON_INFERENCE_TEMPERATURE)

    inference_about_person = tokenizer.decode(
        outputs[0]).split('<pad>')[1].split('</s')[0]
    return inference_about_person


def generate_response(thoughts, conversation):
    pre_convo = ["I'm a helpful, happy, sentient robot. This is the conversation of a human that they're having with me"]
    pre_thought = ["These are my thoughts about the preceding lines. I should use thoughts, when I generate a reasonable response."]
    answer = ["My response to the person should be:"]

    input_text = '\n'.join(pre_convo + conversation + pre_thought + thoughts + answer)

    input_ids = tokenizer(input_text, return_tensors="pt",
                          padding='do_not_pad').input_ids.to("cuda")
    outputs = text_model.generate(input_ids, max_length=2000, temperature=PERSON_INFERENCE_TEMPERATURE)

    response = tokenizer.decode(
        outputs[0]).split('<pad>')[1].split('</s')[0]
    return response 


@app.route('/generate_thots', methods=['POST'])
def generate_thots():
    question_speech = request.get_json()['conversation_speech']
    person_intent = get_persons_intent(question_speech)
    person_is = get_inference_about_person(question_speech)
    world_state = 'this person is a ' + person_is + ' and their intent is ' + person_intent + '.'
    new_state = build_state(world_state, question_speech)
    intent_pretty = "this person's intent is " + person_intent.lower().strip()
    person_is_pretty ='this person is a ' + person_is.lower().strip()
    extra_state_pretty = new_state.lower().strip()
    thoughts = get_thoughts_2(question_speech).lower().strip()
    response = generate_response(question_speech, [intent_pretty, person_is_pretty, extra_state_pretty, thoughts])
    response_data = {
        'intent': intent_pretty,
        'person_is': person_is_pretty,
        'extra_state': extra_state_pretty,
        'thoughts': thoughts,
        'response': response,
    }
    return jsonify(response_data)

if __name__ == "__main__":
    load_model()
    app.run()


