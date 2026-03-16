package com.example.demo.dto;

public record ChildWatchPolicyRequest(
	Integer childId,
	Integer dailyLimitMinutes,
	Integer weekdayStartHour,
	Integer weekdayEndHour,
	Integer weekendStartHour,
	Integer weekendEndHour,
	Boolean bedtimeLockEnabled,
	Integer bedtimeHour,
	Integer mondayLimitMinutes,
	Integer tuesdayLimitMinutes,
	Integer wednesdayLimitMinutes,
	Integer thursdayLimitMinutes,
	Integer fridayLimitMinutes,
	Integer saturdayLimitMinutes,
	Integer sundayLimitMinutes,
	Integer notificationThreshold,
	Boolean autoBlockEnabled
) {
}
