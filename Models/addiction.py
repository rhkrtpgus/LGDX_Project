"""
AI Kids TV Addiction Monitor v2
================================
기본 기능:
- TV 시청 시간 추적
- 감정 분석(DeepFace)
- 눈 깜박임 감지(EAR 기반)
- 자세 움직임 분석(MediaPipe Pose)
- 위험도 점수(0~100) 실시간 계산
- 경고 및 안내 메시지 생성
- 로그 저장(JSON)
- OpenCV 미리보기 HUD

추가 기능:
- Head Pose Detection (Yaw / Pitch / Roll)
- 화면 거리 추정(양 눈 거리 기반)
- 집중도 점수(0~100) 계산
- CSV 데이터셋 자동 생성
"""

import argparse
import cv2
import mediapipe as mp
import time
import numpy as np
import json
import os
import csv
from collections import deque
from datetime import datetime
import threading
import uuid
from types import SimpleNamespace

from API import fetch_youtube_video_context
from mongo_monitor_store import MongoMonitorStore

# ?????????????????????????????????????????
# ?ㅼ젙媛?(?쒕떇 媛??
# ?????????????????????????????????????????

CONFIG = {
    # ìì²­ ìê° ìë´ ê¸°ì¤(ì´)
    "warn_watch_time_1": 30 * 60,
    "warn_watch_time_2": 60 * 60,
    "warn_watch_time_3": 90 * 60,

    # ë ê¹ë°ì(EAR ê¸°ë°)
    "ear_threshold": 0.27,
    "blink_cooldown": 0.25,
    "normal_bpm_min": 10,
    "normal_bpm_max": 20,

    # ìì¸ ìì§ì ê°ì§
    "pose_window": 30,
    "stillness_threshold": 0.015,
    "still_warn_sec": 900,

    # Head pose ìê³ê°(ë)
    "head_yaw_threshold": 25.0,
    "head_pitch_threshold": 20.0,
    "head_roll_threshold": 20.0,

    # íë©´ ê±°ë¦¬ ì¶ì 
    "focal_length_px": 600.0,
    "avg_ipd_mm": 63.0,
    "safe_distance_min_cm": 50.0,
    "safe_distance_max_cm": 200.0,
    "back_wall_clearance_cm": 20.0,
    "distance_min_ratio_to_wall": 0.35,
    "distance_max_ratio_to_wall": 0.72,
    "auto_wall_buffer_cm": 35.0,
    "auto_wall_min_sample_cm": 80.0,

    # 적응형 기준 거리 (평균 기반 알람)
    "distance_baseline_min_samples": 25,   # 기준 확립에 필요한 최소 샘플 수 (~25초)
    "distance_near_factor": 0.72,          # 기준의 72% 미만 → 너무 가까움 (28% 이상 가까워짐)
    "distance_far_factor": 1.45,           # 기준의 145% 초과 → 너무 멀어짐 (45% 이상 멀어짐)

    # ì§ì¤ë ì ì ê°ì¤ì¹
    "focus_weight_head": 0.35,
    "focus_weight_blink": 0.25,
    "focus_weight_pose": 0.25,
    "focus_weight_distance": 0.15,

    # ê°ì  ë¶ì
    "negative_emotions": ["sad", "angry", "fear", "disgust"],
    "positive_emotions": ["happy", "surprise"],
    "emotion_interval": 300.0,
    "emotion_face_padding_ratio": 0.15,
    "emotion_face_input_size": 112,

    # ìíë ê°ì¤ì¹
    "weight_time": 0.30,
    "weight_blink": 0.25,
    "weight_pose": 0.25,
    "weight_emotion": 0.20,
    "education_category_risk_discount": 12.0,
    "short_form_max_seconds": 180,
    "short_form_risk_bonus": 15.0,
    "education_categories": ["Education", "êµì¡"],

    # ë¡ê·¸ ë° ì ì¥
    "log_interval": 60,
    "csv_interval": 1.0,
    "log_path": "kids_monitor_log.json",
    "csv_path": "kids_monitor_dataset.csv",
    "mongo_enabled": os.getenv("MONGO_ENABLED", "true").lower() in {"1", "true", "yes", "on"},
    "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
    "mongo_database": os.getenv("MONGO_DATABASE", "lgdx_monitor"),

    # ë¯¸ë¦¬ë³´ê¸° íë©´
    "display_width": 1280,
    "display_height": 720,
    "preview_window_name": "Kids Monitor Demo Preview",
    "mask_blur_kernel": 51,
}

# ---------------------------------------------------------------------------
# MediaPipe ëª¨ë
# ---------------------------------------------------------------------------
mp_face_mesh = None
mp_pose = None
mp_drawing = None
face_mesh = None
pose = None


class _DummyProcessor:
    def process(self, _image):
        return SimpleNamespace(
            multi_face_landmarks=None,
            pose_landmarks=None,
        )


def initialize_mediapipe():
    global mp_face_mesh, mp_pose, mp_drawing, face_mesh, pose

    if face_mesh is not None and pose is not None:
        return

    if not hasattr(mp, "solutions"):
        print(
            "[WARN] mediapipe.solutions를 사용할 수 없어 랜드마크 없는 기본 카메라 모드로 진행합니다."
        )
        mp_face_mesh = None
        mp_pose = None
        mp_drawing = None
        face_mesh = _DummyProcessor()
        pose = _DummyProcessor()
        return

    mp_face_mesh = mp.solutions.face_mesh
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    face_mesh = mp_face_mesh.FaceMesh(
        max_num_faces=4,
        refine_landmarks=True,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )
    pose = mp_pose.Pose(
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5
    )


def fail_monitor_run(mongo_store, state, *, event_type: str, message: str, metrics=None):
    print(message)
    if mongo_store is None:
        return

    try:
        mongo_store.upsert_session_start(state)
        mongo_store.insert_event(
            state,
            event_type=event_type,
            event_level="ERROR",
            message=message,
            metrics=metrics,
        )
        mongo_store.mark_session_failed(state, reason=message)
    except Exception as exc:
        print(f"[WARN] Failed to persist MongoDB failure event: {exc}")

# ?????????????????????????????????????????
# [?좉퇋] Head Pose 異붿젙??3D ?쇨뎬 湲곗???# ?ㅼ젣 ?쇨뎬 醫뚰몴怨?(mm ?⑥쐞, ?뺣㈃ 湲곗? ?먯젏)
# 李멸퀬: Kazemi & Sullivan (2014) 紐⑤뜽
# ?????????????????????????????????????????
FACE_3D_MODEL = np.array([
    [0.0,    0.0,    0.0],      # 肄붾걹 (landmark 1)
    [0.0,   -330.0, -65.0],     # ????(landmark 152)
    [-225.0, 170.0, -135.0],    # ?쇱そ ??醫뚯륫 ??(landmark 263)
    [225.0,  170.0, -135.0],    # ?ㅻⅨ履????곗륫 ??(landmark 33)
    [-150.0, -150.0, -125.0],   # ?쇱そ ????(landmark 287)
    [150.0,  -150.0, -125.0],   # ?ㅻⅨ履?????(landmark 57)
], dtype=np.float64)

# ??3D 湲곗??먯뿉 ??묓븯??MediaPipe Face Mesh ?쒕뱶留덊겕 ?몃뜳??FACE_3D_INDICES = [1, 152, 263, 33, 287, 57]

FACE_MASK_INDICES = sorted(set([
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
]))

