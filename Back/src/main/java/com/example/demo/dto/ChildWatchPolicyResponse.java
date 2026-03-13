package com.example.demo.dto;

import java.time.LocalDateTime;

public record ChildWatchPolicyResponse(
	Integer childId,
	Integer dailyLimitMinutes,
	Integer weekdayStartHour,
	Integer weekdayEndHour,
	Integer weekendStartHour,
	Integer weekendEndHour,
	Integer notificationThreshold,
	boolean autoBlockEnabled,
	LocalDateTime updatedAt
) {
}
