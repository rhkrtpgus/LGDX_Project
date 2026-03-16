"""
AI Kids TV Addiction Monitor v2
================================
기존 기능:
- TV 시청 시간 추적 (세션 기반)
- 감정 분석 (DeepFace) - 부정/긍정 감정 분류
- 눈 깜박임 감지 (EAR 알고리즘) - 피로도 측정
- 자세 움직임 분석 (MediaPipe Pose) - 장시간 고정 자세 감지
- 위험도 점수 (0~100) 실시간 계산
- 경고 시스템 (단계별 알림)
- 로그 저장 (JSON)
- 시각화 오버레이 (OpenCV HUD)

추가 기능:
- Head Pose Detection (Yaw / Pitch / Roll)
- 화면 거리 측정 (동공 간 거리 기반 추정)
- 집중도 Score (0~100, 다중 신호 통합)
- CSV 데이터셋 자동 생성 (프레임 단위 저장)
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

# ─────────────────────────────────────────
# 설정값 (튜닝 가능)
# ─────────────────────────────────────────
CONFIG = {
    # 시청 시간 경고 (초)
    "warn_watch_time_1": 30 * 60,       # 30분 - 주의
    "warn_watch_time_2": 60 * 60,       # 60분 - 경고
    "warn_watch_time_3": 90 * 60,       # 90분 - 위험

    # 눈 깜박임 (EAR 기반)
    "ear_threshold": 0.22,              # 이 값 이하면 눈 감은 것으로 판단
    "blink_cooldown": 0.25,             # 최소 깜박임 간격 (초)
    "normal_bpm_min": 10,               # 정상 분당 깜박임 최소값
    "normal_bpm_max": 20,               # 정상 분당 깜박임 최대값

    # 자세 분석
    "pose_window": 30,                  # 자세 분석 윈도우 (초)
    "stillness_threshold": 0.015,       # 이 값 이하면 정지 상태
    "still_warn_sec": 900,              # 15분 연속 정지 시 경고

    # ── [신규] Head Pose 임계값
    # Yaw(좌우), Pitch(상하), Roll(기울기) 단위: 도(degree)
    "head_yaw_threshold": 25.0,         # 좌우 회전 허용 범위 ±25도 초과 시 비정면
    "head_pitch_threshold": 20.0,       # 상하 회전 허용 범위 ±20도 초과 시 비정면
    "head_roll_threshold": 20.0,        # 기울기 허용 범위 ±20도 초과 시 비정면

    # ── [신규] 화면 거리 추정
    # 기준: 평균 동공 간 거리(IPD) ≈ 63mm, 카메라 초점거리 근사값
    # 실제 값은 카메라 캘리브레이션으로 보정 필요
    "focal_length_px": 600.0,          # 카메라 초점거리 (픽셀 단위, 보정 전 근사치)
    "avg_ipd_mm": 63.0,                 # 평균 동공 간 거리 (mm)
    "safe_distance_min_cm": 50.0,       # 권장 최소 시청 거리 (cm)
    "safe_distance_max_cm": 200.0,      # 권장 최대 시청 거리 (cm)
    "back_wall_clearance_cm": 20.0,     # 뒷벽까지는 최소 여유 공간 확보
    "distance_min_ratio_to_wall": 0.35, # 뒷벽 거리 기준 권장 최소 비율
    "distance_max_ratio_to_wall": 0.72, # 뒷벽 거리 기준 권장 최대 비율
    "auto_wall_buffer_cm": 35.0,        # 자동 추정 시 사용자 뒤 공간 보정값
    "auto_wall_min_sample_cm": 80.0,    # 벽 거리 추정에 사용할 최소 샘플 거리

    # ── [신규] 집중도 Score 가중치
    # 집중도 = (정면 응시 + 눈 깜박임 정상 + 자세 안정 + 적정 거리) 합산
    "focus_weight_head": 0.35,          # Head Pose 정면 여부 가중치
    "focus_weight_blink": 0.25,         # 눈 깜박임 정상 범위 여부 가중치
    "focus_weight_pose": 0.25,          # 자세 안정성 가중치
    "focus_weight_distance": 0.15,      # 적정 시청 거리 여부 가중치

    # 감정
    "negative_emotions": ["sad", "angry", "fear", "disgust"],
    "positive_emotions": ["happy", "surprise"],

    # 위험도 가중치
    "weight_time": 0.30,
    "weight_blink": 0.25,
    "weight_pose": 0.25,
    "weight_emotion": 0.20,
    "education_category_risk_discount": 12.0,
    "short_form_max_seconds": 180,
    "short_form_risk_bonus": 15.0,
    "education_categories": ["Education", "교육"],

    # 기타
    "emotion_interval": 300.0,         # 감정 분석 주기 (초) - 5분마다 1회
    "emotion_face_padding_ratio": 0.15,
    "emotion_face_input_size": 112,
    "log_interval": 60,                 # JSON 로그 저장 주기 (초)
    "csv_interval": 1.0,                # CSV 데이터셋 저장 주기 (초) - 1초마다 1행
    "log_path": "kids_monitor_log.json",
    "csv_path": "kids_monitor_dataset.csv",  # [신규] CSV 데이터셋 경로
    "mongo_enabled": os.getenv("MONGO_ENABLED", "true").lower() in {"1", "true", "yes", "on"},
    "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
    "mongo_database": os.getenv("MONGO_DATABASE", "lgdx_monitor"),
    "display_width": 1280,
    "display_height": 720,
    "preview_window_name": "Kids Monitor Demo Preview",
    "mask_blur_kernel": 51,
}

# ─────────────────────────────────────────
# MediaPipe 초기화
# ─────────────────────────────────────────
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
        max_num_faces=1,
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

# ─────────────────────────────────────────
# [신규] Head Pose 추정용 3D 얼굴 기준점
# 실제 얼굴 좌표계 (mm 단위, 정면 기준 원점)
# 참고: Kazemi & Sullivan (2014) 모델
# ─────────────────────────────────────────
FACE_3D_MODEL = np.array([
    [0.0,    0.0,    0.0],      # 코끝 (landmark 1)
    [0.0,   -330.0, -65.0],     # 턱 끝 (landmark 152)
    [-225.0, 170.0, -135.0],    # 왼쪽 눈 좌측 끝 (landmark 263)
    [225.0,  170.0, -135.0],    # 오른쪽 눈 우측 끝 (landmark 33)
    [-150.0, -150.0, -125.0],   # 왼쪽 입 끝 (landmark 287)
    [150.0,  -150.0, -125.0],   # 오른쪽 입 끝 (landmark 57)
], dtype=np.float64)

# 위 3D 기준점에 대응하는 MediaPipe Face Mesh 랜드마크 인덱스
FACE_3D_INDICES = [1, 152, 263, 33, 287, 57]

FACE_MASK_INDICES = sorted(set([
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323,
    361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
    176, 149, 150, 136, 172, 58, 132, 93, 234, 127,
    162, 21, 54, 103, 67, 109,
]))

# ─────────────────────────────────────────
# 상태 클래스
# ─────────────────────────────────────────
class KidsMonitorState:
    def __init__(self):
        self.session_start = time.time()
        self.watch_time = 0
        self.session_id = f"session-{datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:8]}"
        self.user_id = None
        self.child_id = None
        self.analysis_id = None

        # 눈 깜박임 
        self.blink_count = 0
        self.last_blink_time = 0
        self.blink_timestamps = deque(maxlen=200)
        self.ear_history = deque(maxlen=90)
        self.eye_closed = False

        # 자세
        self.pose_history = deque(maxlen=300)
        self.still_start_time = None
        self.still_duration = 0
        self.last_shoulder_pos = None

        # 감정
        self.emotion_label = "unknown"
        self.emotion_history = deque(maxlen=50)
        self.negative_ratio = 0.0
        self.last_emotion_time = 0
        self.emotion_lock = threading.Lock()

        # 위험도
        self.risk_score = 0
        self.risk_level = "정상"
        self.content_risk_adjustment = 0.0
        self.content_risk_reasons = []

        # 알림
        self.active_warnings = []
        self.warning_log = []

        # YouTube 메타데이터
        self.youtube_url = None
        self.youtube_video_id = None
        self.youtube_title = None
        self.youtube_category_en = None
        self.youtube_category_ko = None
        self.youtube_duration_seconds = 0
        self.youtube_is_short_form = False

        # ── [신규] Head Pose 상태
        self.head_yaw = 0.0             # 좌우 회전각 (도)
        self.head_pitch = 0.0           # 상하 회전각 (도)
        self.head_roll = 0.0            # 기울기 (도)
        self.head_is_front = True       # 정면 응시 여부

        # ── [신규] 화면 거리 상태
        self.screen_distance_cm = 0.0   # 추정 거리 (cm)
        self.distance_ok = True         # 적정 거리 여부

        # ── [신규] 집중도 Score
        self.focus_score = 0.0          # 0~100, 높을수록 집중
        self.focus_history = deque(maxlen=300)  # 최근 5분 기록
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
        # 중독 관리 안내(자세/눈/거리) 메시지 노출 여부.
        # 기본값은 켜짐이며, watch-only 시나리오에서는 CLI 옵션으로 끌 수 있다.
        self.care_guidance_enabled = True
        self.back_wall_distance_cm = None
        self.back_wall_distance_manual = False
        self.recommended_distance_min_cm = CONFIG["safe_distance_min_cm"]
        self.recommended_distance_max_cm = CONFIG["safe_distance_max_cm"]
        self.distance_samples = deque(maxlen=180)

        # 로그
        self.log_data = []
        self.last_log_time = time.time()
        self.last_csv_time = time.time()  # [신규] CSV 저장 타이머

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


# ─────────────────────────────────────────
# EAR 계산 (양쪽 눈 평균)
# ─────────────────────────────────────────
LEFT_EYE  = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33,  160, 158, 133, 153, 144]

def calculate_EAR(landmarks, eye_indices):
    """Eye Aspect Ratio: 수직/수평 거리 비율로 눈 감김 판단"""
    pts = landmarks[eye_indices]
    A = np.linalg.norm(pts[1] - pts[5])    # 수직 거리 1
    B = np.linalg.norm(pts[2] - pts[4])    # 수직 거리 2
    C = np.linalg.norm(pts[0] - pts[3])    # 수평 거리
    if C < 1e-6:
        return 0.3
    return (A + B) / (2.0 * C)

def get_avg_EAR(landmarks):
    left  = calculate_EAR(landmarks, LEFT_EYE)
    right = calculate_EAR(landmarks, RIGHT_EYE)
    return (left + right) / 2.0


# ─────────────────────────────────────────
# [신규] Head Pose Detection
# PnP(Perspective-n-Point) 알고리즘으로
# 3D 얼굴 모델 → 2D 이미지 투영 역산하여
# 카메라 좌표계 기준 회전 벡터(rvec) 추정
# ─────────────────────────────────────────
def estimate_head_pose(landmarks_raw, frame_w, frame_h, state: KidsMonitorState):
    """
    MediaPipe 랜드마크 → OpenCV solvePnP → 오일러 각도 (Yaw, Pitch, Roll)
    반환: (yaw, pitch, roll) 단위 도(degree)
    """
    # 2D 이미지 좌표 추출 (픽셀 단위)
    img_pts = np.array([
        [landmarks_raw[i].x * frame_w,
         landmarks_raw[i].y * frame_h]
        for i in FACE_3D_INDICES
    ], dtype=np.float64)

    # 카메라 내부 파라미터 행렬 (근사치, 캘리브레이션 없이 사용)
    # fx = fy = focal_length, cx = 이미지 중심
    focal = CONFIG["focal_length_px"]
    cam_matrix = np.array([
        [focal, 0,     frame_w / 2],
        [0,     focal, frame_h / 2],
        [0,     0,     1          ]
    ], dtype=np.float64)
    dist_coeffs = np.zeros((4, 1), dtype=np.float64)  # 왜곡 계수 무시

    success, rvec, tvec = cv2.solvePnP(
        FACE_3D_MODEL,
        img_pts,
        cam_matrix,
        dist_coeffs,
        flags=cv2.SOLVEPNP_ITERATIVE
    )

    if not success:
        return state.head_yaw, state.head_pitch, state.head_roll

    # 회전 벡터 → 회전 행렬 → 오일러 각도 변환
    rot_mat, _ = cv2.Rodrigues(rvec)

    # 오일러 각도 추출 (ZYX 순서)
    # pitch: X축 (상하), yaw: Y축 (좌우), roll: Z축 (기울기)
    sy = np.sqrt(rot_mat[0, 0]**2 + rot_mat[1, 0]**2)
    singular = sy < 1e-6

    if not singular:
        pitch = np.arctan2(-rot_mat[2, 0], sy)
        yaw   = np.arctan2(rot_mat[2, 1], rot_mat[2, 2])
        roll  = np.arctan2(rot_mat[1, 0], rot_mat[0, 0])
    else:
        # 짐벌락 회피
        pitch = np.arctan2(-rot_mat[2, 0], sy)
        yaw   = np.arctan2(-rot_mat[1, 2], rot_mat[1, 1])
        roll  = 0.0

    yaw_deg   = np.degrees(yaw)
    pitch_deg = np.degrees(pitch)
    roll_deg  = np.degrees(roll)

    # 정면 응시 판단: 모든 각도가 임계값 이내
    is_front = (
        abs(yaw_deg)   < CONFIG["head_yaw_threshold"] and
        abs(pitch_deg) < CONFIG["head_pitch_threshold"] and
        abs(roll_deg)  < CONFIG["head_roll_threshold"]
    )

    return yaw_deg, pitch_deg, roll_deg, is_front


# ─────────────────────────────────────────
# [신규] 화면 거리 측정
# 원리: 삼각측량 - 알려진 물체(동공 간 거리) 크기와
#       이미지 상 픽셀 크기 비율로 깊이(Z) 추정
# 공식: distance = (focal_length × real_IPD) / pixel_IPD
# ─────────────────────────────────────────

# MediaPipe refine_landmarks=True 시 동공 랜드마크 인덱스
LEFT_PUPIL  = 468   # 왼쪽 동공 중심
RIGHT_PUPIL = 473   # 오른쪽 동공 중심

def estimate_screen_distance(landmarks_raw, frame_w, frame_h):
    """
    동공 간 픽셀 거리를 이용한 화면-얼굴 거리 추정 (cm)
    refine_landmarks=True 필수 (동공 랜드마크 사용)
    """
    lp = landmarks_raw[LEFT_PUPIL]
    rp = landmarks_raw[RIGHT_PUPIL]

    # 픽셀 좌표 변환
    lp_px = np.array([lp.x * frame_w, lp.y * frame_h])
    rp_px = np.array([rp.x * frame_w, rp.y * frame_h])

    # 이미지 상 동공 간 거리 (픽셀)
    pixel_ipd = np.linalg.norm(lp_px - rp_px)

    if pixel_ipd < 1.0:
        return 0.0  # 감지 실패

    # 거리 추정 (mm → cm 변환)
    distance_mm = (CONFIG["focal_length_px"] * CONFIG["avg_ipd_mm"]) / pixel_ipd
    distance_cm = distance_mm / 10.0

    return round(distance_cm, 1)


def get_recommended_distance_range(state: KidsMonitorState) -> tuple[float, float]:
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


# ─────────────────────────────────────────
# [신규] 집중도 Score 계산 (0~100)
# 구성 요소:
#   1. Head Pose: 정면 응시 여부
#   2. 눈 깜박임: 분당 깜박임이 정상 범위 내
#   3. 자세 안정성: 과도한 정지 아닌 적정 움직임
#   4. 화면 거리: 권장 거리 범위 내
# 높은 값 = 집중 중 / 낮은 값 = 비집중 또는 피로
# ─────────────────────────────────────────
def _legacy_compute_focus_score(state: KidsMonitorState, bpm: int) -> float:
    scores = {}

    # 1) Head Pose: 정면이면 100점, 비정면이면 각도 편차에 따라 감점
    if state.head_is_front:
        scores["head"] = 100.0
    else:
        # 각 축의 초과분을 합산하여 감점
        yaw_excess   = max(0, abs(state.head_yaw)   - CONFIG["head_yaw_threshold"])
        pitch_excess = max(0, abs(state.head_pitch) - CONFIG["head_pitch_threshold"])
        roll_excess  = max(0, abs(state.head_roll)  - CONFIG["head_roll_threshold"])
        total_excess = yaw_excess + pitch_excess + roll_excess
        scores["head"] = max(0.0, 100.0 - total_excess * 2.5)

    # 2) 눈 깜박임: 정상 범위(10~30) 중앙에 가까울수록 100점
    if CONFIG["normal_bpm_min"] <= bpm <= CONFIG["normal_bpm_max"]:
        # 정상 범위 중앙값(20)에 가까울수록 높은 점수
        center = (CONFIG["normal_bpm_min"] + CONFIG["normal_bpm_max"]) / 2
        deviation = abs(bpm - center) / ((CONFIG["normal_bpm_max"] - CONFIG["normal_bpm_min"]) / 2)
        scores["blink"] = 100.0 - deviation * 30.0
    elif bpm < CONFIG["normal_bpm_min"]:
        # 너무 적으면 과집중/안구건조 가능성
        scores["blink"] = max(0.0, 60.0 - (CONFIG["normal_bpm_min"] - bpm) * 10)
    else:
        # 너무 많으면 피로 또는 산만
        scores["blink"] = max(0.0, 70.0 - (bpm - CONFIG["normal_bpm_max"]) * 5)

    # 3) 자세 안정성: 완전 정지(과집중)보다 약간의 움직임이 이상적
    #    정지 5분 이상이면 감점, 너무 많은 움직임도 감점
    still_ratio = min(state.still_duration / CONFIG["still_warn_sec"], 1.0)
    scores["pose"] = 100.0 - still_ratio * 60.0  # 최대 60점 감점

    # 4) 화면 거리: 권장 범위 내면 100점
    d = state.screen_distance_cm
    if d <= 0:
        scores["distance"] = 50.0  # 감지 불가 시 중립
    elif CONFIG["safe_distance_min_cm"] <= d <= CONFIG["safe_distance_max_cm"]:
        scores["distance"] = 100.0
    elif d < CONFIG["safe_distance_min_cm"]:
        # 너무 가까움 (눈에 유해)
        excess = CONFIG["safe_distance_min_cm"] - d
        scores["distance"] = max(0.0, 100.0 - excess * 2.0)
    else:
        # 너무 멀면 화면 잘 안보여 몸을 앞으로 숙이는 경향
        excess = d - CONFIG["safe_distance_max_cm"]
        scores["distance"] = max(0.0, 100.0 - excess * 1.0)

    # 가중 합산
    focus = (
        scores["head"]     * CONFIG["focus_weight_head"] +
        scores["blink"]    * CONFIG["focus_weight_blink"] +
        scores["pose"]     * CONFIG["focus_weight_pose"] +
        scores["distance"] * CONFIG["focus_weight_distance"]
    )
    return min(100.0, max(0.0, round(focus, 1)))


# ─────────────────────────────────────────
# 감정 분석 (별도 스레드)
# ─────────────────────────────────────────
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


# ─────────────────────────────────────────
# 자세 분석
# ─────────────────────────────────────────
def analyze_pose(pose_result, state: KidsMonitorState):
    """어깨 중심점 변화량으로 움직임 추정"""
    if not pose_result.pose_landmarks:
        return "감지 안됨", 0.0

    lm = pose_result.pose_landmarks.landmark
    left_sh  = lm[mp_pose.PoseLandmark.LEFT_SHOULDER]
    right_sh = lm[mp_pose.PoseLandmark.RIGHT_SHOULDER]

    if left_sh.visibility < 0.4 or right_sh.visibility < 0.4:
        return "감지 안됨", 0.0

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
        return "정지", movement_dist
    else:
        state.still_start_time = None
        state.still_duration = 0
        return "움직임", movement_dist


def compute_content_risk_adjustment(state: KidsMonitorState):
    adjustment = 0.0
    reasons = []
    education_categories = set(CONFIG["education_categories"])

    if (
        state.youtube_category_en in education_categories
        or state.youtube_category_ko in education_categories
    ):
        adjustment -= CONFIG["education_category_risk_discount"]
        reasons.append("교육 카테고리 시청으로 위험도 완화")

    if (
        state.youtube_is_short_form
        and 0 < state.youtube_duration_seconds <= CONFIG["short_form_max_seconds"]
    ):
        adjustment += CONFIG["short_form_risk_bonus"]
        reasons.append("3분 이내 쇼트폼 시청으로 위험도 증가")

    return adjustment, reasons


# ─────────────────────────────────────────
# 위험도 점수 계산 (0~100)
# ─────────────────────────────────────────
def _legacy_compute_risk_score(state: KidsMonitorState) -> tuple:
    scores = {}

    # 1) 시청 시간 점수
    t = state.watch_time
    if t < CONFIG["warn_watch_time_1"]:
        scores["time"] = t / CONFIG["warn_watch_time_1"] * 40
    elif t < CONFIG["warn_watch_time_2"]:
        scores["time"] = 40 + (t - CONFIG["warn_watch_time_1"]) / (
            CONFIG["warn_watch_time_2"] - CONFIG["warn_watch_time_1"]) * 30
    else:
        scores["time"] = min(100, 70 + (t - CONFIG["warn_watch_time_2"]) / 600 * 30)

    # 2) 눈 깜박임 점수
    now = time.time()
    recent_blinks = [ts for ts in state.blink_timestamps if ts > now - 60]
    bpm = len(recent_blinks)
    if CONFIG["normal_bpm_min"] <= bpm <= CONFIG["normal_bpm_max"]:
        scores["blink"] = 10
    elif bpm < CONFIG["normal_bpm_min"]:
        scores["blink"] = max(0, (CONFIG["normal_bpm_min"] - bpm) / CONFIG["normal_bpm_min"] * 100)
    else:
        scores["blink"] = min(100, (bpm - CONFIG["normal_bpm_max"]) / 20 * 60 + 20)

    # 3) 자세 점수
    still_ratio = min(state.still_duration / CONFIG["still_warn_sec"], 1.0)
    scores["pose"] = still_ratio * 100

    # 4) 감정 점수
    scores["emotion"] = state.negative_ratio * 100

    # 5) [신규] Head Pose 점수 추가 반영
    #    비정면 응시가 지속될수록 위험도에 반영
    if not state.head_is_front:
        yaw_e   = max(0, abs(state.head_yaw)   - CONFIG["head_yaw_threshold"])
        pitch_e = max(0, abs(state.head_pitch) - CONFIG["head_pitch_threshold"])
        scores["head_pose"] = min(100, (yaw_e + pitch_e) * 2)
    else:
        scores["head_pose"] = 0

    # 6) [신규] 거리 위험 점수
    d = state.screen_distance_cm
    if 0 < d < CONFIG["safe_distance_min_cm"]:
        scores["distance"] = (CONFIG["safe_distance_min_cm"] - d) / CONFIG["safe_distance_min_cm"] * 100
    else:
        scores["distance"] = 0

    content_adjustment, content_reasons = compute_content_risk_adjustment(state)
    scores["content"] = content_adjustment
    state.content_risk_adjustment = content_adjustment
    state.content_risk_reasons = content_reasons

    # 기존 4개 지표 가중 합산 (head/distance는 보조 반영)
    total = (
        scores["time"]      * CONFIG["weight_time"] +
        scores["blink"]     * CONFIG["weight_blink"] +
        scores["pose"]      * CONFIG["weight_pose"] +
        scores["emotion"]   * CONFIG["weight_emotion"] +
        scores.get("head_pose", 0) * 0.05 +     # 5% 추가 반영
        scores.get("distance",  0) * 0.05 +      # 5% 추가 반영
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


# ─────────────────────────────────────────
# 아이용 행동 유도 메시지 생성
# ─────────────────────────────────────────
def _legacy_get_child_messages(state: KidsMonitorState, bpm: int) -> list:
    """
    아이에게 보여줄 간단한 메시지 생성
    복잡한 데이터 대신 행동 유도 메시지 제공
    """
    msgs = []
    t = state.watch_time

    # 시청 시간
    if t >= CONFIG["warn_watch_time_3"]:
        msgs.append("⏸ 오래 봤어요! 잠깐 쉬는 시간이 필요해요")
    elif t >= CONFIG["warn_watch_time_2"]:
        msgs.append("⏰ TV를 오래 보고 있어요. 조금 쉬어볼까요?")
    elif t >= CONFIG["warn_watch_time_1"]:
        msgs.append("🙂 30분 동안 봤어요! 눈을 잠깐 쉬게 해요")

    # 자세 고정
    if state.still_duration >= CONFIG["still_warn_sec"]:
        msgs.append("🧍 몸을 쭉 펴고 스트레칭 해볼까요?")

    # 눈 깜박임
    if bpm < 8:
        msgs.append("👀 눈을 깜빡이며 눈을 쉬게 해주세요")

    # 얼굴 방향
    if not state.head_is_front:
        msgs.append("📺 화면을 제대로 바라봐 주세요")

    # 거리
    d = state.screen_distance_cm
    if 0 < d < CONFIG["safe_distance_min_cm"]:
        msgs.append("↩️ 화면에서 조금 떨어져 주세요")
    elif d > CONFIG["safe_distance_max_cm"]:
        msgs.append("➡️ 화면에 조금 더 가까이 와도 좋아요")

    return msgs



# ─────────────────────────────────────────
# 현재 상태 스냅샷 딕셔너리 반환
# 외부 앱/UI에서 이 값을 폴링하여 표시에 활용
# ─────────────────────────────────────────
def get_snapshot(state: KidsMonitorState, bpm: int, pose_status: str) -> dict:
    """
    현재 프레임의 모든 측정값을 딕셔너리로 반환.
    HUD 대신 외부 앱(모바일/웹/대시보드)에서 이 값을 소비한다.
    """
    child_messages = get_child_messages(state, bpm)
    return {
        "timestamp":        datetime.now().isoformat(timespec="seconds"),
        "watch_sec":        state.watch_time,               # 누적 시청 시간 (초)
        "watch_min":        state.minutes(),                # 분 단위 시청 시간
        # ── 눈 깜박임
        "blink_bpm":        bpm,                            # 분당 깜박임 횟수
        "blink_total":      state.blink_count,              # 세션 총 깜박임 수
        "ear":              round(state.ear_history[-1], 4) # 최신 EAR 값
                            if state.ear_history else 0.0,
        # ── Head Pose
        "head_yaw":         round(state.head_yaw, 1),       # 좌우 회전각 (도)
        "head_pitch":       round(state.head_pitch, 1),     # 상하 회전각 (도)
        "head_roll":        round(state.head_roll, 1),      # 기울기 (도)
        "head_is_front":    state.head_is_front,            # 정면 응시 여부
        # ── 화면 거리
        "distance_cm":      state.screen_distance_cm,       # 추정 거리 (cm)
        "distance_ok":      state.distance_ok,              # 권장 범위 내 여부
        "recommended_distance_min_cm": state.recommended_distance_min_cm,
        "recommended_distance_max_cm": state.recommended_distance_max_cm,
        "back_wall_distance_cm": state.back_wall_distance_cm,
        # ── 자세
        "pose_status":      pose_status,                    # "정지" / "움직임" / "감지 안됨"
        "still_sec":        round(state.still_duration, 1), # 연속 정지 시간 (초)
        # ── 감정
        "emotion":          state.emotion_label,            # 현재 감정 레이블
        "neg_ratio":        round(state.negative_ratio, 3), # 부정 감정 비율 (0~1)
        # ── YouTube 메타데이터
        "youtube_title":    state.youtube_title,
        "youtube_category_en": state.youtube_category_en,
        "youtube_category_ko": state.youtube_category_ko,
        "youtube_duration_sec": state.youtube_duration_seconds,
        "youtube_is_short_form": state.youtube_is_short_form,
        "content_risk_adjustment": round(state.content_risk_adjustment, 1),
        "content_risk_reasons": list(state.content_risk_reasons),
        # ── 종합 점수
        "focus_score":      state.focus_score,              # 집중도 (0~100)
        "risk_score":       round(state.risk_score, 1),     # 위험도 (0~100)
        "risk_level":       state.risk_level,               # 정상/주의/경고/위험
        # ── 아이용 메시지 (행동 유도)
        "child_messages":   child_messages,                 # 외부 앱에서 UI로 표시
        "child_message_card": get_child_message(state, bpm, child_messages),
    }



# 1초마다 1행 저장 → ML 모델 학습용 피처 데이터셋
# 컬럼: timestamp, watch_sec, ear, blink_bpm, head_yaw,
#        head_pitch, head_roll, head_is_front, distance_cm,
#        pose_status, still_sec, emotion, neg_ratio,
#        focus_score, risk_score, risk_level
# ─────────────────────────────────────────
CSV_COLUMNS = [
    "timestamp", "watch_sec",
    "ear",                                  # 평균 EAR
    "blink_bpm",                            # 분당 깜박임
    "head_yaw", "head_pitch", "head_roll",  # Head Pose 각도
    "head_is_front",                        # 정면 여부 (1/0)
    "distance_cm",                          # 추정 거리 (cm)
    "pose_status",                          # 자세 상태 문자열
    "still_sec",                            # 정지 지속 시간 (초)
    "emotion",                              # 현재 감정 레이블
    "neg_ratio",                            # 부정 감정 비율
    "youtube_title",
    "youtube_category_en",
    "youtube_category_ko",
    "youtube_duration_sec",
    "youtube_is_short_form",
    "content_risk_adjustment",
    "focus_score",                          # 집중도 (0~100)
    "risk_score",                           # 위험도 (0~100)
    "risk_level",                           # 위험 레벨 문자열
]

def init_csv(path: str):
    """CSV 파일 초기화 (헤더 작성, 파일 없을 때만)"""
    if not os.path.exists(path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_COLUMNS)
            writer.writeheader()

def append_csv_row(path: str, state: KidsMonitorState, ear: float, bpm: int, pose_status: str):
    """현재 상태를 CSV에 1행 추가"""
    row = {
        "timestamp":    datetime.now().isoformat(timespec="seconds"),
        "watch_sec":    state.watch_time,
        "ear":          round(ear, 4),
        "blink_bpm":    bpm,
        "head_yaw":     round(state.head_yaw, 2),
        "head_pitch":   round(state.head_pitch, 2),
        "head_roll":    round(state.head_roll, 2),
        "head_is_front": int(state.head_is_front),   # bool → 0/1
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


# ─────────────────────────────────────────
# 로그 저장 (JSON)
# ─────────────────────────────────────────
def save_log(state: KidsMonitorState, scores):
    entry = {
        "timestamp":            datetime.now().isoformat(),
        "watch_seconds":        state.watch_time,
        "risk_score":           round(state.risk_score, 1),
        "risk_level":           state.risk_level,
        "focus_score":          state.focus_score,          # [신규]
        "head_yaw":             round(state.head_yaw, 1),   # [신규]
        "head_pitch":           round(state.head_pitch, 1), # [신규]
        "head_roll":            round(state.head_roll, 1),  # [신규]
        "head_is_front":        state.head_is_front,        # [신규]
        "distance_cm":          state.screen_distance_cm,   # [신규]
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
        scores["head_pose"] = min(100, (yaw_e + pitch_e) * 2)
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
        scores.get("head_pose", 0) * 0.05 +
        scores.get("distance", 0) * 0.05 +
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
            "오늘 시청 시간이 90분이 되었어요.\n이제 잠시 쉬어볼까요?",
            "watch_time_90m",
        )
    if t >= CONFIG["warn_watch_time_2"]:
        return (
            "오늘 시청 시간이 60분이 되었어요.\n눈을 잠깐 쉬게 해요.",
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

    if state.still_duration >= CONFIG["still_warn_sec"]:
        messages.append(
            (
                "같은 자세가 오래 이어졌어요.\n몸을 쭉 펴고 스트레칭해요.",
                "stretch",
            )
        )

    blink_status = get_blink_status(bpm)
    if blink_status == "low":
        messages.append(
            (
                "눈이 조금 지쳐 보여요.\n천천히 눈을 깜빡여 볼까요?",
                "blink_low",
            )
        )
    elif blink_status == "high":
        messages.append(
            (
                "눈이 많이 피곤할 수 있어요.\n잠깐 먼 곳을 바라봐요.",
                "blink_high",
            )
        )

    if not state.head_is_front:
        messages.append(
            (
                "화면을 볼 때는 정면으로 앉아주세요.",
                "head_pose",
            )
        )

    d = state.screen_distance_cm
    if 0 < d < recommended_min_cm:
        messages.append(
            (
                f"화면과 조금만 더 떨어져 앉아주세요.\n권장 거리는 {int(round(recommended_min_cm))}~{int(round(recommended_max_cm))}cm예요.",
                "distance_near",
            )
        )
    elif d > recommended_max_cm:
        messages.append(
            (
                f"화면이 조금 멀어요.\n권장 거리는 {int(round(recommended_min_cm))}~{int(round(recommended_max_cm))}cm예요.",
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
        message, trigger = care_messages[0]
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


# ─────────────────────────────────────────
# 메인 루프
# ─────────────────────────────────────────
def build_parser():
    parser = argparse.ArgumentParser(
        description="AI Kids TV Addiction Monitor with optional YouTube metadata risk adjustments."
    )
    parser.add_argument(
        "--youtube-url",
        dest="youtube_url",
        default=None,
        help="현재 시청 중인 YouTube URL. 교육 카테고리/쇼트폼 길이를 위험도 계산에 반영합니다.",
    )
    parser.add_argument(
        "--camera-index",
        type=int,
        default=0,
        help="OpenCV camera index. 기본값은 0입니다.",
    )
    parser.add_argument(
        "--enable-emotion-analysis",
        action="store_true",
        help="Privacy-safe 기본 모드에서는 끄고, 필요할 때만 DeepFace 감정 분석을 켭니다.",
    )
    parser.add_argument(
        "--show-preview",
        action="store_true",
        help="시연용 OpenCV 프리뷰 창을 표시합니다.",
    )
    parser.add_argument(
        "--mask-face-preview",
        action="store_true",
        help="시연 프리뷰에서 얼굴 영역을 랜드마크 기반으로 마스킹합니다. --show-preview 와 함께 사용하세요.",
    )
    parser.add_argument(
        "--metadata-only",
        action="store_true",
        help="YouTube metadata only. Do not open the camera.",
    )
    parser.add_argument(
        "--session-id",
        default=None,
        help="Session identifier for MongoDB telemetry grouping.",
    )
    parser.add_argument(
        "--user-id",
        type=int,
        default=None,
        help="User id to store with MongoDB telemetry.",
    )
    parser.add_argument(
        "--child-id",
        type=int,
        default=None,
        help="Child id to store with MongoDB telemetry.",
    )
    parser.add_argument(
        "--analysis-id",
        type=int,
        default=None,
        help="Related analysis_history id for MongoDB telemetry.",
    )
    parser.add_argument(
        "--disable-mongo",
        action="store_true",
        help="Disable MongoDB telemetry storage.",
    )
    parser.add_argument(
        "--mongo-uri",
        default=CONFIG["mongo_uri"],
        help="MongoDB connection URI.",
    )
    parser.add_argument(
        "--mongo-db",
        default=CONFIG["mongo_database"],
        help="MongoDB database name.",
    )
    parser.add_argument(
        "--max-seconds",
        type=int,
        default=0,
        help="Maximum runtime in seconds before the monitor exits automatically.",
    )
    parser.add_argument(
        "--watch-guidance-only",
        action="store_true",
        help="시청 시간 안내만 표시하고 자세/눈/거리 케어 메시지는 끕니다.",
    )
    parser.add_argument(
        "--back-wall-distance-cm",
        type=float,
        default=0.0,
        help="TV 뒤쪽 벽까지의 거리(cm). 지정하면 이 값 안에서 권장 시청 거리를 동적으로 계산합니다.",
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

    # [신규] CSV 초기화
    init_csv(CONFIG["csv_path"])

    scores = {"time": 0, "blink": 0, "pose": 0, "emotion": 0}
    pose_status = "분석 중"
    bpm  = 0
    ear  = 0.3   # 초기값

    print("[INFO] AI Kids Monitor v2 시작. ESC 키로 종료.")
    print(f"[INFO] CSV 데이터셋 저장 경로: {CONFIG['csv_path']}")
    print("[INFO] Privacy mode: raw 영상은 저장하지 않고, 로그/CSV에는 파생 지표만 저장합니다.")
    if not args.enable_emotion_analysis:
        print("[INFO] Privacy mode: 감정 분석은 기본적으로 비활성화되어 랜드마크 기반 지표만 사용합니다.")
    else:
        print(
            "[INFO] Emotion mode: 5분마다 한 번, 얼굴 ROI 축소본만 메모리에서 분석합니다."
        )
    if args.show_preview and args.mask_face_preview:
        print("[INFO] Demo mode: 프리뷰 창에서 얼굴 마스킹을 적용합니다.")
    if state.back_wall_distance_manual:
        print(
            "[INFO] 뒷벽 거리 기준 권장 시청 거리: "
            f"{state.recommended_distance_min_cm:.1f}cm ~ {state.recommended_distance_max_cm:.1f}cm "
            f"(뒷벽 {state.back_wall_distance_cm:.1f}cm)"
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
                print("[INFO] 3분 이내 쇼트폼으로 인식되어 위험도 가중치가 올라갑니다.")
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

        # ── 시청 시간 갱신
        state.update_watch_time()

        # ── 얼굴 분석 (EAR + Head Pose + 거리)
        face_result = face_mesh.process(rgb)
        if face_result.multi_face_landmarks:
            lm_raw = face_result.multi_face_landmarks[0].landmark
            face_landmarks_for_preview = lm_raw
            private_emotion_face = extract_private_face_crop(frame, lm_raw)
            landmarks = np.array([[l.x, l.y] for l in lm_raw])

            # EAR 계산 및 깜박임 감지
            ear = get_avg_EAR(landmarks)
            state.ear_history.append(ear)

            if ear < CONFIG["ear_threshold"]:
                state.eye_closed = True
            elif state.eye_closed:
                # 눈이 다시 열릴 때 1회 카운트
                if now - state.last_blink_time > CONFIG["blink_cooldown"]:
                    state.blink_count += 1
                    state.last_blink_time = now
                    state.blink_timestamps.append(now)
                state.eye_closed = False

            # [신규] Head Pose 추정
            yaw, pitch, roll, is_front = estimate_head_pose(lm_raw, fw, fh, state)
            state.head_yaw   = yaw
            state.head_pitch = pitch
            state.head_roll  = roll
            state.head_is_front = is_front

            # [신규] 화면 거리 추정
            dist = estimate_screen_distance(lm_raw, fw, fh)
            state.screen_distance_cm = dist
            update_distance_profile(state, dist)
            state.distance_ok = (
                state.recommended_distance_min_cm <= dist <= state.recommended_distance_max_cm
            ) if dist > 0 else True

        # ── 자세 분석
        pose_result = pose.process(rgb)
        pose_status, move_dist = analyze_pose(pose_result, state)

        # ── 감정 분석 (비동기, 주기적)
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

        # ── 분당 깜박임 계산
        recent_blinks = [ts for ts in state.blink_timestamps if ts > now - 60]
        bpm = len(recent_blinks)

        # ── [신규] 집중도 계산
        state.focus_score = compute_focus_score(state, bpm)
        state.focus_history.append(state.focus_score)

        # ── 위험도 계산
        state.risk_score, state.risk_level, scores = compute_risk_score(state)
        state.risk_history.append(state.risk_score)
        record_sample_metrics(state)

        # ── 현재 상태 스냅샷 출력 (외부 앱에서 폴링하거나 콘솔 확인용)
        snapshot = get_snapshot(state, bpm, pose_status)
        state.last_child_messages = list(snapshot["child_messages"])

        # ── JSON 로그 저장 (주기적)
        if now - state.last_log_time >= CONFIG["log_interval"]:
            save_log(state, scores)
            state.last_log_time = now

        # ── [신규] CSV 데이터셋 저장 (주기적)
        if now - state.last_csv_time >= CONFIG["csv_interval"]:
            append_csv_row(CONFIG["csv_path"], state, ear, bpm, pose_status)
            if mongo_store is not None:
                try:
                    mongo_store.insert_telemetry(state, snapshot, scores)
                except Exception as exc:
                    print(f"[WARN] Failed to write MongoDB telemetry: {exc}")
                    mongo_store = None
            state.last_csv_time = now

        if args.show_preview:
            if args.mask_face_preview and face_landmarks_for_preview is not None:
                preview_frame = mask_face_from_landmarks(preview_frame, face_landmarks_for_preview)
            cv2.imshow(CONFIG["preview_window_name"], preview_frame)

        key = cv2.waitKey(1) & 0xFF
        if key == 27:  # ESC
            break

    # 종료 시 최종 로그 저장
    save_log(state, scores)
    append_csv_row(CONFIG["csv_path"], state, ear, bpm, pose_status)
    if mongo_store is not None:
        try:
            final_snapshot = get_snapshot(state, bpm, pose_status)
            state.last_child_messages = list(final_snapshot["child_messages"])
            mongo_store.insert_telemetry(state, final_snapshot, scores)
            mongo_store.finalize_session(state)
        except Exception as exc:
            print(f"[WARN] Failed to finalize MongoDB telemetry: {exc}")

    print(f"\n[INFO] 세션 종료. 총 시청: {state.minutes()}분 {state.seconds_rem()}초")
    print(f"[INFO] JSON 로그: {CONFIG['log_path']}")
    print(f"[INFO] CSV 데이터셋: {CONFIG['csv_path']}")

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