# ?????????????????????????????????????????
# ?곹깭 ?대옒??# ?????????????????????????????????????????
class KidsMonitorState:
    def __init__(self):
        self.session_start = time.time()
        self.watch_time = 0
        self.session_id = f"session-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
        self.user_id = None
        self.child_id = None
        self.analysis_id = None

        # ??源쒕컯??
        self.blink_count = 0
        self.last_blink_time = 0
        self.blink_timestamps = deque(maxlen=200)
        self.ear_history = deque(maxlen=90)
        self.eye_closed = False
        self.eye_closed_started_at = None
        self.last_face_detected_at = 0.0

        # ?먯꽭
        self.pose_history = deque(maxlen=300)
        self.still_start_time = None
        self.still_duration = 0
        self.last_shoulder_pos = None

        # 媛먯젙
        self.emotion_label = "unknown"
        self.emotion_history = deque(maxlen=50)
        self.negative_ratio = 0.0
        self.last_emotion_time = 0
        self.emotion_lock = threading.Lock()

        # ?꾪뿕??
        self.risk_score = 0
        self.risk_level = "?뺤긽"
        self.content_risk_adjustment = 0.0
        self.content_risk_reasons = []

        # ?뚮┝
        self.active_warnings = []
        self.warning_log = []

        # YouTube 硫뷀??곗씠??
        self.youtube_url = None
        self.youtube_video_id = None
        self.youtube_title = None
        self.youtube_category_en = None
        self.youtube_category_ko = None
        self.youtube_duration_seconds = 0
        self.youtube_is_short_form = False

        # ?? [?좉퇋] Head Pose ?곹깭
        self.head_yaw = 0.0             # 醫뚯슦 ?뚯쟾媛?(??
        self.head_pitch = 0.0           # ?곹븯 ?뚯쟾媛?(??
        self.head_roll = 0.0            # 湲곗슱湲?(??
        self.head_is_front = True       # ?뺣㈃ ?묒떆 ?щ?

        # ?? [?좉퇋] ?붾㈃ 嫄곕━ ?곹깭
        self.screen_distance_cm = 0.0   # 異붿젙 嫄곕━ (cm)
        self.distance_ok = True         # ?곸젙 嫄곕━ ?щ?

        # ?? [?좉퇋] 吏묒쨷??Score
        self.focus_score = 0.0          # 0~100, ?믪쓣?섎줉 吏묒쨷
        self.focus_history = deque(maxlen=300)  # 理쒓렐 5遺?湲곕줉
        self.risk_history = deque(maxlen=300)
        self.telemetry_sample_count = 0
        self.focus_score_sum = 0.0
        self.risk_score_sum = 0.0
        self.front_facing_count = 0
        self.safe_distance_count = 0
        self.max_focus_score = 0.0
        self.min_focus_score = 100.0
        self.max_risk_score = 0.0
        self.last_child_messages = []
        self.last_child_message_trigger = None
        self.last_child_message_changed_at = 0.0
        # 以묐룆 愿由??덈궡(?먯꽭/??嫄곕━) 硫붿떆吏 ?몄텧 ?щ?.
        # 湲곕낯媛믪? 耳쒖쭚?대ŉ, watch-only ?쒕굹由ъ삤?먯꽌??CLI ?듭뀡?쇰줈 ?????덈떎.
        self.care_guidance_enabled = True
        self.blink_guidance_enabled = True
        self.posture_guidance_enabled = True
        self.distance_guidance_enabled = True
        self.back_wall_distance_cm = None
        self.back_wall_distance_manual = False
        self.recommended_distance_min_cm = CONFIG["safe_distance_min_cm"]
        self.recommended_distance_max_cm = CONFIG["safe_distance_max_cm"]
        self.distance_samples = deque(maxlen=180)

        # 적응형 기준 거리 (평균 기반)
        self.distance_baseline_cm = 0.0
        self.distance_baseline_samples = deque(maxlen=120)  # 최근 2분치 샘플
        self.distance_baseline_ready = False

        # 濡쒓렇
        self.log_data = []
        self.last_log_time = time.time()
        self.last_csv_time = time.time()  # [?좉퇋] CSV ?????대㉧

    def update_watch_time(self):
        self.watch_time = int(time.time() - self.session_start)

    def minutes(self):
        return self.watch_time // 60

    def seconds_rem(self):
        return self.watch_time % 60

    def apply_youtube_context(self, context):
        self.youtube_url = context.input_url
        self.youtube_video_id = context.video_id
        self.youtube_title = context.title
        self.youtube_category_en = context.category_name_en
        self.youtube_category_ko = context.category_name_ko
        self.youtube_duration_seconds = context.duration_seconds
        self.youtube_is_short_form = context.is_short_form


def record_sample_metrics(state: KidsMonitorState):
    state.telemetry_sample_count += 1
    state.focus_score_sum += state.focus_score
    state.risk_score_sum += state.risk_score
    state.max_focus_score = max(state.max_focus_score, state.focus_score)
    state.min_focus_score = min(state.min_focus_score, state.focus_score)
    state.max_risk_score = max(state.max_risk_score, state.risk_score)

    if state.head_is_front:
        state.front_facing_count += 1
    if state.distance_ok:
        state.safe_distance_count += 1


# ?????????????????????????????????????????
# EAR 怨꾩궛 (?묒そ ???됯퇏)
# ?????????????????????????????????????????
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

def calculate_EAR(landmarks, eye_indices):
    """Eye Aspect Ratio: ?섏쭅/?섑룊 嫄곕━ 鍮꾩쑉濡???媛먭? ?먮떒"""
    pts = landmarks[eye_indices]
    A = np.linalg.norm(pts[1] - pts[5])    # ?섏쭅 嫄곕━ 1
    B = np.linalg.norm(pts[2] - pts[4])    # ?섏쭅 嫄곕━ 2
    C = np.linalg.norm(pts[0] - pts[3])    # ?섑룊 嫄곕━
    if C < 1e-6:
        return 0.3
    return (A + B) / (2.0 * C)

def get_avg_EAR(landmarks):
    left  = calculate_EAR(landmarks, LEFT_EYE)
    right = calculate_EAR(landmarks, RIGHT_EYE)
    return (left + right) / 2.0


def get_dynamic_blink_threshold(state: KidsMonitorState) -> tuple[float, float]:
    recent_ears = list(state.ear_history)[-45:]
    if len(recent_ears) < 10:
        close_threshold = CONFIG["ear_threshold"]
    else:
        open_reference = float(np.percentile(recent_ears, 75))
        close_threshold = min(CONFIG["ear_threshold"], open_reference * 0.85)
        close_threshold = max(0.19, close_threshold)

    reopen_threshold = close_threshold + 0.035
    return close_threshold, reopen_threshold


def has_reliable_blink_signal(state: KidsMonitorState) -> bool:
    if len(state.ear_history) < 20:
        return False
    if not state.last_face_detected_at:
        return False
    return (time.time() - state.last_face_detected_at) <= 2.0


# ?????????????????????????????????????????
# [?좉퇋] Head Pose Detection
# PnP(Perspective-n-Point) ?뚭퀬由ъ쬁?쇰줈
# 3D ?쇨뎬 紐⑤뜽 ??2D ?대?吏 ?ъ쁺 ??궛?섏뿬
# 移대찓??醫뚰몴怨?湲곗? ?뚯쟾 踰≫꽣(rvec) 異붿젙
# ?????????????????????????????????????????
def estimate_head_pose(landmarks_raw, frame_w, frame_h, state: KidsMonitorState):
    """
    MediaPipe ?쒕뱶留덊겕 ??OpenCV solvePnP ???ㅼ씪??媛곷룄 (Yaw, Pitch, Roll)
    諛섑솚: (yaw, pitch, roll) ?⑥쐞 ??degree)
    """
    # 2D ?대?吏 醫뚰몴 異붿텧 (?쎌? ?⑥쐞)
    img_pts = np.array([
        [landmarks_raw[i].x * frame_w,
         landmarks_raw[i].y * frame_h]
        for i in FACE_3D_INDICES
    ], dtype=np.float64)

    # 移대찓???대? ?뚮씪誘명꽣 ?됰젹 (洹쇱궗移? 罹섎━釉뚮젅?댁뀡 ?놁씠 ?ъ슜)
    # fx = fy = focal_length, cx = ?대?吏 以묒떖
    focal = CONFIG["focal_length_px"]
    cam_matrix = np.array([
        [focal, 0,     frame_w / 2],
        [0,     focal, frame_h / 2],
        [0,     0,     1          ]
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4, 1), dtype=np.float64)  # ?쒓끝 怨꾩닔 臾댁떆

    success, rvec, tvec = cv2.solvePnP(
        FACE_3D_MODEL,
        img_pts,
        cam_matrix,
        dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE
    )

    if not success:
        return state.head_yaw, state.head_pitch, state.head_roll

    # ?뚯쟾 踰≫꽣 ???뚯쟾 ?됰젹 ???ㅼ씪??媛곷룄 蹂??    rot_mat, _ = cv2.Rodrigues(rvec)

    # ?ㅼ씪??媛곷룄 異붿텧 (ZYX ?쒖꽌)
    # pitch: X異?(?곹븯), yaw: Y異?(醫뚯슦), roll: Z異?(湲곗슱湲?
    sy = np.sqrt(rot_mat[0, 0]**2 + rot_mat[1, 0]**2)
    singular = sy < 1e-6

    if not singular:
        pitch = np.arctan2(-rot_mat[2, 0], sy)
        yaw   = np.arctan2(rot_mat[2, 1], rot_mat[2, 2])
        roll  = np.arctan2(rot_mat[1, 0], rot_mat[0, 0])
    else:
        # 吏먮쾶???뚰뵾
        pitch = np.arctan2(-rot_mat[2, 0], sy)
        yaw   = np.arctan2(-rot_mat[1, 2], rot_mat[1, 1])
        roll  = 0.0

    yaw_deg   = np.degrees(yaw)
    pitch_deg = np.degrees(pitch)
    roll_deg  = np.degrees(roll)

    # ?뺣㈃ ?묒떆 ?먮떒: 紐⑤뱺 媛곷룄媛 ?꾧퀎媛??대궡
    is_front = (
        abs(yaw_deg)   < CONFIG["head_yaw_threshold"] and
        abs(pitch_deg) < CONFIG["head_pitch_threshold"] and
        abs(roll_deg)  < CONFIG["head_roll_threshold"]
    )

    return yaw_deg, pitch_deg, roll_deg, is_front


# ?????????????????????????????????????????
# [?좉퇋] ?붾㈃ 嫄곕━ 痢≪젙
# ?먮━: ?쇨컖痢〓웾 - ?뚮젮吏?臾쇱껜(?숆났 媛?嫄곕━) ?ш린?
#       ?대?吏 ???쎌? ?ш린 鍮꾩쑉濡?源딆씠(Z) 異붿젙
# 怨듭떇: distance = (focal_length 횞 real_IPD) / pixel_IPD
# ?????????????????????????????????????????

# MediaPipe refine_landmarks=True ???숆났 ?쒕뱶留덊겕 ?몃뜳??LEFT_PUPIL  = 468   # ?쇱そ ?숆났 以묒떖
RIGHT_PUPIL = 473   # ?ㅻⅨ履??숆났 以묒떖

