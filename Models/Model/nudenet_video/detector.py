import argparse
import json
from pathlib import Path

import cv2
import numpy as np


LABELS = [
    "FEMALE_GENITALIA_COVERED",
    "FACE_FEMALE",
    "BUTTOCKS_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_BREAST_EXPOSED",
    "ANUS_EXPOSED",
    "FEET_EXPOSED",
    "BELLY_COVERED",
    "FEET_COVERED",
    "ARMPITS_COVERED",
    "ARMPITS_EXPOSED",
    "FACE_MALE",
    "BELLY_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "ANUS_COVERED",
    "FEMALE_BREAST_COVERED",
    "BUTTOCKS_COVERED",
]

DEFAULT_NUDITY_CLASSES = {
    "BUTTOCKS_EXPOSED",
    "FEMALE_BREAST_EXPOSED",
    "FEMALE_GENITALIA_EXPOSED",
    "MALE_GENITALIA_EXPOSED",
    "ANUS_EXPOSED",
}


def _default_model_path():
    return Path(__file__).resolve().parents[2] / "NudeNet" / "nudenet" / "320n.onnx"


def _ensure_bgr(image):
    if image is None:
        raise ValueError("image could not be loaded")
    if image.ndim == 2:
        return cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
    if image.shape[2] == 4:
        return cv2.cvtColor(image, cv2.COLOR_BGRA2BGR)
    return image


def _read_image(image, target_size=320):
    if isinstance(image, (str, Path)):
        mat = cv2.imread(str(image))
    elif isinstance(image, np.ndarray):
        mat = image
    else:
        raise ValueError("image must be a path or numpy array")

    mat_c3 = _ensure_bgr(mat)
    image_original_width, image_original_height = mat_c3.shape[1], mat_c3.shape[0]

    max_size = max(mat_c3.shape[:2])
    x_pad = max_size - mat_c3.shape[1]
    y_pad = max_size - mat_c3.shape[0]

    mat_pad = cv2.copyMakeBorder(mat_c3, 0, y_pad, 0, x_pad, cv2.BORDER_CONSTANT)
    input_blob = cv2.dnn.blobFromImage(
        mat_pad,
        1 / 255.0,
        (target_size, target_size),
        (0, 0, 0),
        swapRB=True,
        crop=False,
    )

    return (
        input_blob,
        x_pad,
        y_pad,
        image_original_width,
        image_original_height,
    )


def _postprocess(
    output,
    x_pad,
    y_pad,
    image_original_width,
    image_original_height,
    model_width,
    model_height,
    score_threshold,
    nms_threshold,
):
    outputs = np.transpose(np.squeeze(output[0]))
    if outputs.ndim == 1:
        outputs = np.expand_dims(outputs, axis=0)

    boxes = []
    scores = []
    class_ids = []

    for row in outputs:
        classes_scores = row[4:]
        max_score = float(np.amax(classes_scores))
        if max_score < score_threshold:
            continue

        class_id = int(np.argmax(classes_scores))
        x, y, w, h = row[0:4]
        x = x - w / 2
        y = y - h / 2

        x = x * (image_original_width + x_pad) / model_width
        y = y * (image_original_height + y_pad) / model_height
        w = w * (image_original_width + x_pad) / model_width
        h = h * (image_original_height + y_pad) / model_height

        x = max(0, min(x, image_original_width))
        y = max(0, min(y, image_original_height))
        w = min(w, image_original_width - x)
        h = min(h, image_original_height - y)

        class_ids.append(class_id)
        scores.append(max_score)
        boxes.append([x, y, w, h])

    if not boxes:
        return []

    indices = cv2.dnn.NMSBoxes(boxes, scores, score_threshold, nms_threshold)
    if len(indices) == 0:
        return []

    detections = []
    for index in np.array(indices).flatten():
        x, y, w, h = boxes[index]
        detections.append(
            {
                "class": LABELS[class_ids[index]],
                "score": float(scores[index]),
                "box": [int(x), int(y), int(w), int(h)],
            }
        )

    return detections


