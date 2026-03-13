package com.example.demo.domain;

import java.time.LocalDateTime;

public class AppRuntimeSettingsRecord {

	private Short settingsId;
	private boolean privacyConsent;
	private boolean addictionMonitorEnabled;
	private LocalDateTime updatedAt;

	public Short getSettingsId() {
		return settingsId;
	}

	public void setSettingsId(Short settingsId) {
		this.settingsId = settingsId;
	}

	public boolean isPrivacyConsent() {
		return privacyConsent;
	}

	public void setPrivacyConsent(boolean privacyConsent) {
		this.privacyConsent = privacyConsent;
	}

	public boolean isAddictionMonitorEnabled() {
		return addictionMonitorEnabled;
	}

	public void setAddictionMonitorEnabled(boolean addictionMonitorEnabled) {
		this.addictionMonitorEnabled = addictionMonitorEnabled;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
}