def estimate_screen_distance(landmarks_raw, frame_w, frame_h):
    """
    ?숆났 媛??쎌? 嫄곕━瑜??댁슜???붾㈃-?쇨뎬 嫄곕━ 異붿젙 (cm)
    refine_landmarks=True ?꾩닔 (?숆났 ?쒕뱶留덊겕 ?ъ슜)
    """
    lp = landmarks_raw[LEFT_PUPIL]
    rp = landmarks_raw[RIGHT_PUPIL]

    # ?쎌? 醫뚰몴 蹂??    lp_px = np.array([lp.x * frame_w, lp.y * frame_h])
    rp_px = np.array([rp.x * frame_w, rp.y * frame_h])

    # ?대?吏 ???숆났 媛?嫄곕━ (?쎌?)
    pixel_ipd = np.linalg.norm(lp_px - rp_px)

    if pixel_ipd < 1.0:
        return 0.0  # 媛먯? ?ㅽ뙣

    # 嫄곕━ 異붿젙 (mm ??cm 蹂??
    distance_mm = (CONFIG["focal_length_px"] * CONFIG["avg_ipd_mm"]) / pixel_ipd
    distance_cm = distance_mm / 10.0

    return round(distance_cm, 1)


def get_recommended_distance_range(state: KidsMonitorState) -> tuple[float, float]:
    # 적응형 베이스라인이 확립된 경우 개인 맞춤 범위를 우선 사용
    if state.distance_baseline_ready and state.distance_baseline_cm > 0:
        baseline = state.distance_baseline_cm
        near_limit = round(baseline * CONFIG["distance_near_factor"], 1)
        far_limit  = round(baseline * CONFIG["distance_far_factor"], 1)
        return near_limit, far_limit

    # 베이스라인 미확립 시 기존 벽 기반 / 고정 범위 사용 (fallback)
    base_min = float(CONFIG["safe_distance_min_cm"])
    base_max = float(CONFIG["safe_distance_max_cm"])
    wall_distance = state.back_wall_distance_cm

    if wall_distance is None or wall_distance <= 0:
        return base_min, base_max

    clearance = float(CONFIG["back_wall_clearance_cm"])
    wall_based_min = wall_distance * float(CONFIG["distance_min_ratio_to_wall"])
    wall_based_max = wall_distance * float(CONFIG["distance_max_ratio_to_wall"])

    recommended_min = max(base_min, round(wall_based_min, 1))
    recommended_max = min(base_max, round(wall_based_max, 1), round(wall_distance - clearance, 1))

    if recommended_max <= recommended_min:
        recommended_max = min(base_max, round(wall_distance - clearance, 1))
        recommended_min = max(base_min, min(recommended_min, recommended_max - 10.0))

    if recommended_max <= recommended_min:
        return base_min, base_max

    return recommended_min, recommended_max


def update_distance_profile(state: KidsMonitorState, observed_distance_cm: float) -> None:
    if observed_distance_cm <= 0:
        state.recommended_distance_min_cm, state.recommended_distance_max_cm = (
            get_recommended_distance_range(state)
        )
        return

    state.distance_samples.append(observed_distance_cm)

    # 적응형 베이스라인 갱신: 유효 샘플의 중앙값을 기준 거리로 사용
    state.distance_baseline_samples.append(observed_distance_cm)
    if len(state.distance_baseline_samples) >= CONFIG["distance_baseline_min_samples"]:
        state.distance_baseline_cm = float(np.median(list(state.distance_baseline_samples)))
        state.distance_baseline_ready = True

    if not state.back_wall_distance_manual:
        valid_samples = [
            sample for sample in state.distance_samples
            if sample >= CONFIG["auto_wall_min_sample_cm"]
        ]
        if len(valid_samples) >= 10:
            top_count = max(3, len(valid_samples) // 5)
            farthest_samples = sorted(valid_samples)[-top_count:]
            estimated_wall = max(farthest_samples) + CONFIG["auto_wall_buffer_cm"]
            state.back_wall_distance_cm = round(estimated_wall, 1)

    state.recommended_distance_min_cm, state.recommended_distance_max_cm = (
        get_recommended_distance_range(state)
    )


def mask_face_from_landmarks(frame, landmarks_raw):
    frame_h, frame_w = frame.shape[:2]
    points = np.array(
        [
            [int(landmarks_raw[i].x * frame_w), int(landmarks_raw[i].y * frame_h)]
            for i in FACE_MASK_INDICES
        ],
        dtype=np.int32,
    )

    if len(points) < 3:
        return frame

    hull = cv2.convexHull(points)
    mask = np.zeros((frame_h, frame_w), dtype=np.uint8)
    cv2.fillConvexPoly(mask, hull, 255)

    kernel = CONFIG["mask_blur_kernel"]
    if kernel % 2 == 0:
        kernel += 1
    blurred = cv2.GaussianBlur(frame, (kernel, kernel), 0)

    output = frame.copy()
    output[mask == 255] = blurred[mask == 255]
    return output


def extract_private_face_crop(frame, landmarks_raw):
    frame_h, frame_w = frame.shape[:2]
    points = np.array(
        [
            [int(landmarks_raw[i].x * frame_w), int(landmarks_raw[i].y * frame_h)]
            for i in FACE_MASK_INDICES
        ],
        dtype=np.int32,
    )

    if len(points) < 3:
        return None

    x, y, w, h = cv2.boundingRect(points)
    pad_w = int(w * CONFIG["emotion_face_padding_ratio"])
    pad_h = int(h * CONFIG["emotion_face_padding_ratio"])

    x1 = max(0, x - pad_w)
    y1 = max(0, y - pad_h)
    x2 = min(frame_w, x + w + pad_w)
    y2 = min(frame_h, y + h + pad_h)

    if x2 <= x1 or y2 <= y1:
        return None

    cropped = frame[y1:y2, x1:x2].copy()
    if cropped.size == 0:
        return None

    crop_points = points - np.array([x1, y1], dtype=np.int32)
    mask = np.zeros(cropped.shape[:2], dtype=np.uint8)
    cv2.fillConvexPoly(mask, cv2.convexHull(crop_points), 255)

    isolated = np.zeros_like(cropped)
    isolated[mask == 255] = cropped[mask == 255]

    target_size = CONFIG["emotion_face_input_size"]
    isolated = cv2.resize(
        isolated,
        (target_size, target_size),
        interpolation=cv2.INTER_AREA,
    )
    return isolated


def get_blink_status(bpm: int) -> str:
    if bpm < CONFIG["normal_bpm_min"]:
        return "low"
    if bpm > CONFIG["normal_bpm_max"]:
        return "high"
    return "normal"


def compute_blink_focus_score(bpm: int) -> float:
    min_bpm = CONFIG["normal_bpm_min"]
    max_bpm = CONFIG["normal_bpm_max"]
    status = get_blink_status(bpm)

    if status == "normal":
        center = (min_bpm + max_bpm) / 2
        half_range = max((max_bpm - min_bpm) / 2, 1.0)
        deviation = abs(bpm - center) / half_range
        return max(85.0, 100.0 - deviation * 15.0)

    if status == "low":
        deficit = min_bpm - bpm
        return max(0.0, 80.0 - deficit * 12.0)

    excess = bpm - max_bpm
    return max(0.0, 80.0 - excess * 8.0)


def compute_blink_risk_score(bpm: int) -> float:
    min_bpm = max(CONFIG["normal_bpm_min"], 1)
    max_bpm = max(CONFIG["normal_bpm_max"], 1)
    status = get_blink_status(bpm)

    if status == "normal":
        return 0.0
    if status == "low":
        return min(100.0, (min_bpm - bpm) / min_bpm * 100.0)
    return min(100.0, (bpm - max_bpm) / max_bpm * 100.0)


# ?????????????????????????????????????????
# [?좉퇋] 吏묒쨷??Score 怨꾩궛 (0~100)
# 援ъ꽦 ?붿냼:
#   1. Head Pose: ?뺣㈃ ?묒떆 ?щ?
#   2. ??源쒕컯?? 遺꾨떦 源쒕컯?꾩씠 ?뺤긽 踰붿쐞 ??#   3. ?먯꽭 ?덉젙?? 怨쇰룄???뺤? ?꾨땶 ?곸젙 ?吏곸엫
#   4. ?붾㈃ 嫄곕━: 沅뚯옣 嫄곕━ 踰붿쐞 ??# ?믪? 媛?= 吏묒쨷 以?/ ??? 媛?= 鍮꾩쭛以??먮뒗 ?쇰줈
# ?????????????????????????????????????????
def _legacy_compute_focus_score(state: KidsMonitorState, bpm: int) -> float:
    scores = {}

    # 1) Head Pose: ?뺣㈃?대㈃ 100?? 鍮꾩젙硫댁씠硫?媛곷룄 ?몄감???곕씪 媛먯젏
    if state.head_is_front:
        scores["head"] = 100.0
    else:
        # 媛?異뺤쓽 珥덇낵遺꾩쓣 ?⑹궛?섏뿬 媛먯젏
        yaw_excess   = max(0, abs(state.head_yaw)   - CONFIG["head_yaw_threshold"])
        pitch_excess = max(0, abs(state.head_pitch) - CONFIG["head_pitch_threshold"])
        roll_excess  = max(0, abs(state.head_roll)  - CONFIG["head_roll_threshold"])
        total_excess = yaw_excess + pitch_excess + roll_excess
        scores["head"] = max(0.0, 100.0 - total_excess * 2.5)

    # 2) ??源쒕컯?? ?뺤긽 踰붿쐞(10~30) 以묒븰??媛源뚯슱?섎줉 100??
    if CONFIG["normal_bpm_min"] <= bpm <= CONFIG["normal_bpm_max"]:
        # ?뺤긽 踰붿쐞 以묒븰媛?20)??媛源뚯슱?섎줉 ?믪? ?먯닔
        center = (CONFIG["normal_bpm_min"] + CONFIG["normal_bpm_max"]) / 2
        deviation = abs(bpm - center) / ((CONFIG["normal_bpm_max"] - CONFIG["normal_bpm_min"]) / 2)
        scores["blink"] = 100.0 - deviation * 30.0
    elif bpm < CONFIG["normal_bpm_min"]:
        # ?덈Т ?곸쑝硫?怨쇱쭛以??덇뎄嫄댁“ 媛?μ꽦
        scores["blink"] = max(0.0, 60.0 - (CONFIG["normal_bpm_min"] - bpm) * 10)
    else:
        # ?덈Т 留롮쑝硫??쇰줈 ?먮뒗 ?곕쭔
        scores["blink"] = max(0.0, 70.0 - (bpm - CONFIG["normal_bpm_max"]) * 5)

    # 3) ?먯꽭 ?덉젙?? ?꾩쟾 ?뺤?(怨쇱쭛以?蹂대떎 ?쎄컙???吏곸엫???댁긽??    #    ?뺤? 5遺??댁긽?대㈃ 媛먯젏, ?덈Т 留롮? ?吏곸엫??媛먯젏
    still_ratio = min(state.still_duration / CONFIG["still_warn_sec"], 1.0)
    scores["pose"] = 100.0 - still_ratio * 60.0  # 理쒕? 60??媛먯젏

    # 4) ?붾㈃ 嫄곕━: 沅뚯옣 踰붿쐞 ?대㈃ 100??    d = state.screen_distance_cm
    if d <= 0:
        scores["distance"] = 50.0  # 媛먯? 遺덇? ??以묐┰
    elif CONFIG["safe_distance_min_cm"] <= d <= CONFIG["safe_distance_max_cm"]:
        scores["distance"] = 100.0
    elif d < CONFIG["safe_distance_min_cm"]:
        # ?덈Т 媛源뚯? (?덉뿉 ?좏빐)
        excess = CONFIG["safe_distance_min_cm"] - d
        scores["distance"] = max(0.0, 100.0 - excess * 2.0)
    else:
        # ?덈Т 硫硫??붾㈃ ???덈낫??紐몄쓣 ?욎쑝濡??숈씠??寃쏀뼢
        excess = d - CONFIG["safe_distance_max_cm"]
        scores["distance"] = max(0.0, 100.0 - excess * 1.0)

    # 媛以??⑹궛
    focus = (
        scores["head"]     * CONFIG["focus_weight_head"] +
        scores["blink"]    * CONFIG["focus_weight_blink"] +
        scores["pose"]     * CONFIG["focus_weight_pose"] +
        scores["distance"] * CONFIG["focus_weight_distance"]
    )
    return min(100.0, max(0.0, round(focus, 1)))


# ?????????????????????????????????????????
# 媛먯젙 遺꾩꽍 (蹂꾨룄 ?ㅻ젅??
# ?????????????????????????????????????????
def analyze_emotion_async(face_crop, state: KidsMonitorState):
    try:
        from deepface import DeepFace

        result = DeepFace.analyze(
            face_crop,
            actions=["emotion"],
            enforce_detection=False,
            silent=True
        )
        label = result[0]["dominant_emotion"]
        with state.emotion_lock:
            state.emotion_label = label
            state.emotion_history.append(label)
            neg = sum(1 for e in state.emotion_history
                      if e in CONFIG["negative_emotions"])
            state.negative_ratio = neg / max(len(state.emotion_history), 1)
    except Exception:
        pass
    finally:
        del face_crop


# ?????????????????????????????????????????
# ?먯꽭 遺꾩꽍
# ?????????????????????????????????????????
def analyze_pose(pose_result, state: KidsMonitorState):
    """?닿묠 以묒떖??蹂?붾웾?쇰줈 ?吏곸엫 異붿젙"""
    if not pose_result.pose_landmarks:
        return "媛먯? ?덈맖", 0.0

    lm = pose_result.pose_landmarks.landmark
    left_sh  = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
    right_sh = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]

    if left_sh.visibility < 0.4 or right_sh.visibility < 0.4:
        return "媛먯? ?덈맖", 0.0

    cx = (left_sh.x + right_sh.x) / 2
    cy = (left_sh.y + right_sh.y) / 2

    now = time.time()
    state.pose_history.append((now, np.array([cx, cy])))

    cutoff = now - CONFIG["pose_window"]
    recent = [(t, p) for t, p in state.pose_history if t >= cutoff]

    if len(recent) < 2:
        return "분석 중", 0.0

    positions = np.array([p for _, p in recent])
    movement_dist = float(np.std(positions, axis=0).mean())

    if movement_dist < CONFIG["stillness_threshold"]:
        if state.still_start_time is None:
            state.still_start_time = now
        state.still_duration = now - state.still_start_time
        return "?뺤?", movement_dist
    else:
        if state.still_start_time is not None:
            # 일시적 움직임에도 누적 정체 시간의 50%를 보존
            # (약한 움직임 한 번으로 15분 타이머 전부 초기화되는 문제 방지)
            credit = state.still_duration * 0.5
            state.still_start_time = now - credit
            state.still_duration = credit
        return "?吏곸엫", movement_dist


