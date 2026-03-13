package com.example.demo.dto;

public record ChildWatchPolicyRequest(
	Integer childId,
	Integer dailyLimitMinutes,
	Integer weekdayStartHour,
	Integer weekdayEndHour,
	Integer weekendStartHour,
	Integer weekendEndHour,
	Integer notificationThreshold,
	Boolean autoBlockEnabled
) {
}
