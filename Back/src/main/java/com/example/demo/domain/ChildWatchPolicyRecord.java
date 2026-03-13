package com.example.demo.domain;

import java.time.LocalDateTime;

public class ChildWatchPolicyRecord {

	private Integer childId;
	private Integer dailyLimitMinutes;
	private Integer weekdayStartHour;
	private Integer weekdayEndHour;
	private Integer weekendStartHour;
	private Integer weekendEndHour;
	private Integer notificationThreshold;
	private Boolean autoBlockEnabled;
	private LocalDateTime updatedAt;

	public Integer getChildId() {
		return childId;
	}

	public void setChildId(Integer childId) {
		this.childId = childId;
	}

	public Integer getDailyLimitMinutes() {
		return dailyLimitMinutes;
	}

	public void setDailyLimitMinutes(Integer dailyLimitMinutes) {
		this.dailyLimitMinutes = dailyLimitMinutes;
	}

	public Integer getWeekdayStartHour() {
		return weekdayStartHour;
	}

	public void setWeekdayStartHour(Integer weekdayStartHour) {
		this.weekdayStartHour = weekdayStartHour;
	}

	public Integer getWeekdayEndHour() {
		return weekdayEndHour;
	}

	public void setWeekdayEndHour(Integer weekdayEndHour) {
		this.weekdayEndHour = weekdayEndHour;
	}

	public Integer getWeekendStartHour() {
		return weekendStartHour;
	}

	public void setWeekendStartHour(Integer weekendStartHour) {
		this.weekendStartHour = weekendStartHour;
	}

	public Integer getWeekendEndHour() {
		return weekendEndHour;
	}

	public void setWeekendEndHour(Integer weekendEndHour) {
		this.weekendEndHour = weekendEndHour;
	}

	public Integer getNotificationThreshold() {
		return notificationThreshold;
	}

	public void setNotificationThreshold(Integer notificationThreshold) {
		this.notificationThreshold = notificationThreshold;
	}

	public Boolean getAutoBlockEnabled() {
		return autoBlockEnabled;
	}

	public void setAutoBlockEnabled(Boolean autoBlockEnabled) {
		this.autoBlockEnabled = autoBlockEnabled;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public void setUpdatedAt(LocalDateTime updatedAt) {
		this.updatedAt = updatedAt;
	}
}
