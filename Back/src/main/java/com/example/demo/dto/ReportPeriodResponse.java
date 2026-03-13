package com.example.demo.dto;

public record ReportPeriodResponse(
	String period,
	Integer compareTime,
	Integer countAlertType,
	Integer currentWatchMinutes,
	Integer watchDeltaMinutes,
	Integer watchDeltaPercent,
	Integer currentAlertCount,
	Integer alertDeltaCount,
	String watchSummary,
	String alertSummary
) {
}
