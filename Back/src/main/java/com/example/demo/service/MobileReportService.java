package com.example.demo.service;

import com.example.demo.domain.DailyReport;
import com.example.demo.domain.MonthlyReport;
import com.example.demo.domain.WeeklyReport;
import com.example.demo.dto.MobileReportResponse;
import com.example.demo.dto.ReportFamilyResponse;
import com.example.demo.dto.ReportPeriodResponse;
import com.example.demo.repository.ReportMapper;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class MobileReportService {

	private final ReportMapper reportMapper;

	public MobileReportService(ReportMapper reportMapper) {
		this.reportMapper = reportMapper;
	}

	public MobileReportResponse getMobileReport(int familyId) {
		String familyName = reportMapper.findFamilyNameByFamilyId(familyId);
		if (familyName == null) {
			throw new IllegalArgumentException("No report target was found for this family.");
		}

		DailyReport daily = reportMapper.findDailyByFamilyId(familyId);
		WeeklyReport weekly = reportMapper.findWeeklyByFamilyId(familyId);
		MonthlyReport monthly = reportMapper.findMonthlyByFamilyId(familyId);

		return new MobileReportResponse(
			familyId,
			familyName,
			toPeriodResponse(
				familyId,
				"daily",
				1,
				daily == null ? null : daily.compareTime(),
				daily == null ? null : daily.countAlertType()
			),
			toPeriodResponse(
				familyId,
				"weekly",
				7,
				weekly == null ? null : weekly.compareTime(),
				weekly == null ? null : weekly.countAlertType()
			),
			toPeriodResponse(
				familyId,
				"monthly",
				30,
				monthly == null ? null : monthly.compareTime(),
				monthly == null ? null : monthly.countAlertType()
			),
			LocalDateTime.now()
		);
	}

	public List<ReportFamilyResponse> getFamilies() {
		return reportMapper.findFamilies();
	}

	private ReportPeriodResponse toPeriodResponse(
		int familyId,
		String period,
		int days,
		Integer compareTime,
		Integer countAlertType
	) {
		int currentWatchMinutes = defaultInt(reportMapper.sumWatchMinutesSince(familyId, days));
		int currentAlertCount = defaultInt(reportMapper.countAlertsSince(familyId, days));
		Integer watchDeltaMinutes = compareTime == null ? null : currentWatchMinutes - compareTime;
		Integer watchDeltaPercent = null;
		if (compareTime != null && compareTime != 0 && watchDeltaMinutes != null) {
			watchDeltaPercent = (int) Math.round((watchDeltaMinutes * 100.0) / compareTime);
		}
		Integer alertDeltaCount = countAlertType == null ? null : currentAlertCount - countAlertType;

		return new ReportPeriodResponse(
			period,
			compareTime,
			countAlertType,
			currentWatchMinutes,
			watchDeltaMinutes,
			watchDeltaPercent,
			currentAlertCount,
			alertDeltaCount,
			buildWatchSummary(currentWatchMinutes, compareTime, watchDeltaMinutes, watchDeltaPercent),
			buildAlertSummary(currentAlertCount, countAlertType, alertDeltaCount)
		);
	}

	private String buildWatchSummary(
		int currentWatchMinutes,
		Integer baselineWatchMinutes,
		Integer watchDeltaMinutes,
		Integer watchDeltaPercent
	) {
		if (baselineWatchMinutes == null) {
			return "No baseline watch-time data yet.";
		}
		if (watchDeltaMinutes == null || watchDeltaMinutes == 0) {
			return "Watch time is aligned with the usual pattern.";
		}

		String direction = watchDeltaMinutes > 0 ? "up" : "down";
		int absoluteDelta = Math.abs(watchDeltaMinutes);
		String percentLabel = watchDeltaPercent == null ? "" : " (" + Math.abs(watchDeltaPercent) + "%)";
		return "Watch time is " + direction + " by " + absoluteDelta + " min" + percentLabel
			+ " against the usual baseline.";
	}

	private String buildAlertSummary(
		int currentAlertCount,
		Integer baselineAlertCount,
		Integer alertDeltaCount
	) {
		if (baselineAlertCount == null) {
			return "No baseline alert data yet.";
		}
		if (alertDeltaCount == null || alertDeltaCount == 0) {
			return "Alert count is stable compared with the usual pattern.";
		}

		String direction = alertDeltaCount > 0 ? "higher" : "lower";
		return "Alert count is " + direction + " by " + Math.abs(alertDeltaCount)
			+ " compared with the usual baseline.";
	}

	private int defaultInt(Integer value) {
		return value == null ? 0 : value;
	}
}
