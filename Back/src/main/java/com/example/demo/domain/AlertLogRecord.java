package com.example.demo.domain;

public record AlertLogRecord(
	int alertId,
	int viewingId,
	String alertType,
	String riskLevel,
	String messageText
) {
}