def compute_content_risk_adjustment(state: KidsMonitorState):
    adjustment = 0.0
    reasons = []
    education_categories = set(CONFIG["education_categories"])

    if (
        state.youtube_category_en in education_categories
        or state.youtube_category_ko in education_categories
    ):
        adjustment -= CONFIG["education_category_risk_discount"]
        reasons.append("교육 카테고리 시청으로 위험도가 완화됨")

    if (
        state.youtube_is_short_form
        and 0 < state.youtube_duration_seconds <= CONFIG["short_form_max_seconds"]
    ):
        adjustment += CONFIG["short_form_risk_bonus"]
        reasons.append("3분 이내 쇼츠형 시청으로 위험도가 증가함")

    # 조정값 상한/하한 클램프 (단일 요인이 전체 점수를 과도하게 왜곡하지 않도록)
    adjustment = max(-15.0, min(15.0, adjustment))
    return adjustment, reasons


# ?????????????????????????????????????????
# ?꾪뿕???먯닔 怨꾩궛 (0~100)
# ?????????????????????????????????????????
def _legacy_compute_risk_score(state: KidsMonitorState) -> tuple:
    scores = {}

    # 1) ?쒖껌 ?쒓컙 ?먯닔
    t = state.watch_time
    if t < CONFIG["warn_watch_time_1"]:
        scores["time"] = t / CONFIG["warn_watch_time_1"] * 40
    elif t < CONFIG["warn_watch_time_2"]:
        scores["time"] = 40 + (t - CONFIG["warn_watch_time_1"]) / (
            CONFIG["warn_watch_time_2"] - CONFIG["warn_watch_time_1"]) * 30
    else:
        scores["time"] = min(100, 70 + (t - CONFIG["warn_watch_time_2"]) / 600 * 30)

    # 2) ??源쒕컯???먯닔
    now = time.time()
    recent_blinks = [ts for ts in state.blink_timestamps if ts > now - 60]
    bpm = len(recent_blinks)
    if CONFIG["normal_bpm_min"] <= bpm <= CONFIG["normal_bpm_max"]:
        scores["blink"] = 10
    elif bpm < CONFIG["normal_bpm_min"]:
        scores["blink"] = max(0, (CONFIG["normal_bpm_min"] - bpm) / CONFIG["normal_bpm_min"] * 100)
    else:
        scores["blink"] = min(100, (bpm - CONFIG["normal_bpm_max"]) / 20 * 60 + 20)

    # 3) ?먯꽭 ?먯닔
    still_ratio = min(state.still_duration / CONFIG["still_warn_sec"], 1.0)
    scores["pose"] = still_ratio * 100

    # 4) 媛먯젙 ?먯닔
    scores["emotion"] = state.negative_ratio * 100

    # 5) [?좉퇋] Head Pose ?먯닔 異붽? 諛섏쁺
    #    鍮꾩젙硫??묒떆媛 吏?띾맆?섎줉 ?꾪뿕?꾩뿉 諛섏쁺
    if not state.head_is_front:
        yaw_e   = max(0, abs(state.head_yaw)   - CONFIG["head_yaw_threshold"])
        pitch_e = max(0, abs(state.head_pitch) - CONFIG["head_pitch_threshold"])
        scores["head_pose"] = min(100, (yaw_e + pitch_e) * 5)
    else:
        scores["head_pose"] = 0

    # 6) [?좉퇋] 嫄곕━ ?꾪뿕 ?먯닔
    d = state.screen_distance_cm
    if 0 < d < CONFIG["safe_distance_min_cm"]:
        scores["distance"] = (CONFIG["safe_distance_min_cm"] - d) / CONFIG["safe_distance_min_cm"] * 100
    else:
        scores["distance"] = 0

    content_adjustment, content_reasons = compute_content_risk_adjustment(state)
    scores["content"] = content_adjustment
    state.content_risk_adjustment = content_adjustment
    state.content_risk_reasons = content_reasons

    # 湲곗〈 4媛?吏??媛以??⑹궛 (head/distance??蹂댁“ 諛섏쁺)
    total = (
        scores["time"]      * CONFIG["weight_time"] +
        scores["blink"]     * CONFIG["weight_blink"] +
        scores["pose"]      * CONFIG["weight_pose"] +
        scores["emotion"]   * CONFIG["weight_emotion"] +
        scores.get("head_pose", 0) * 0.20 +     # 20% 異붽? 諛섏쁺 (고개 돌림 강화)
        scores.get("distance",  0) * 0.15 +      # 15% 異붽? 諛섏쁺 (거리 이탈 강화)
        scores["content"]
    )
    total = min(100, max(0, total))

    if total < 25:
        level = "정상"
    elif total < 50:
        level = "주의"
    elif total < 75:
        level = "경고"
    else:
        level = "위험"

    return total, level, scores


# ?????????????????????????????????????????
# ?꾩씠???됰룞 ?좊룄 硫붿떆吏 ?앹꽦
# ?????????????????????????????????????????

