from nudenet import NudeDetector

detector = NudeDetector()

# 이미지 분석
result = detector.detect("테스트이미지.jpg")
print(result)

# 모자이크 처리 (선택)
detector.censor("테스트이미지.jpg", output_path="output.jpg")


# 이미지 파일 경로 설정하고, 터미널에 python run.py 명령어로 실행하면 됩니다. 결과는 콘솔에 출력되고, 모자이크 처리된 이미지는 output.jpg로 저장됩니다.