class VideoNudeDetector:
    def __init__(
        self,
        model_path=None,
        inference_resolution=320,
        detection_threshold=0.2,
        nms_threshold=0.45,
    ):
        resolved_model_path = Path(model_path) if model_path else _default_model_path()
        if not resolved_model_path.exists():
            raise FileNotFoundError(f"NudeNet model not found: {resolved_model_path}")

        try:
            import onnxruntime
        except ImportError as exc:  # pragma: no cover - dependency is environment-specific
            raise ImportError(
                "onnxruntime is required to use Model.nudenet_video. "
                "Install it with `pip install onnxruntime`."
            ) from exc

        self.onnx_session = onnxruntime.InferenceSession(str(resolved_model_path))
        self.input_name = self.onnx_session.get_inputs()[0].name
        self.input_width = inference_resolution
        self.input_height = inference_resolution
        self.detection_threshold = detection_threshold
        self.nms_threshold = nms_threshold

    def detect(self, image):
        (
            preprocessed_image,
            x_pad,
            y_pad,
            image_original_width,
            image_original_height,
        ) = _read_image(image, self.input_width)
        outputs = self.onnx_session.run(None, {self.input_name: preprocessed_image})
        return _postprocess(
            outputs,
            x_pad,
            y_pad,
            image_original_width,
            image_original_height,
            self.input_width,
            self.input_height,
            self.detection_threshold,
            self.nms_threshold,
        )

    def analyze_frames(
        self,
        frames,
        source_fps=None,
        stop_on_first_match=False,
        positive_classes=None,
        min_positive_score=None,
    ):
        sampled_frames = 0
        matches = []
        positive_classes = set(positive_classes or DEFAULT_NUDITY_CLASSES)

        for frame_index, frame in enumerate(frames):
            detections = self.detect(frame)
            sampled_frames += 1
            nudity_detections = [
                detection
                for detection in detections
                if detection["class"] in positive_classes
                and (
                    min_positive_score is None
                    or detection["score"] >= min_positive_score
                )
            ]
            if not nudity_detections:
                continue

            timestamp = frame_index / source_fps if source_fps else None
            matches.append(
                {
                    "frame_index": frame_index,
                    "timestamp_seconds": timestamp,
                    "detections": nudity_detections,
                }
            )
            if stop_on_first_match:
                break

        return {
            "source_fps": source_fps,
            "sampled_frames": sampled_frames,
            "has_nudity": bool(matches),
            "match_count": len(matches),
            "positive_classes": sorted(positive_classes),
            "min_positive_score": min_positive_score,
            "matches": matches,
        }

    def analyze_video(
        self,
        video_path,
        target_fps=24.0,
        max_frames=None,
        stop_on_first_match=False,
        positive_classes=None,
    ):
        video_path = Path(video_path)
        if not video_path.exists():
            raise FileNotFoundError(f"Video not found: {video_path}")

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

            frames.append(frame)
            if max_frames is not None and len(frames) >= max_frames:
                break

            frame_index += 1
            next_sample_frame += frame_interval

        cap.release()

        result = self.analyze_frames(
            frames=frames,
            source_fps=target_fps if target_fps > 0 else source_fps,
            stop_on_first_match=stop_on_first_match,
            positive_classes=positive_classes,
            min_positive_score=None,
        )
        result.update(
            {
                "video_path": str(video_path),
                "source_fps": source_fps,
                "target_fps": target_fps,
            }
        )
        return result


def _build_parser():
    parser = argparse.ArgumentParser(
        description="Analyze a video and return whether nudity is detected."
    )
    parser.add_argument("video_path", help="Path to the input video")
    parser.add_argument("--target-fps", type=float, default=24.0)
    parser.add_argument("--max-frames", type=int, default=None)
    parser.add_argument("--stop-on-first-match", action="store_true")
    parser.add_argument("--model-path", default=None)
    return parser


def main():
    parser = _build_parser()
    args = parser.parse_args()
    detector = VideoNudeDetector(model_path=args.model_path)
    result = detector.analyze_video(
        video_path=args.video_path,
        target_fps=args.target_fps,
        max_frames=args.max_frames,
        stop_on_first_match=args.stop_on_first_match,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
