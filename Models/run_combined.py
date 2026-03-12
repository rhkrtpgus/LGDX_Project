import argparse
import json
import subprocess
import sys
import threading
from datetime import datetime
from pathlib import Path

from Model.nudenet_video import VideoNudeDetector
from Model.violent_video import VideoViolenceDetector


PROJECT_ROOT = Path(__file__).resolve().parent


def build_parser():
    parser = argparse.ArgumentParser(
        description="Run addiction.py and Model video analyzers together."
    )
    parser.add_argument(
        "--video-path",
        required=True,
        help="Path to the video file used by Model analyzers.",
    )
    parser.add_argument(
        "--camera-index",
        type=int,
        default=0,
        help="Camera index forwarded to addiction.py.",
    )
    parser.add_argument(
        "--run-addiction",
        action="store_true",
        help="Launch addiction.py and use the camera monitor.",
    )
    parser.add_argument(
        "--youtube-url",
        default=None,
        help="Optional YouTube URL forwarded to addiction.py.",
    )
    parser.add_argument(
        "--show-preview",
        action="store_true",
        help="Forward --show-preview to addiction.py.",
    )
    parser.add_argument(
        "--mask-face-preview",
        action="store_true",
        help="Forward --mask-face-preview to addiction.py.",
    )
    parser.add_argument(
        "--enable-emotion-analysis",
        action="store_true",
        help="Forward --enable-emotion-analysis to addiction.py.",
    )
    parser.add_argument(
        "--skip-nudity",
        action="store_true",
        help="Skip NudeNet video analysis.",
    )
    parser.add_argument(
        "--skip-violence",
        action="store_true",
        help="Skip violence video analysis.",
    )
    parser.add_argument(
        "--nude-target-fps",
        type=float,
        default=24.0,
        help="Sampling FPS for NudeNet video analysis.",
    )
    parser.add_argument(
        "--nude-max-frames",
        type=int,
        default=None,
        help="Optional frame cap for NudeNet video analysis.",
    )
    parser.add_argument(
        "--nude-stop-on-first-match",
        action="store_true",
        help="Stop NudeNet analysis after the first positive match.",
    )
    parser.add_argument(
        "--violence-target-fps",
        type=float,
        default=24.0,
        help="Sampling FPS for violence video analysis.",
    )
    parser.add_argument(
        "--violence-threshold",
        type=float,
        default=0.5,
        help="Decision threshold for violence detection.",
    )
    parser.add_argument(
        "--results-dir",
        default="combined_results",
        help="Directory where Model JSON results are written.",
    )
    parser.add_argument(
        "--new-console",
        action="store_true",
        help="Open addiction.py in a new console window on Windows.",
    )
    return parser


def build_addiction_command(args):
    command = [
        sys.executable,
        str(PROJECT_ROOT / "addiction.py"),
        "--camera-index",
        str(args.camera_index),
    ]
    if args.youtube_url:
        command.extend(["--youtube-url", args.youtube_url])
    if args.show_preview:
        command.append("--show-preview")
    if args.mask_face_preview:
        command.append("--mask-face-preview")
    if args.enable_emotion_analysis:
        command.append("--enable-emotion-analysis")
    return command


def launch_addiction(args):
    creationflags = 0
    if args.new_console and sys.platform.startswith("win"):
        creationflags = subprocess.CREATE_NEW_CONSOLE

    command = build_addiction_command(args)
    print("[launcher] starting addiction.py")
    print("[launcher] command:", " ".join(command))
    return subprocess.Popen(
        command,
        cwd=str(PROJECT_ROOT),
        creationflags=creationflags,
    )


def write_json(path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def run_nudity_analysis(args, video_path, results_dir, shared_results):
    output_path = results_dir / "nudenet_result.json"
    try:
        detector = VideoNudeDetector()
        result = detector.analyze_video(
            video_path=video_path,
            target_fps=args.nude_target_fps,
            max_frames=args.nude_max_frames,
            stop_on_first_match=args.nude_stop_on_first_match,
        )
        write_json(output_path, result)
        shared_results["nudity"] = {
            "status": "ok",
            "output_path": str(output_path),
            "result": result,
        }
        print(f"[launcher] nudity analysis finished: {output_path}")
    except Exception as exc:
        shared_results["nudity"] = {
            "status": "error",
            "error": str(exc),
        }
        print(f"[launcher] nudity analysis failed: {exc}")


def run_violence_analysis(args, video_path, results_dir, shared_results):
    output_path = results_dir / "violence_result.json"
    try:
        detector = VideoViolenceDetector(threshold=args.violence_threshold)
        result = detector.analyze_video(
            video_path=video_path,
            target_fps=args.violence_target_fps,
        )
        write_json(output_path, result)
        shared_results["violence"] = {
            "status": "ok",
            "output_path": str(output_path),
            "result": result,
        }
        print(f"[launcher] violence analysis finished: {output_path}")
    except Exception as exc:
        shared_results["violence"] = {
            "status": "error",
            "error": str(exc),
        }
        print(f"[launcher] violence analysis failed: {exc}")


def summarize_results(shared_results):
    print("[launcher] model summary")
    if "nudity" in shared_results:
        nudity = shared_results["nudity"]
        if nudity["status"] == "ok":
            result = nudity["result"]
            print(
                "[launcher] nudity:",
                f"has_nudity={result['has_nudity']},",
                f"match_count={result['match_count']}",
            )
        else:
            print("[launcher] nudity: failed -", nudity["error"])

    if "violence" in shared_results:
        violence = shared_results["violence"]
        if violence["status"] == "ok":
            result = violence["result"]
            print(
                "[launcher] violence:",
                f"has_violence={result['has_violence']},",
                f"score={result['violence_score']:.4f}",
            )
        else:
            print("[launcher] violence: failed -", violence["error"])


def main():
    args = build_parser().parse_args()
    video_path = Path(args.video_path).expanduser().resolve()
    if not video_path.exists():
        raise FileNotFoundError(f"Video not found: {video_path}")

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    results_dir = (PROJECT_ROOT / args.results_dir / timestamp).resolve()
    shared_results = {}
    threads = []

    addiction_process = launch_addiction(args) if args.run_addiction else None

    if not args.skip_nudity:
        threads.append(
            threading.Thread(
                target=run_nudity_analysis,
                args=(args, video_path, results_dir, shared_results),
                daemon=True,
            )
        )
    if not args.skip_violence:
        threads.append(
            threading.Thread(
                target=run_violence_analysis,
                args=(args, video_path, results_dir, shared_results),
                daemon=True,
            )
        )

    for thread in threads:
        thread.start()

    try:
        for thread in threads:
            thread.join()
        summarize_results(shared_results)
        if addiction_process is not None:
            print("[launcher] addiction.py is still running until you close it.")
            addiction_process.wait()
    except KeyboardInterrupt:
        if addiction_process is not None:
            print("[launcher] stopping addiction.py")
            addiction_process.terminate()
            try:
                addiction_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                addiction_process.kill()
                addiction_process.wait(timeout=5)


if __name__ == "__main__":
    main()