def _legacy_get_child_messages(state: KidsMonitorState, bpm: int) -> list:
    """ìì  ë¦¬ì¤í¸í ìë´ ë©ìì§ë¥¼ ì ì§í´ì¼ í  ë ì¬ì©íë í¸í í¨ì.
    """
    messages = []
    watch_time = state.watch_time

    if watch_time >= CONFIG["warn_watch_time_3"]:
        messages.append("ì¤ë ìì²­ ìê°ì´ 90ë¶ì´ ëìì´ì. ì ì ì¬ì´ë³¼ê¹ì?")
    elif watch_time >= CONFIG["warn_watch_time_2"]:
        messages.append("ì¤ë TVë¥¼ 60ë¶ ìì²­íì´ì. ëì ì ê¹ ì¬ê² í´ì£¼ì¸ì.")
    elif watch_time >= CONFIG["warn_watch_time_1"]:
        messages.append("ì¤ë 30ë¶ ëì ìì²­íì´ì.")

    if state.still_duration >= CONFIG["still_warn_sec"]:
        messages.append("ê°ì ìì¸ê° ì¤ë ì´ì´ì¡ì´ì. ëª¸ì ì­ í´ì£¼ì¸ì.")

    if bpm < 8:
        messages.append("ëì ì²ì²í í ë² ê¹ë°ì¬ ì£¼ì¸ì.")

    if not state.head_is_front:
        messages.append("íë©´ì ë³´ë ë°©í¥ì ì ë©´ì¼ë¡ ë§ì¶°ì£¼ì¸ì.")

    distance_cm = state.screen_distance_cm
    if 0 < distance_cm < CONFIG["safe_distance_min_cm"]:
        messages.append("íë©´ê³¼ ì¡°ê¸ ë ë¨ì´ì ¸ ììì£¼ì¸ì.")
    elif distance_cm > CONFIG["safe_distance_max_cm"]:
        messages.append("íë©´ì´ ì¡°ê¸ ë©ì´ì. ìì¸ë¥¼ ë¤ì ì¡ìë³¼ê¹ì?")

    return messages


# ---------------------------------------------------------------------------
# íì¬ ìí ì¤ëì· ìì±
# ì¬ë¬ UIì ë¡ê·¸ ì ì¥ìì ê³µíµì¼ë¡ ì¬ì©íë êµ¬ì¡°ì²´
# ---------------------------------------------------------------------------
def get_snapshot(state: KidsMonitorState, bpm: int, pose_status: str) -> dict:
    """
    ?꾩옱 ?꾨젅?꾩쓽 紐⑤뱺 痢≪젙媛믪쓣 ?뺤뀛?덈━濡?諛섑솚.
    HUD ????몃? ??紐⑤컮??????쒕낫???먯꽌 ??媛믪쓣 ?뚮퉬?쒕떎.
    """
    child_messages = get_child_messages(state, bpm)
    return {
        "timestamp":        datetime.now().isoformat(timespec="seconds"),
        "watch_sec":        state.watch_time,               # ?꾩쟻 ?쒖껌 ?쒓컙 (珥?
        "watch_min":        state.minutes(),                # 遺??⑥쐞 ?쒖껌 ?쒓컙
        # ?? ??源쒕컯??        "blink_bpm":        bpm,                            # 遺꾨떦 源쒕컯???잛닔
        "blink_total":      state.blink_count,              # ?몄뀡 珥?源쒕컯????        "ear":              round(state.ear_history[-1], 4) # 理쒖떊 EAR 媛?                            if state.ear_history else 0.0,
        # ?? Head Pose
        "head_yaw":         round(state.head_yaw, 1),       # 醫뚯슦 ?뚯쟾媛?(??
        "head_pitch":       round(state.head_pitch, 1),     # ?곹븯 ?뚯쟾媛?(??
        "head_roll":        round(state.head_roll, 1),      # 湲곗슱湲?(??
        "head_is_front":    state.head_is_front,            # ?뺣㈃ ?묒떆 ?щ?
        # ?? ?붾㈃ 嫄곕━
        "distance_cm":      state.screen_distance_cm,       # 異붿젙 嫄곕━ (cm)
        "distance_ok":      state.distance_ok,              # 沅뚯옣 踰붿쐞 ???щ?
        "recommended_distance_min_cm": state.recommended_distance_min_cm,
        "recommended_distance_max_cm": state.recommended_distance_max_cm,
        "back_wall_distance_cm": state.back_wall_distance_cm,
        # ?? ?먯꽭
        "pose_status":      pose_status,                    # "?뺤?" / "?吏곸엫" / "媛먯? ?덈맖"
        "still_sec":        round(state.still_duration, 1), # ?곗냽 ?뺤? ?쒓컙 (珥?
        # ?? 媛먯젙
        "emotion":          state.emotion_label,            # ?꾩옱 媛먯젙 ?덉씠釉?        "neg_ratio":        round(state.negative_ratio, 3), # 遺??媛먯젙 鍮꾩쑉 (0~1)
        # ?? YouTube 硫뷀??곗씠??        "youtube_title":    state.youtube_title,
        "youtube_category_en": state.youtube_category_en,
        "youtube_category_ko": state.youtube_category_ko,
        "youtube_duration_sec": state.youtube_duration_seconds,
        "youtube_is_short_form": state.youtube_is_short_form,
        "content_risk_adjustment": round(state.content_risk_adjustment, 1),
        "content_risk_reasons": list(state.content_risk_reasons),
        # ?? 醫낇빀 ?먯닔
        "focus_score":      state.focus_score,              # 吏묒쨷??(0~100)
        "risk_score":       round(state.risk_score, 1),     # ?꾪뿕??(0~100)
        "risk_level":       state.risk_level,               # ?뺤긽/二쇱쓽/寃쎄퀬/?꾪뿕
        # ?? ?꾩씠??硫붿떆吏 (?됰룞 ?좊룄)
        "child_messages":   child_messages,                 # ?몃? ?깆뿉??UI濡??쒖떆
        "child_message_card": get_child_message(state, bpm, child_messages),
    }



# 1珥덈쭏??1???????ML 紐⑤뜽 ?숈뒿???쇱쿂 ?곗씠?곗뀑
# 而щ읆: timestamp, watch_sec, ear, blink_bpm, head_yaw,
#        head_pitch, head_roll, head_is_front, distance_cm,
#        pose_status, still_sec, emotion, neg_ratio,
#        focus_score, risk_score, risk_level
# ?????????????????????????????????????????
CSV_COLUMNS = [
    "timestamp", "watch_sec",
    "ear",                                  # ?됯퇏 EAR
    "blink_bpm",                            # 遺꾨떦 源쒕컯??
    "head_yaw", "head_pitch", "head_roll",  # Head Pose 媛곷룄
    "head_is_front",                        # ?뺣㈃ ?щ? (1/0)
    "distance_cm",                          # 異붿젙 嫄곕━ (cm)
    "pose_status",                          # ?먯꽭 ?곹깭 臾몄옄??
    "still_sec",                            # ?뺤? 吏???쒓컙 (珥?
    "emotion",                              # ?꾩옱 媛먯젙 ?덉씠釉?
    "neg_ratio",                            # 遺??媛먯젙 鍮꾩쑉
    "youtube_title",
    "youtube_category_en",
    "youtube_category_ko",
    "youtube_duration_sec",
    "youtube_is_short_form",
    "content_risk_adjustment",
    "focus_score",                          # 吏묒쨷??(0~100)
    "risk_score",                           # ?꾪뿕??(0~100)
    "risk_level",                           # ?꾪뿕 ?덈꺼 臾몄옄??
]

