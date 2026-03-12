import argparse
import json
from pathlib import Path

import cv2
import numpy as np


def _default_model_path():
    return (
        Path(__file__).resolve().parents[2]
        / "Violent"
        / "RWF2000-Video-Database-for-Violence-Detection"
        / "Models"
        / "keras_model.h5"
    )


class VideoViolenceDetector:
    def __init__(
        self,
        model_path=None,
        threshold=0.5,
        sequence_length=64,
        frame_size=(224, 224),
    ):
        resolved_model_path = Path(model_path) if model_path else _default_model_path()
        if not resolved_model_path.exists():
            raise FileNotFoundError(f"Violence model not found: {resolved_model_path}")

        try:
            from tensorflow import keras
        except ImportError as exc:  # pragma: no cover - dependency is environment-specific
            raise ImportError(
                "tensorflow is required to use Model.violent_video. "
                "Install it with `pip install tensorflow`."
            ) from exc

        self.model = self._build_model(keras)
        self.model.load_weights(str(resolved_model_path))
        self.threshold = float(threshold)
        self.sequence_length = int(sequence_length)
        self.frame_size = tuple(frame_size)
        self.frame_width = int(self.frame_size[0])
        self.frame_height = int(self.frame_size[1])

    @staticmethod
    def _build_model(keras):
        inputs = keras.Input(shape=(64, 224, 224, 5), name="input_1")

        rgb = keras.layers.Lambda(lambda x: x[..., :3], name="lambda_1")(inputs)
        opt = keras.layers.Lambda(lambda x: x[..., 3:], name="lambda_2")(inputs)

        rgb = keras.layers.Conv3D(
            16,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_1",
        )(rgb)
        rgb = keras.layers.Conv3D(
            16,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_2",
        )(rgb)
        rgb = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_1")(rgb)

        rgb = keras.layers.Conv3D(
            16,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_3",
        )(rgb)
        rgb = keras.layers.Conv3D(
            16,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_4",
        )(rgb)
        rgb = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_2")(rgb)

        rgb = keras.layers.Conv3D(
            32,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_5",
        )(rgb)
        rgb = keras.layers.Conv3D(
            32,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_6",
        )(rgb)
        rgb = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_3")(rgb)

        rgb = keras.layers.Conv3D(
            32,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_7",
        )(rgb)
        rgb = keras.layers.Conv3D(
            32,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_8",
        )(rgb)
        rgb = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_4")(rgb)

        opt = keras.layers.Conv3D(
            16,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_9",
        )(opt)
        opt = keras.layers.Conv3D(
            16,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_10",
        )(opt)
        opt = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_5")(opt)

        opt = keras.layers.Conv3D(
            16,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_11",
        )(opt)
        opt = keras.layers.Conv3D(
            16,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_12",
        )(opt)
        opt = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_6")(opt)

        opt = keras.layers.Conv3D(
            32,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_13",
        )(opt)
        opt = keras.layers.Conv3D(
            32,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_14",
        )(opt)
        opt = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_7")(opt)

        opt = keras.layers.Conv3D(
            32,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="sigmoid",
            padding="same",
            name="conv3d_15",
        )(opt)
        opt = keras.layers.Conv3D(
            32,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="sigmoid",
            padding="same",
            name="conv3d_16",
        )(opt)
        opt = keras.layers.MaxPooling3D(pool_size=(1, 2, 2), name="max_pooling3d_8")(opt)

        x = keras.layers.Multiply(name="multiply_1")([rgb, opt])
        x = keras.layers.MaxPooling3D(pool_size=(8, 1, 1), name="max_pooling3d_9")(x)

        x = keras.layers.Conv3D(
            64,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_17",
        )(x)
        x = keras.layers.Conv3D(
            64,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_18",
        )(x)
        x = keras.layers.MaxPooling3D(pool_size=(2, 2, 2), name="max_pooling3d_10")(x)

        x = keras.layers.Conv3D(
            64,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_19",
        )(x)
        x = keras.layers.Conv3D(
            64,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_20",
        )(x)
        x = keras.layers.MaxPooling3D(pool_size=(2, 2, 2), name="max_pooling3d_11")(x)

        x = keras.layers.Conv3D(
            128,
            kernel_size=(1, 3, 3),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_21",
        )(x)
        x = keras.layers.Conv3D(
            128,
            kernel_size=(3, 1, 1),
            strides=(1, 1, 1),
            kernel_initializer="he_normal",
            activation="relu",
            padding="same",
            name="conv3d_22",
        )(x)
        x = keras.layers.MaxPooling3D(pool_size=(2, 3, 3), name="max_pooling3d_12")(x)

        x = keras.layers.Flatten(name="flatten_1")(x)
        x = keras.layers.Dense(128, activation="relu", name="dense_1")(x)
        x = keras.layers.Dropout(0.2, name="dropout_1")(x)
        x = keras.layers.Dense(32, activation="relu", name="dense_2")(x)
        pred = keras.layers.Dense(2, activation="softmax", name="dense_3")(x)

        return keras.Model(inputs=inputs, outputs=pred)

    def _sample_video_frames(self, video_path, target_fps):
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise ValueError(f"Could not open video: {video_path}")

        source_fps = float(cap.get(cv2.CAP_PROP_FPS) or 0.0)
        frame_interval = 1.0
        if source_fps > 0 and target_fps > 0:
            frame_interval = max(source_fps / target_fps, 1.0)

        frame_index = 0
        next_sample_frame = 0.0
        frames = []

        while True:
            ok, frame = cap.read()
            if not ok:
                break

            if frame_index + 1e-9 < next_sample_frame:
                frame_index += 1
                continue

            frame = cv2.resize(
                frame,
                (self.frame_width, self.frame_height),
                interpolation=cv2.INTER_AREA,
            )
            frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            frames.append(frame)

            frame_index += 1
            next_sample_frame += frame_interval

        cap.release()

        if not frames:
            raise ValueError(f"No frames extracted from video: {video_path}")

        return np.asarray(frames, dtype=np.float32), source_fps

    def _fit_sequence_length(self, frames):
        if len(frames) == self.sequence_length:
            return frames

        if len(frames) > self.sequence_length:
            indices = np.linspace(0, len(frames) - 1, self.sequence_length).astype(int)
            return frames[indices]

        pad_count = self.sequence_length - len(frames)
        padding = np.repeat(frames[-1][np.newaxis, ...], pad_count, axis=0)
        return np.concatenate([frames, padding], axis=0)

    def _get_optical_flow(self, video):
        gray_video = []
        for frame in video:
            gray = cv2.cvtColor(frame.astype(np.uint8), cv2.COLOR_RGB2GRAY)
            gray_video.append(np.reshape(gray, (self.frame_height, self.frame_width, 1)))

        flows = []
        for index in range(len(gray_video) - 1):
            flow = cv2.calcOpticalFlowFarneback(
                gray_video[index],
                gray_video[index + 1],
                None,
                0.5,
                3,
                15,
                3,
                5,
                1.2,
                cv2.OPTFLOW_FARNEBACK_GAUSSIAN,
            )
            flow[..., 0] -= np.mean(flow[..., 0])
            flow[..., 1] -= np.mean(flow[..., 1])
            flow[..., 0] = cv2.normalize(flow[..., 0], None, 0, 255, cv2.NORM_MINMAX)
            flow[..., 1] = cv2.normalize(flow[..., 1], None, 0, 255, cv2.NORM_MINMAX)
            flows.append(flow)

        flows.append(np.zeros((self.frame_height, self.frame_width, 2), dtype=np.float32))
        return np.asarray(flows, dtype=np.float32)

    def _build_model_input(self, frames):
        fitted_frames = self._fit_sequence_length(frames)
        flows = self._get_optical_flow(fitted_frames)

        result = np.zeros(
            (self.sequence_length, self.frame_height, self.frame_width, 5),
            dtype=np.float32,
        )
        result[..., :3] = fitted_frames
        result[..., 3:] = flows
        return result

    def analyze_frames(self, frames, source_fps=None, target_fps=24.0):
        resized_frames = []
        for frame in frames:
            resized = cv2.resize(
                frame,
                (self.frame_width, self.frame_height),
                interpolation=cv2.INTER_AREA,
            )
            rgb = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
            resized_frames.append(rgb)

        sampled_frames = np.asarray(resized_frames, dtype=np.float32)
        if len(sampled_frames) == 0:
            raise ValueError("No frames provided for violence analysis")

        model_input = self._build_model_input(sampled_frames)
        prediction = self.model.predict(
            np.expand_dims(model_input, axis=0),
            verbose=0,
        )
        violence_score = float(prediction[0][0])

        return {
            "source_fps": source_fps,
            "target_fps": target_fps,
            "sampled_frames_before_fit": int(len(sampled_frames)),
            "sequence_length": self.sequence_length,
            "violence_score": violence_score,
            "threshold": self.threshold,
            "has_violence": violence_score > self.threshold,
        }

    def analyze_video(self, video_path, target_fps=24.0):
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

        sampled_frames, source_fps = self._sample_video_frames(video_path, target_fps)
        result = self.analyze_frames(
            frames=sampled_frames,
            source_fps=source_fps,
            target_fps=target_fps,
        )
        result["video_path"] = str(video_path)
        return result


def _build_parser():
    parser = argparse.ArgumentParser(
        description="Analyze a video and return whether violence is detected."
    )
    parser.add_argument("video_path", help="Path to the input video")
    parser.add_argument("--target-fps", type=float, default=24.0)
    parser.add_argument("--threshold", type=float, default=0.5)
    parser.add_argument("--model-path", default=None)
    return parser


def main():
    parser = _build_parser()
    args = parser.parse_args()
    detector = VideoViolenceDetector(
        model_path=args.model_path,
        threshold=args.threshold,
    )
    result = detector.analyze_video(
        video_path=args.video_path,
        target_fps=args.target_fps,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
