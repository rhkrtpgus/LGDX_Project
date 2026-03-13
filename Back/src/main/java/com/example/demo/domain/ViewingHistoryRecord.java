package com.example.demo.domain;

import java.time.LocalDateTime;

public record ViewingHistoryRecord(
	int viewingId,
	int userId,
	String videoId,
	LocalDateTime watchTime,
	Integer watchDuration
) {
}
