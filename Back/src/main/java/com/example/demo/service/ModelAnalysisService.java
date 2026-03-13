package com.example.demo.service;

import com.example.demo.domain.AnalysisHistoryRecord;
import com.example.demo.dto.AddictionMonitorResponse;
import com.example.demo.dto.AnalysisHistoryResponse;
import com.example.demo.dto.AnalysisResponse;
import com.example.demo.dto.PlaybackDecisionResult;
import com.example.demo.dto.RuntimeSettingsResponse;
import com.example.demo.repository.AnalysisHistoryMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ModelAnalysisService {

	private static final TypeReference<List<String>> STRING_LIST_TYPE = new TypeReference<>() {
	};

	private final AnalysisHistoryMapper analysisHistoryMapper;
	private final RuntimeSettingsService runtimeSettingsService;
	private final ParentControlService parentControlService;
	private final ObjectMapper objectMapper;
	private final String pythonCommand;
	private final String workingDirectory;
	private final String scriptName;
	private final long executionTimeoutSeconds;
	private final String addictionScriptName;
	private final long addictionExecutionTimeoutSeconds;

	public ModelAnalysisService(
		AnalysisHistoryMapper analysisHistoryMapper,
		RuntimeSettingsService runtimeSettingsService,
		ParentControlService parentControlService,
		ObjectMapper objectMapper,
		@Value("${model.python-command}") String pythonCommand,
		@Value("${model.working-directory}") String workingDirectory,
		@Value("${model.script-name}") String scriptName,
		@Value("${model.execution-timeout-seconds}") long executionTimeoutSeconds,
		@Value("${model.addiction-script-name}") String addictionScriptName,
		@Value("${model.addiction-execution-timeout-seconds}") long addictionExecutionTimeoutSeconds
	) {
		this.analysisHistoryMapper = analysisHistoryMapper;
		this.runtimeSettingsService = runtimeSettingsService;
		this.parentControlService = parentControlService;
		this.objectMapper = objectMapper;
		this.pythonCommand = pythonCommand;
		this.workingDirectory = workingDirectory;
		this.scriptName = scriptName;
		this.executionTimeoutSeconds = executionTimeoutSeconds;
		this.addictionScriptName = addictionScriptName;
		this.addictionExecutionTimeoutSeconds = addictionExecutionTimeoutSeconds;
	}

	public AnalysisResponse analyzeYoutubeVideo(String videoUrl, Integer childId) {
		RuntimeSettingsResponse runtimeSettings = runtimeSettingsService.getCurrent();
		AnalysisHistoryRecord record = new AnalysisHistoryRecord();
		record.setInputUrl(videoUrl);
		record.setCreatedAt(LocalDateTime.now());

		try {
			ProcessResult processResult = runMainAnalysis(videoUrl);
			JsonNode root = objectMapper.readTree(processResult.stdout());

			List<String> harmfulReasons = extractStringList(root, "harmful_reasons");
			record.setVideoId(readText(root, "video_id"));
			record.setTitle(readText(root, "title"));
			record.setCategoryNameKo(readText(root, "category_name_ko"));
			record.setDurationSeconds(readInt(root, "duration_seconds"));
			record.setShortForm(readBoolean(root, "is_short_form"));
			record.setBlockedByCategory(readBoolean(root.path("category_filter"), "is_blocked"));
			record.setHasViolence(readBoolean(root, "has_violence"));
			record.setViolenceScore(readDouble(root, "violence_score"));
			record.setViolencePositiveWindows(readInt(root, "violence_positive_windows"));
			record.setHasNudity(readBoolean(root, "has_nudity"));
			record.setNudityMatchCount(readInt(root, "nudity_match_count"));
			record.setHarmful(
				record.isBlockedByCategory() || record.isHasViolence() || record.isHasNudity()
			);
			record.setHarmfulReasonsJson(objectMapper.writeValueAsString(harmfulReasons));
			record.setStatus("SUCCESS");

			analysisHistoryMapper.insert(record);

			PlaybackDecisionResult playback = parentControlService.buildPlaybackDecision(
				childId,
				record.getVideoId(),
				record.getDurationSeconds(),
				record.isHarmful(),
				harmfulReasons,
				record.isShortForm()
			);
			AddictionMonitorResponse addictionMonitor = runAddictionMonitor(videoUrl, runtimeSettings);
			return toResponse(record, harmfulReasons, playback, addictionMonitor);
		} catch (Exception exception) {
			record.setStatus("FAILED");
			record.setErrorMessage(trimToLength(exception.getMessage(), 4000));
			record.setHarmful(false);
			record.setHarmfulReasonsJson("[]");
			analysisHistoryMapper.insert(record);

			return toResponse(
				record,
				Collections.emptyList(),
				new PlaybackDecisionResult(
					false,
					"분석이 실패하여 자동 재생 여부를 판단할 수 없습니다.",
					0,
					"대기",
					List.of("백엔드 또는 Python 모델 상태를 확인해야 합니다.")
				),
				buildSkippedMonitor(runtimeSettings, "메인 모델 분석이 실패하여 addiction.py는 실행하지 않았습니다.")
			);
		}
	}

	public List<AnalysisResponse> findRecentHistory(int limit) {
		int safeLimit = Math.max(1, Math.min(limit, 20));
		return analysisHistoryMapper.findRecent(safeLimit).stream()
			.map(this::toResponse)
			.toList();
	}

	private ProcessResult runMainAnalysis(String videoUrl) throws IOException, InterruptedException {
		return runPythonCommand(
			List.of(pythonCommand, scriptName, videoUrl),
			executionTimeoutSeconds,
			"메인 모델 실행 시간이 초과되었습니다."
		);
	}

	private AddictionMonitorResponse runAddictionMonitor(
		String videoUrl,
		RuntimeSettingsResponse runtimeSettings
	) {
		if (!runtimeSettings.privacyConsent()) {
			return buildSkippedMonitor(
				runtimeSettings,
				"개인정보 수집 동의가 없어 addiction.py 실행을 건너뛰었습니다."
			);
		}

		if (!runtimeSettings.addictionMonitorEnabled()) {
			return buildSkippedMonitor(
				runtimeSettings,
				"설정에서 addiction.py 실행이 꺼져 있어 건너뛰었습니다."
			);
		}

		try {
			runPythonCommand(
				List.of(
					pythonCommand,
					addictionScriptName,
					"--metadata-only",
					"--youtube-url",
					videoUrl
				),
				addictionExecutionTimeoutSeconds,
				"addiction.py 실행 시간이 초과되었습니다."
			);
			return new AddictionMonitorResponse(
				true,
				true,
				true,
				"SUCCESS",
				"addiction.py 메타데이터 점검이 완료되었습니다."
			);
		} catch (Exception exception) {
			return new AddictionMonitorResponse(
				true,
				true,
				false,
				"FAILED",
				trimToLength(exception.getMessage(), 4000)
			);
		}
	}

	private AddictionMonitorResponse buildSkippedMonitor(
		RuntimeSettingsResponse runtimeSettings,
		String message
	) {
		return new AddictionMonitorResponse(
			runtimeSettings.addictionMonitorEnabled(),
			runtimeSettings.privacyConsent(),
			false,
			"SKIPPED",
			message
		);
	}

	private ProcessResult runPythonCommand(
		List<String> command,
		long timeoutSeconds,
		String timeoutMessage
	) throws IOException, InterruptedException {
		Path resolvedWorkingDirectory = Path.of("").toAbsolutePath()
			.resolve(workingDirectory)
			.normalize();

		ProcessBuilder processBuilder = new ProcessBuilder(command);
		processBuilder.directory(resolvedWorkingDirectory.toFile());
		processBuilder.environment().put("PYTHONUTF8", "1");

		Process process = processBuilder.start();
		boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
		if (!finished) {
			process.destroyForcibly();
			throw new IllegalStateException(timeoutMessage);
		}

		String stdout = readStream(process.getInputStream());
		String stderr = readStream(process.getErrorStream());
		if (process.exitValue() != 0) {
			String message = StringUtils.hasText(stderr) ? stderr : stdout;
			throw new IllegalStateException(trimToLength(message, 4000));
		}

		return new ProcessResult(stdout, stderr);
	}

	private String readStream(InputStream inputStream) throws IOException {
		return new String(inputStream.readAllBytes(), StandardCharsets.UTF_8).trim();
	}

	private String readText(JsonNode node, String fieldName) {
		JsonNode child = node.path(fieldName);
		return child.isMissingNode() || child.isNull() ? null : child.asText();
	}

	private Integer readInt(JsonNode node, String fieldName) {
		JsonNode child = node.path(fieldName);
		return child.isMissingNode() || child.isNull() ? null : child.asInt();
	}

	private Double readDouble(JsonNode node, String fieldName) {
		JsonNode child = node.path(fieldName);
		return child.isMissingNode() || child.isNull() ? null : child.asDouble();
	}

	private boolean readBoolean(JsonNode node, String fieldName) {
		return node.path(fieldName).asBoolean(false);
	}

	private List<String> extractStringList(JsonNode node, String fieldName) {
		JsonNode child = node.path(fieldName);
		if (child.isMissingNode() || child.isNull()) {
			return Collections.emptyList();
		}
		return objectMapper.convertValue(child, STRING_LIST_TYPE);
	}

	private AnalysisResponse toResponse(
		AnalysisHistoryRecord record,
		List<String> harmfulReasons,
		PlaybackDecisionResult playback,
		AddictionMonitorResponse addictionMonitor
	) {
		return new AnalysisResponse(
			record.getAnalysisId(),
			record.getInputUrl(),
			record.getVideoId(),
			record.getTitle(),
			record.getCategoryNameKo(),
			record.getDurationSeconds(),
			record.isShortForm(),
			record.isBlockedByCategory(),
			record.isHasViolence(),
			record.getViolenceScore(),
			record.getViolencePositiveWindows(),
			record.isHasNudity(),
			record.getNudityMatchCount(),
			record.isHarmful(),
			harmfulReasons,
			playback,
			addictionMonitor,
			record.getStatus(),
			record.getErrorMessage(),
			record.getCreatedAt()
		);
	}

	private AnalysisResponse toResponse(AnalysisHistoryResponse response) {
		return response.toResponse(parseReasons(response.getHarmfulReasonsJson()));
	}

	private List<String> parseReasons(String rawJson) {
		if (!StringUtils.hasText(rawJson)) {
			return Collections.emptyList();
		}

		try {
			return objectMapper.readValue(rawJson, STRING_LIST_TYPE);
		} catch (IOException ignored) {
			return Collections.emptyList();
		}
	}

	private String trimToLength(String value, int maxLength) {
		if (!StringUtils.hasText(value)) {
			return "알 수 없는 오류가 발생했습니다.";
		}
		return value.length() <= maxLength ? value : value.substring(0, maxLength);
	}

	private record ProcessResult(String stdout, String stderr) {
	}
}
