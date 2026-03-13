package com.example.demo.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AnalysisResponse(
	Long analysisId,
	String inputUrl,
	String videoId,
	String title,
	String categoryNameKo,
	Integer durationSeconds,
	boolean shortForm,
	boolean blockedByCategory,
	boolean hasViolence,
	Double violenceScore,
	Integer violencePositiveWindows,
	boolean hasNudity,
	Integer nudityMatchCount,
	boolean harmful,
	List<String> harmfulReasons,
	PlaybackDecisionResult playback,
	AddictionMonitorResponse addictionMonitor,
	String status,
	String errorMessage,
	LocalDateTime createdAt
) {
}
