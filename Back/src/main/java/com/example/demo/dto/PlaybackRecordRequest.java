package com.example.demo.dto;

import java.util.List;

public record PlaybackRecordRequest(
	Integer childId,
	String videoId,
	Integer durationSeconds,
	Boolean harmful,
	List<String> harmfulReasons,
	Boolean shortForm
) {
}
