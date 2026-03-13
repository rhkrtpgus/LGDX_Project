package com.example.demo.dto;

import java.time.LocalDateTime;

public record RuntimeSettingsResponse(
	boolean privacyConsent,
	boolean addictionMonitorEnabled,
	LocalDateTime updatedAt
) {
}
