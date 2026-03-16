package com.example.demo.dto;

public record PlaybackRecordResponse(
	Integer viewingId,
	PlaybackDecisionResult playback
) {
}