def init_csv(path: str):
    """CSV ?? ???(?? ??, ??? ?? ??)."""
    if not os.path.exists(path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
            writer.writeheader()

def append_csv_row(path: str, state: KidsMonitorState, ear: float, bpm: int, pose_status: str):
    """?? ??? CSV? 1? ?????."""
    row = {
        "timestamp":    datetime.now().isoformat(timespec="seconds"),
        "watch_sec":    state.watch_time,
        "ear":          round(ear, 4),
        "blink_bpm":    bpm,
        "head_yaw":     round(state.head_yaw, 2),
        "head_pitch":   round(state.head_pitch, 2),
        "head_roll":    round(state.head_roll, 2),
        "head_is_front": int(state.head_is_front),   # bool ??0/1
        "distance_cm":  state.screen_distance_cm,
        "pose_status":  pose_status,
        "still_sec":    round(state.still_duration, 1),
        "emotion":      state.emotion_label,
        "neg_ratio":    round(state.negative_ratio, 4),
        "youtube_title": state.youtube_title,
        "youtube_category_en": state.youtube_category_en,
        "youtube_category_ko": state.youtube_category_ko,
        "youtube_duration_sec": state.youtube_duration_seconds,
        "youtube_is_short_form": int(state.youtube_is_short_form),
        "content_risk_adjustment": round(state.content_risk_adjustment, 1),
        "focus_score":  state.focus_score,
        "risk_score":   round(state.risk_score, 2),
        "risk_level":   state.risk_level,
    }
    with open(path, "a", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
        writer.writerow(row)


# ?????????????????????????????????????????
# 濡쒓렇 ???(JSON)
# ?????????????????????????????????????????
def save_log(state: KidsMonitorState, scores):
    entry = {
        "timestamp":            datetime.now().isoformat(),
        "watch_seconds":        state.watch_time,
        "risk_score":           round(state.risk_score, 1),
        "risk_level":           state.risk_level,
        "focus_score":          state.focus_score,          # [?좉퇋]
        "head_yaw":             round(state.head_yaw, 1),   # [?좉퇋]
        "head_pitch":           round(state.head_pitch, 1), # [?좉퇋]
        "head_roll":            round(state.head_roll, 1),  # [?좉퇋]
        "head_is_front":        state.head_is_front,        # [?좉퇋]
        "distance_cm":          state.screen_distance_cm,   # [?좉퇋]
        "youtube_title":        state.youtube_title,
        "youtube_category_en":  state.youtube_category_en,
        "youtube_category_ko":  state.youtube_category_ko,
        "youtube_duration_sec": state.youtube_duration_seconds,
        "youtube_is_short_form": state.youtube_is_short_form,
        "content_risk_adjustment": round(state.content_risk_adjustment, 1),
        "content_risk_reasons": list(state.content_risk_reasons),
        "emotion":              state.emotion_label,
        "negative_emotion_ratio": round(state.negative_ratio, 3),
        "blink_count_total":    state.blink_count,
        "still_duration_sec":   round(state.still_duration, 1),
        "scores":               {k: round(v, 1) for k, v in scores.items()},
    }
    state.log_data.append(entry)

    try:
        existing = []
        if os.path.exists(CONFIG["log_path"]):
            with open(CONFIG["log_path"], "r", encoding="utf-8") as f:
                existing = json.load(f)
        existing.append(entry)
        with open(CONFIG["log_path"], "w", encoding="utf-8") as f:
            json.dump(existing, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"[LOG ERROR] {e}")


def compute_focus_score(state: KidsMonitorState, bpm: int) -> float:
    scores = {}
    recommended_min_cm, recommended_max_cm = get_recommended_distance_range(state)

    if state.head_is_front:
        scores["head"] = 100.0
    else:
        yaw_excess = max(0, abs(state.head_yaw) - CONFIG["head_yaw_threshold"])
        pitch_excess = max(0, abs(state.head_pitch) - CONFIG["head_pitch_threshold"])
        roll_excess = max(0, abs(state.head_roll) - CONFIG["head_roll_threshold"])
        total_excess = yaw_excess + pitch_excess + roll_excess
        scores["head"] = max(0.0, 100.0 - total_excess * 2.5)

    scores["blink"] = compute_blink_focus_score(bpm)

    still_ratio = min(state.still_duration / CONFIG["still_warn_sec"], 1.0)
    scores["pose"] = 100.0 - still_ratio * 60.0

    d = state.screen_distance_cm
    if d <= 0:
        scores["distance"] = 50.0
    elif recommended_min_cm <= d <= recommended_max_cm:
        scores["distance"] = 100.0
    elif d < recommended_min_cm:
        excess = recommended_min_cm - d
        scores["distance"] = max(0.0, 100.0 - excess * 2.0)
    else:
        excess = d - recommended_max_cm
        scores["distance"] = max(0.0, 100.0 - excess * 1.0)

    focus = (
        scores["head"] * CONFIG["focus_weight_head"] +
        scores["blink"] * CONFIG["focus_weight_blink"] +
        scores["pose"] * CONFIG["focus_weight_pose"] +
        scores["distance"] * CONFIG["focus_weight_distance"]
    )
    return min(100.0, max(0.0, round(focus, 1)))


def compute_risk_score(state: KidsMonitorState) -> tuple:
    scores = {}
    recommended_min_cm, recommended_max_cm = get_recommended_distance_range(state)

    t = state.watch_time
    if t < CONFIG["warn_watch_time_1"]:
        scores["time"] = t / CONFIG["warn_watch_time_1"] * 40
    elif t < CONFIG["warn_watch_time_2"]:
        scores["time"] = 40 + (t - CONFIG["warn_watch_time_1"]) / (
            CONFIG["warn_watch_time_2"] - CONFIG["warn_watch_time_1"]
        ) * 30
    else:
        scores["time"] = min(100, 70 + (t - CONFIG["warn_watch_time_2"]) / 600 * 30)

    now = time.time()
    recent_blinks = [ts for ts in state.blink_timestamps if ts > now - 60]
    bpm = len(recent_blinks)
    scores["blink"] = compute_blink_risk_score(bpm)

    still_ratio = min(state.still_duration / CONFIG["still_warn_sec"], 1.0)
    scores["pose"] = still_ratio * 100

    scores["emotion"] = state.negative_ratio * 100

    if not state.head_is_front:
        yaw_e = max(0, abs(state.head_yaw) - CONFIG["head_yaw_threshold"])
        pitch_e = max(0, abs(state.head_pitch) - CONFIG["head_pitch_threshold"])
        scores["head_pose"] = min(100, (yaw_e + pitch_e) * 5)
    else:
        scores["head_pose"] = 0

    d = state.screen_distance_cm
    if 0 < d < recommended_min_cm:
        scores["distance"] = (
            (recommended_min_cm - d) / max(recommended_min_cm, 1.0) * 100
        )
    elif d > recommended_max_cm:
        scores["distance"] = min(
            100,
            (d - recommended_max_cm) / max(recommended_max_cm, 1.0) * 100,
        )
    else:
        scores["distance"] = 0

    content_adjustment, content_reasons = compute_content_risk_adjustment(state)
    scores["content"] = content_adjustment
    state.content_risk_adjustment = content_adjustment
    state.content_risk_reasons = content_reasons

    total = (
        scores["time"] * CONFIG["weight_time"] +
        scores["blink"] * CONFIG["weight_blink"] +
        scores["pose"] * CONFIG["weight_pose"] +
        scores["emotion"] * CONFIG["weight_emotion"] +
        scores.get("head_pose", 0) * 0.20 +     # 20% 보너스 (고개 돌림 강화)
        scores.get("distance", 0) * 0.15 +      # 15% 보너스 (거리 이탈 강화)
        scores["content"]
    )
    total = min(100, max(0, total))

    if total < 25:
        level = "정상"
    elif total < 50:
        level = "주의"
    elif total < 75:
        level = "경고"
    else:
        level = "위험"

    return total, level, scores


def _build_bear_message_card(message: str, trigger: str) -> dict:
    return {
        "character": "bear",
        "layout": "left-bear-bubble",
        "trigger": trigger,
        "message": message,
    }


def _get_watch_time_message(state: KidsMonitorState) -> tuple[str | None, str | None]:
    t = state.watch_time

    if t >= CONFIG["warn_watch_time_3"]:
        return (
            "오늘 시청 시간이 90분이 되었어요.\n이제는 잠시 쉬어볼까요?",
            "watch_time_90m",
        )
    if t >= CONFIG["warn_watch_time_2"]:
        return (
            "오늘 시청 시간이 60분이 되었어요.\n눈을 잠깐 쉬게 해줘요.",
            "watch_time_60m",
        )
    if t >= CONFIG["warn_watch_time_1"]:
        return (
            "오늘 시청 시간이 30분이 되었어요.\n잠깐 쉬어갈까요?",
            "watch_time_30m",
        )

    return None, None


def _get_care_guidance_messages(state: KidsMonitorState, bpm: int) -> list[tuple[str, str]]:
    messages = []
    recommended_min_cm, recommended_max_cm = get_recommended_distance_range(state)

    if state.posture_guidance_enabled and state.still_duration >= CONFIG["still_warn_sec"]:
        messages.append(
            (
                "같은 자세가 오래 이어졌어요.\n몸을 쭉 펴고 스트레칭해요.",
                "stretch",
            )
        )

    if not state.blink_guidance_enabled:
        blink_status = "normal"
    elif not has_reliable_blink_signal(state):
        blink_status = "normal"
    else:
        blink_status = get_blink_status(bpm)
    if blink_status == "low":
        messages.append(
            (
                "천천히 눈을 한번 깜박여 볼까요?",
                "blink_low",
            )
        )
    elif blink_status == "high":
        messages.append(
            (
                "눈이 많이 피곤해 보여요.",
                "blink_high",
            )
        )

    if state.posture_guidance_enabled and not state.head_is_front:
        messages.append(
            (
                "화면을 보는 방향을 정면으로 맞춰주세요.",
                "head_pose",
            )
        )

    d = state.screen_distance_cm
    if state.distance_guidance_enabled and 0 < d < recommended_min_cm:
        messages.append(
            (
                f"화면과 조금만 더 떨어져서 앉아주세요.\n권장 거리는 {recommended_min_cm:.0f}~{recommended_max_cm:.0f}cm예요.",
                "distance_near",
            )
        )
    elif state.distance_guidance_enabled and d > recommended_max_cm:
        messages.append(
            (
                f"화면이 조금 멀어요.\n권장 거리는 {recommended_min_cm:.0f}~{recommended_max_cm:.0f}cm예요.",
                "distance_far",
            )
        )

    return messages


def get_child_message(
    state: KidsMonitorState,
    bpm: int,
    messages: list[str] | None = None,
) -> dict | None:
    watch_message, watch_trigger = _get_watch_time_message(state)
    if watch_message:
        return _build_bear_message_card(watch_message, watch_trigger)

    if not state.care_guidance_enabled:
        return None

    care_messages = _get_care_guidance_messages(state, bpm)
    if care_messages:
        now = time.time()
        selected_index = 0

        if len(care_messages) > 1 and state.last_child_message_trigger:
            triggers = [trigger for _, trigger in care_messages]
            if state.last_child_message_trigger in triggers:
                current_index = triggers.index(state.last_child_message_trigger)
                if now - state.last_child_message_changed_at >= 8.0:
                    selected_index = (current_index + 1) % len(care_messages)
                else:
                    selected_index = current_index

        message, trigger = care_messages[selected_index]
        if trigger != state.last_child_message_trigger:
            state.last_child_message_trigger = trigger
            state.last_child_message_changed_at = now
        return _build_bear_message_card(message, trigger)

    if messages:
        return _build_bear_message_card(messages[0], "fallback")

    return None


def get_child_messages(state: KidsMonitorState, bpm: int) -> list:
    msgs = []
    seen = set()

    watch_message, _ = _get_watch_time_message(state)
    if watch_message:
        msgs.append(watch_message)
        seen.add(watch_message)

    if not state.care_guidance_enabled:
        return msgs

    for message, _ in _get_care_guidance_messages(state, bpm):
        if message in seen:
            continue
        msgs.append(message)
        seen.add(message)
        if len(msgs) >= 3:
            break

    return msgs


# ?????????????????????????????????????????
# 硫붿씤 猷⑦봽
# ?????????????????????????????????????????

def build_parser():
    parser = argparse.ArgumentParser(
        description="AI Kids TV Addiction Monitor with optional YouTube metadata risk adjustments."
    )
    parser.add_argument(
        "--youtube-url",
        dest="youtube_url",
        default=None,
        help="ë¶ìí  ì íë¸ URLìëë¤. ì ëª©ê³¼ ë©íë°ì´í°, ìì ê¸¸ì´ë¥¼ ì½ì´ ìíë ê³ì°ì ë°ìí©ëë¤.",
    )
    parser.add_argument(
        "--camera-index",
        type=int,
        default=0,
        help="OpenCV ì¹´ë©ë¼ ì¸ë±ì¤ìëë¤. ê¸°ë³¸ê°ì 0ìëë¤.",
    )
    parser.add_argument(
        "--enable-emotion-analysis",
        action="store_true",
        help="ê¸°ë³¸ ëª¨ëììë ê°ì  ë¶ìì ëê³ , íìí  ëë§ DeepFace ê°ì  ë¶ìì ì¬ì©í©ëë¤.",
    )
    parser.add_argument(
        "--show-preview",
        action="store_true",
        help="OpenCV ë¯¸ë¦¬ë³´ê¸° ì°½ì íìí©ëë¤.",
    )
    parser.add_argument(
        "--mask-face-preview",
        action="store_true",
        help="ë¯¸ë¦¬ë³´ê¸° íë©´ìì ì¼êµ´ ìì­ì ëëë§í¬ ê¸°ì¤ì¼ë¡ ë§ì¤í¹í©ëë¤. --show-previewì í¨ê» ì¬ì©íì¸ì.",
    )
    parser.add_argument(
        "--metadata-only",
        action="store_true",
        help="ì íë¸ ë©íë°ì´í°ë§ ë¶ìíê³  ì¹´ë©ë¼ë ì´ì§ ììµëë¤.",
    )
    parser.add_argument(
        "--session-id",
        default=None,
        help="MongoDB telemetryë¥¼ ë¬¶ì ì¸ì ìë³ììëë¤.",
    )
    parser.add_argument(
        "--user-id",
        type=int,
        default=None,
        help="MongoDB telemetryì í¨ê» ì ì¥í  ì¬ì©ì IDìëë¤.",
    )
    parser.add_argument(
        "--child-id",
        type=int,
        default=None,
        help="MongoDB telemetryì í¨ê» ì ì¥í  ìë IDìëë¤.",
    )
    parser.add_argument(
        "--analysis-id",
        type=int,
        default=None,
        help="ì°ê²°ë analysis_history IDìëë¤.",
    )
    parser.add_argument(
        "--disable-mongo",
        action="store_true",
        help="MongoDB telemetry ì ì¥ì ëëë¤.",
    )
    parser.add_argument(
        "--mongo-uri",
        default=CONFIG["mongo_uri"],
        help="MongoDB ì°ê²° URIìëë¤.",
    )
    parser.add_argument(
        "--mongo-db",
        default=CONFIG["mongo_database"],
        help="MongoDB ë°ì´í°ë² ì´ì¤ ì´ë¦ìëë¤.",
    )
    parser.add_argument(
        "--max-seconds",
        type=int,
        default=0,
        help="ì§ì í ì´ê° ì§ëë©´ ëª¨ëí°ë¥¼ ìë ì¢ë£í©ëë¤.",
    )
    parser.add_argument(
        "--watch-guidance-only",
        action="store_true",
        help="ìì²­ ìê° ìë´ë§ íìíê³  ìì¸, ë, ê±°ë¦¬ ìë´ ë©ìì§ë ëëë¤.",
    )
    parser.add_argument(
        "--disable-blink-guidance",
        action="store_true",
        help="ë ê¹ë°ì ìë´ ë©ìì§ë¥¼ ëëë¤. ìíë ê³ì°ì ì ì§í©ëë¤.",
    )
    parser.add_argument(
        "--disable-posture-guidance",
        action="store_true",
        help="ìì¸ ë° ì ë©´ ìì ìë´ ë©ìì§ë¥¼ ëëë¤. ìíë ê³ì°ì ì ì§í©ëë¤.",
    )
    parser.add_argument(
        "--disable-distance-guidance",
        action="store_true",
        help="ìì²­ ê±°ë¦¬ ìë´ ë©ìì§ë¥¼ ëëë¤. ìíë ê³ì°ì ì ì§í©ëë¤.",
    )
    parser.add_argument(
        "--back-wall-distance-cm",
        type=float,
        default=0.0,
        help="TV ë¤ ë²½ê¹ì§ì ê±°ë¦¬(cm)ìëë¤. ì§ì íë©´ ê·¸ ë²ì ììì ê¶ì¥ ìì²­ ê±°ë¦¬ë¥¼ ê³ì°í©ëë¤.",
    )
    return parser


def main():
    args = build_parser().parse_args()
    state = KidsMonitorState()
    if args.session_id:
        state.session_id = args.session_id
    state.user_id = args.user_id
    state.child_id = args.child_id
    state.analysis_id = args.analysis_id
    state.care_guidance_enabled = not args.watch_guidance_only
    state.blink_guidance_enabled = (
        state.care_guidance_enabled and not args.disable_blink_guidance
    )
    state.posture_guidance_enabled = (
        state.care_guidance_enabled and not args.disable_posture_guidance
    )
    state.distance_guidance_enabled = (
        state.care_guidance_enabled and not args.disable_distance_guidance
    )
    if args.back_wall_distance_cm > 0:
        state.back_wall_distance_cm = round(args.back_wall_distance_cm, 1)
        state.back_wall_distance_manual = True
    update_distance_profile(state, 0.0)

    mongo_store = None
    mongo_enabled = CONFIG["mongo_enabled"] and not args.disable_mongo
    if mongo_enabled:
        try:
            mongo_store = MongoMonitorStore(
                uri=args.mongo_uri,
                database=args.mongo_db,
                enabled=True,
            )
            mongo_store.ping()
            print(
                f"[INFO] MongoDB telemetry enabled: {args.mongo_uri} / {args.mongo_db}"
            )
        except Exception as exc:
            mongo_store = None
            print(f"[WARN] MongoDB telemetry disabled: {exc}")

    if args.metadata_only:
        if args.youtube_url:
            try:
                youtube_context = fetch_youtube_video_context(args.youtube_url)
                state.apply_youtube_context(youtube_context)
                print(f"[INFO] YouTube title: {state.youtube_title}")
                print(
                    f"[INFO] YouTube category: "
                    f"{state.youtube_category_ko} ({state.youtube_category_en})"
                )
                print(f"[INFO] YouTube duration: {state.youtube_duration_seconds}s")
            except Exception as exc:
                print(f"[WARN] Could not load YouTube metadata: {exc}")
        else:
            print("[INFO] metadata-only mode enabled with no YouTube URL.")
        return

    if args.youtube_url:
        try:
            youtube_context = fetch_youtube_video_context(args.youtube_url)
            state.apply_youtube_context(youtube_context)
        except Exception as exc:
            print(f"[WARN] Could not preload YouTube metadata before monitor startup: {exc}")

    if mongo_store is not None:
        try:
            mongo_store.upsert_session_start(state)
        except Exception as exc:
            print(f"[WARN] Failed to initialize MongoDB session document: {exc}")
            mongo_store = None

    try:
        initialize_mediapipe()
    except Exception as exc:
        fail_monitor_run(
            mongo_store,
            state,
            event_type="mediapipe_init_failed",
            message=f"[ERROR] MediaPipe initialization failed: {exc}",
        )
        return

    cap = cv2.VideoCapture(args.camera_index)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  CONFIG["display_width"])
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CONFIG["display_height"])

    if not cap.isOpened():
        fail_monitor_run(
            mongo_store,
            state,
            event_type="camera_open_failed",
            message="[ERROR] Camera could not be opened.",
            metrics={"camera_index": args.camera_index},
        )
        return

    # [?좉퇋] CSV 珥덇린??    init_csv(CONFIG["csv_path"])

    scores = {"time": 0, "blink": 0, "pose": 0, "emotion": 0}
    pose_status = "분석 중"
    bpm  = 0
    ear  = 0.3   # 珥덇린媛?
    mongo_write_failures = 0  # Fix4: 연속 실패 횟수 추적 (3회 초과 시 비활성화)
    print("[INFO] AI Kids Monitor v2 시작. ESC 키로 종료합니다.")
    print(f"[INFO] CSV 데이터셋 저장 경로: {CONFIG['csv_path']}")
    print("[INFO] Privacy mode: 원본 영상은 저장하지 않고, 로그와 CSV에는 파생 지표만 저장합니다.")
    if not args.enable_emotion_analysis:
        print("[INFO] Privacy mode: 감정 분석은 기본적으로 비활성화되어 랜드마크 기반 지표만 사용합니다.")
    else:
        print(
            "[INFO] Emotion mode: 5분마다 한 번 얼굴 ROI 축소본만 메모리에서 분석합니다."
        )
    if args.show_preview and args.mask_face_preview:
        print("[INFO] Demo mode: 미리보기 창에서 얼굴 마스크를 적용합니다.")
    if state.back_wall_distance_manual:
        print(
            "[INFO] 뒷벽 거리 기준 권장 시청 거리: "
            f"{state.recommended_distance_min_cm:.1f}cm ~ {state.recommended_distance_max_cm:.1f}cm "
            f"(?룸꼍 {state.back_wall_distance_cm:.1f}cm)"
        )
    else:
        print("[INFO] 뒷벽 거리는 관측 거리로 자동 보정합니다.")

    if args.youtube_url and not state.youtube_url:
        try:
            youtube_context = fetch_youtube_video_context(args.youtube_url)
            state.apply_youtube_context(youtube_context)
            print(f"[INFO] YouTube 제목: {state.youtube_title}")
            print(
                f"[INFO] YouTube 카테고리: "
                f"{state.youtube_category_ko} ({state.youtube_category_en})"
            )
            print(f"[INFO] YouTube 길이: {state.youtube_duration_seconds}초")
            if state.youtube_is_short_form:
                print("[INFO] 3분 이내 쇼츠로 인식되어 위험도 가중치가 올라갑니다.")
        except Exception as exc:
            print(f"[WARN] YouTube 메타데이터를 불러오지 못했습니다: {exc}")
            print("[WARN] YouTube 가중치 없이 기본 모니터링만 진행합니다.")

    if mongo_store is not None:
        try:
            mongo_store.upsert_session_start(state)
        except Exception as exc:
            print(f"[WARN] Failed to initialize MongoDB session document: {exc}")
            mongo_store = None

    while True:
        if args.max_seconds > 0 and state.watch_time >= args.max_seconds:
            print(f"[INFO] Max runtime reached: {args.max_seconds}s")
            break

        ret, frame = cap.read()
        if not ret:
            time.sleep(0.05)
            continue

        frame = cv2.resize(frame, (CONFIG["display_width"], CONFIG["display_height"]))
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        preview_frame = frame.copy()
        now = time.time()
        fw, fh = CONFIG["display_width"], CONFIG["display_height"]
        face_landmarks_for_preview = None
        private_emotion_face = None

        # ?? ?쒖껌 ?쒓컙 媛깆떊
        state.update_watch_time()

        # ?? ?쇨뎬 遺꾩꽍 (EAR + Head Pose + 嫄곕━)
        face_result = face_mesh.process(rgb)
        if face_result.multi_face_landmarks:
            lm_raw = face_result.multi_face_landmarks[0].landmark
            face_landmarks_for_preview = lm_raw
            private_emotion_face = extract_private_face_crop(frame, lm_raw)
            landmarks = np.array([[l.x, l.y] for l in lm_raw])

            # EAR 怨꾩궛 諛?源쒕컯??媛먯?
            ear = get_avg_EAR(landmarks)
            state.ear_history.append(ear)
            state.last_face_detected_at = now
            close_threshold, reopen_threshold = get_dynamic_blink_threshold(state)

            if not state.eye_closed and ear < close_threshold:
                state.eye_closed = True
                state.eye_closed_started_at = now
            elif state.eye_closed and ear > reopen_threshold:
                closed_duration = now - (state.eye_closed_started_at or now)
                if (
                    0.04 <= closed_duration <= 0.8
                    and now - state.last_blink_time > CONFIG["blink_cooldown"]
                ):
                    state.blink_count += 1
                    state.last_blink_time = now
                    state.blink_timestamps.append(now)
                state.eye_closed = False
                state.eye_closed_started_at = None

            # [?좉퇋] Head Pose 異붿젙
            yaw, pitch, roll, is_front = estimate_head_pose(lm_raw, fw, fh, state)
            state.head_yaw   = yaw
            state.head_pitch = pitch
            state.head_roll  = roll
            state.head_is_front = is_front

            # [?좉퇋] ?붾㈃ 嫄곕━ 異붿젙
            dist = estimate_screen_distance(lm_raw, fw, fh)
            state.screen_distance_cm = dist
            update_distance_profile(state, dist)
            state.distance_ok = (
                state.recommended_distance_min_cm <= dist <= state.recommended_distance_max_cm
            ) if dist > 0 else False
            # Fix3: 얼굴 재감지 시 손실 알람 플래그 초기화
            state._face_loss_event_sent = False

        # ?? ?먯꽭 遺꾩꽍
        else:
            if state.eye_closed and state.eye_closed_started_at and now - state.eye_closed_started_at > 1.0:
                state.eye_closed = False
                state.eye_closed_started_at = None
            # Fix3: 30초 이상 얼굴 미감지 시 MongoDB 이벤트 삽입
            if (
                mongo_store is not None
                and state.last_face_detected_at > 0
                and now - state.last_face_detected_at >= 30.0
                and not getattr(state, '_face_loss_event_sent', False)
            ):
                try:
                    mongo_store.insert_event(
                        state,
                        event_type="face_detection_lost",
                        event_level="WARN",
                        message="30초 이상 얼굴이 감지되지 않았어요. 아이가 자리를 비웠거나 카메라를 가렸을 수 있어요.",
                        metrics={"absent_sec": round(now - state.last_face_detected_at, 1)},
                    )
                    state._face_loss_event_sent = True
                except Exception as exc:
                    print(f"[WARN] Failed to insert face loss event: {exc}")

        pose_result = pose.process(rgb)
        pose_status, move_dist = analyze_pose(pose_result, state)

        # ?? 媛먯젙 遺꾩꽍 (鍮꾨룞湲? 二쇨린??
        if (
            args.enable_emotion_analysis
            and private_emotion_face is not None
            and now - state.last_emotion_time >= CONFIG["emotion_interval"]
        ):
            state.last_emotion_time = now
            t = threading.Thread(
                target=analyze_emotion_async,
                args=(private_emotion_face, state),
                daemon=True
            )
            t.start()

        # ?? 遺꾨떦 源쒕컯??怨꾩궛
        recent_blinks = [ts for ts in state.blink_timestamps if ts > now - 60]
        bpm = len(recent_blinks)

        # ?? [?좉퇋] 吏묒쨷??怨꾩궛
        state.focus_score = compute_focus_score(state, bpm)
        state.focus_history.append(state.focus_score)

        # ?? ?꾪뿕??怨꾩궛
        prev_risk_level = state.risk_level
        state.risk_score, state.risk_level, scores = compute_risk_score(state)
        state.risk_history.append(state.risk_score)
        record_sample_metrics(state)
        # Fix5: 위험도 레벨 전환 시 MongoDB 이벤트 기록
        if prev_risk_level != state.risk_level and mongo_store is not None:
            try:
                mongo_store.insert_event(
                    state,
                    event_type="risk_level_changed",
                    event_level="WARN" if state.risk_level in ("경고", "위험") else "INFO",
                    message=f"위험도 레벨이 '{prev_risk_level}'에서 '{state.risk_level}'으로 변경되었어요.",
                    metrics={"from": prev_risk_level, "to": state.risk_level, "risk_score": round(state.risk_score, 1)},
                )
            except Exception as exc:
                print(f"[WARN] Failed to insert risk level event: {exc}")

        # ?? ?꾩옱 ?곹깭 ?ㅻ깄??異쒕젰 (?몃? ?깆뿉???대쭅?섍굅??肄섏넄 ?뺤씤??
        snapshot = get_snapshot(state, bpm, pose_status)
        state.last_child_messages = list(snapshot["child_messages"])

        # ?? JSON 濡쒓렇 ???(二쇨린??
        if now - state.last_log_time >= CONFIG["log_interval"]:
            save_log(state, scores)
            state.last_log_time = now

        # ?? [?좉퇋] CSV ?곗씠?곗뀑 ???(二쇨린??
        if now - state.last_csv_time >= CONFIG["csv_interval"]:
            append_csv_row(CONFIG["csv_path"], state, ear, bpm, pose_status)
            if mongo_store is not None:
                try:
                    mongo_store.insert_telemetry(state, snapshot, scores)
                    mongo_write_failures = 0  # Fix4: 성공 시 카운터 초기화
                except Exception as exc:
                    mongo_write_failures += 1
                    print(f"[WARN] Failed to write MongoDB telemetry ({mongo_write_failures}/3): {exc}")
                    if mongo_write_failures >= 3:
                        mongo_store = None
                        print("[WARN] MongoDB telemetry disabled after 3 consecutive failures.")
            state.last_csv_time = now

        if args.show_preview:
            if args.mask_face_preview and face_landmarks_for_preview is not None:
                preview_frame = mask_face_from_landmarks(preview_frame, face_landmarks_for_preview)
            cv2.imshow(CONFIG["preview_window_name"], preview_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break

    # 醫낅즺 ??理쒖쥌 濡쒓렇 ???    save_log(state, scores)
    append_csv_row(CONFIG["csv_path"], state, ear, bpm, pose_status)
    if mongo_store is not None:
        try:
            final_snapshot = get_snapshot(state, bpm, pose_status)
            state.last_child_messages = list(final_snapshot["child_messages"])
            mongo_store.insert_telemetry(state, final_snapshot, scores)
            mongo_store.finalize_session(state)
        except Exception as exc:
            print(f"[WARN] Failed to finalize MongoDB telemetry: {exc}")

    print(f"[INFO] 세션 종료. 총 시청: {state.minutes()}분 {state.seconds_rem()}초")
    print(f"[INFO] JSON 로그: {CONFIG['log_path']}")
    print(f"[INFO] CSV 데이터셋: {CONFIG['csv_path']}")


    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()

