package com.example.demo.dto;

import java.util.List;

public record PlaybackDecisionResult(
	boolean allowed,
	String message,
	int addictionRiskScore,
	String addictionRiskLevel,
	List<String> behaviorSignals
) {
}
