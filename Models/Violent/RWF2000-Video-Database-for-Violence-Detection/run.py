import numpy as np
import tensorflow as tf
from tensorflow import keras

# 모델 로드
model = keras.models.load_model("Models/keras_model.h5")

# 전처리된 .npy 파일 로드
data = np.load("output.npy")           # Video2Numpy로 만든 파일명
data = np.expand_dims(data, axis=0)    # shape: [1, frames, H, W, 5]

# 예측
prediction = model.predict(data)
score = float(prediction[0][0])

if score > 0.5:
    print(f"⚠️  폭력 감지! (확률: {score:.2%})")
else:
    print(f"✅  정상 (확률: {1 - score:.2%})")

# 이것도 터미널 단위에서 python run.py로 실행하면 됩니다.