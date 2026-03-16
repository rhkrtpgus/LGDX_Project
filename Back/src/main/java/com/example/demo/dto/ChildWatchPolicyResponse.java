package com.example.demo.dto;

import java.time.LocalDateTime;

public record ChildWatchPolicyResponse(
	Integer childId,
	Integer dailyLimitMinutes,
	Integer weekdayStartHour,
	Integer weekdayEndHour,
	Integer weekendStartHour,
	Integer weekendEndHour,
	boolean bedtimeLockEnabled,
	Integer bedtimeHour,
	Integer mondayLimitMinutes,
	Integer tuesdayLimitMinutes,
	Integer wednesdayLimitMinutes,
	Integer thursdayLimitMinutes,
	Integer fridayLimitMinutes,
	Integer saturdayLimitMinutes,
	Integer sundayLimitMinutes,
	Integer notificationThreshold,
	boolean autoBlockEnabled,
	LocalDateTime updatedAt
) {
}
