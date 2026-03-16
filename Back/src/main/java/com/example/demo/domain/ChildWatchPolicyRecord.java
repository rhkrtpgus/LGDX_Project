package com.example.demo.domain;

import java.time.LocalDateTime;

public class ChildWatchPolicyRecord {

	private Integer childId;
	private Integer dailyLimitMinutes;
	private Integer weekdayStartHour;
	private Integer weekdayEndHour;
	private Integer weekendStartHour;
	private Integer weekendEndHour;
	private Boolean bedtimeLockEnabled;
	private Integer bedtimeHour;
	private Integer mondayLimitMinutes;
	private Integer tuesdayLimitMinutes;
	private Integer wednesdayLimitMinutes;
	private Integer thursdayLimitMinutes;
	private Integer fridayLimitMinutes;
	private Integer saturdayLimitMinutes;
	private Integer sundayLimitMinutes;
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

	public Boolean getBedtimeLockEnabled() {
		return bedtimeLockEnabled;
	}

	public void setBedtimeLockEnabled(Boolean bedtimeLockEnabled) {
		this.bedtimeLockEnabled = bedtimeLockEnabled;
	}

	public Integer getBedtimeHour() {
		return bedtimeHour;
	}

	public void setBedtimeHour(Integer bedtimeHour) {
		this.bedtimeHour = bedtimeHour;
	}

	public Integer getMondayLimitMinutes() {
		return mondayLimitMinutes;
	}

	public void setMondayLimitMinutes(Integer mondayLimitMinutes) {
		this.mondayLimitMinutes = mondayLimitMinutes;
	}

	public Integer getTuesdayLimitMinutes() {
		return tuesdayLimitMinutes;
	}

	public void setTuesdayLimitMinutes(Integer tuesdayLimitMinutes) {
		this.tuesdayLimitMinutes = tuesdayLimitMinutes;
	}

	public Integer getWednesdayLimitMinutes() {
		return wednesdayLimitMinutes;
	}

	public void setWednesdayLimitMinutes(Integer wednesdayLimitMinutes) {
		this.wednesdayLimitMinutes = wednesdayLimitMinutes;
	}

	public Integer getThursdayLimitMinutes() {
		return thursdayLimitMinutes;
	}

	public void setThursdayLimitMinutes(Integer thursdayLimitMinutes) {
		this.thursdayLimitMinutes = thursdayLimitMinutes;
	}

	public Integer getFridayLimitMinutes() {
		return fridayLimitMinutes;
	}

	public void setFridayLimitMinutes(Integer fridayLimitMinutes) {
		this.fridayLimitMinutes = fridayLimitMinutes;
	}

	public Integer getSaturdayLimitMinutes() {
		return saturdayLimitMinutes;
	}

	public void setSaturdayLimitMinutes(Integer saturdayLimitMinutes) {
		this.saturdayLimitMinutes = saturdayLimitMinutes;
	}

	public Integer getSundayLimitMinutes() {
		return sundayLimitMinutes;
	}

	public void setSundayLimitMinutes(Integer sundayLimitMinutes) {
		this.sundayLimitMinutes = sundayLimitMinutes;
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
