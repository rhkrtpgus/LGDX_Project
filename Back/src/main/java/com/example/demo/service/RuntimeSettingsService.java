package com.example.demo.service;

import com.example.demo.domain.AppRuntimeSettingsRecord;
import com.example.demo.dto.RuntimeSettingsRequest;
import com.example.demo.dto.RuntimeSettingsResponse;
import com.example.demo.repository.AppRuntimeSettingsMapper;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class RuntimeSettingsService {

	private static final short SETTINGS_ID = 1;

	private final AppRuntimeSettingsMapper appRuntimeSettingsMapper;

	public RuntimeSettingsService(AppRuntimeSettingsMapper appRuntimeSettingsMapper) {
		this.appRuntimeSettingsMapper = appRuntimeSettingsMapper;
	}

	public RuntimeSettingsResponse getCurrent() {
		AppRuntimeSettingsRecord record = appRuntimeSettingsMapper.findCurrent();
		if (record == null) {
			AppRuntimeSettingsRecord fallback = new AppRuntimeSettingsRecord();
			fallback.setSettingsId(SETTINGS_ID);
			fallback.setPrivacyConsent(false);
			fallback.setAddictionMonitorEnabled(false);
			fallback.setUpdatedAt(LocalDateTime.now());
			appRuntimeSettingsMapper.upsert(fallback);
			return toResponse(fallback);
		}
		return toResponse(record);
	}

	public RuntimeSettingsResponse update(RuntimeSettingsRequest request) {
		RuntimeSettingsResponse current = getCurrent();
		boolean nextPrivacyConsent = request.privacyConsent() != null
			? request.privacyConsent()
			: current.privacyConsent();
		boolean nextAddictionMonitorEnabled = request.addictionMonitorEnabled() != null
			? request.addictionMonitorEnabled()
			: current.addictionMonitorEnabled();

		if (nextAddictionMonitorEnabled && !nextPrivacyConsent) {
			throw new IllegalArgumentException("개인정보 수집 동의 후에만 addiction.py를 실행할 수 있습니다.");
		}

		if (!nextPrivacyConsent) {
			nextAddictionMonitorEnabled = false;
		}

		AppRuntimeSettingsRecord nextRecord = new AppRuntimeSettingsRecord();
		nextRecord.setSettingsId(SETTINGS_ID);
		nextRecord.setPrivacyConsent(nextPrivacyConsent);
		nextRecord.setAddictionMonitorEnabled(nextAddictionMonitorEnabled);
		appRuntimeSettingsMapper.upsert(nextRecord);
		return getCurrent();
	}

	private RuntimeSettingsResponse toResponse(AppRuntimeSettingsRecord record) {
		return new RuntimeSettingsResponse(
			record.isPrivacyConsent(),
			record.isAddictionMonitorEnabled(),
			record.getUpdatedAt()
		);
	}
}
