import os
import tempfile
import flask
from flask import request
from flask_cors import CORS
import whisper
import time

app = flask.Flask(__name__)
CORS(app)

model = None
def load_model():
    global model
    model = whisper.load_model("large", 'cuda')

@app.route('/transcribe', methods=['POST'])
def transcribe():
    if not model:
        load_model()

    start_time_1 = time.time()
    temp_dir = tempfile.mkdtemp()

    save_path = os.path.join(temp_dir, 'temp.wav')
    print(save_path)
    wav_file = request.files['audio_data']
    wav_file.save(save_path)
    result = model.transcribe(save_path, language='english')
    app.logger.error("--- %s seconds ---" % (time.time() - start_time_1))

    return result['text']

if __name__ == "__main__":
    load_model()
    app.run()


