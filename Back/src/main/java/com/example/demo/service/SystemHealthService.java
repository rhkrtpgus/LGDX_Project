package com.example.demo.service;

import com.example.demo.dto.ComponentHealthResponse;
import com.example.demo.dto.RuntimeSettingsResponse;
import com.example.demo.dto.SystemHealthResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class SystemHealthService {

	private final DataSource dataSource;
	private final RuntimeSettingsService runtimeSettingsService;
	private final String workingDirectory;
	private final String scriptName;
	private final String addictionScriptName;

	public SystemHealthService(
		DataSource dataSource,
		RuntimeSettingsService runtimeSettingsService,
		@Value("${model.working-directory}") String workingDirectory,
		@Value("${model.script-name}") String scriptName,
		@Value("${model.addiction-script-name}") String addictionScriptName
	) {
		this.dataSource = dataSource;
		this.runtimeSettingsService = runtimeSettingsService;
		this.workingDirectory = workingDirectory;
		this.scriptName = scriptName;
		this.addictionScriptName = addictionScriptName;
	}

	public SystemHealthResponse getHealth() {
		RuntimeSettingsResponse runtimeSettings = runtimeSettingsService.getCurrent();
		Path modelRoot = Path.of("").toAbsolutePath().resolve(workingDirectory).normalize();

		return new SystemHealthResponse(
			new ComponentHealthResponse("UP", "프론트와 연결 가능한 백엔드 API가 동작 중입니다."),
			checkDatabase(),
			checkScript(modelRoot.resolve(scriptName), "메인 분석 모델 스크립트를 확인했습니다."),
			checkScript(modelRoot.resolve(addictionScriptName), "추가 모니터링 스크립트를 확인했습니다."),
			runtimeSettings
		);
	}

	private ComponentHealthResponse checkDatabase() {
		try (var connection = dataSource.getConnection()) {
			if (connection.isValid(2)) {
				return new ComponentHealthResponse("UP", "PostgreSQL 연결이 정상입니다.");
			}
			return new ComponentHealthResponse("DEGRADED", "PostgreSQL 응답이 느리거나 불안정합니다.");
		} catch (Exception exception) {
			return new ComponentHealthResponse("DOWN", "PostgreSQL 연결에 실패했습니다.");
		}
	}

	private ComponentHealthResponse checkScript(Path scriptPath, String successMessage) {
		if (Files.exists(scriptPath)) {
			return new ComponentHealthResponse("READY", successMessage);
		}
		return new ComponentHealthResponse("MISSING", "모델 스크립트 파일을 찾지 못했습니다.");
	}
}
