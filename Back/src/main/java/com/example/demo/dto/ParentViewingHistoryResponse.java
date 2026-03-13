package com.example.demo.dto;

import java.time.LocalDateTime;

public class ParentViewingHistoryResponse {

	private Integer viewingId;
	private Integer childId;
	private String childName;
	private String videoId;
	private LocalDateTime watchTime;
	private Integer watchDuration;
	private String latestAlertType;
	private String latestRiskLevel;

	public Integer getViewingId() {
		return viewingId;
	}

	public void setViewingId(Integer viewingId) {
		this.viewingId = viewingId;
	}

	public Integer getChildId() {
		return childId;
	}

	public void setChildId(Integer childId) {
		this.childId = childId;
	}

	public String getChildName() {
		return childName;
	}

	public void setChildName(String childName) {
		this.childName = childName;
	}

	public String getVideoId() {
		return videoId;
	}

	public void setVideoId(String videoId) {
		this.videoId = videoId;
	}

	public LocalDateTime getWatchTime() {
		return watchTime;
	}

	public void setWatchTime(LocalDateTime watchTime) {
		this.watchTime = watchTime;
	}

	public Integer getWatchDuration() {
		return watchDuration;
	}

	public void setWatchDuration(Integer watchDuration) {
		this.watchDuration = watchDuration;
	}

	public String getLatestAlertType() {
		return latestAlertType;
	}

	public void setLatestAlertType(String latestAlertType) {
		this.latestAlertType = latestAlertType;
	}

	public String getLatestRiskLevel() {
		return latestRiskLevel;
	}

	public void setLatestRiskLevel(String latestRiskLevel) {
		this.latestRiskLevel = latestRiskLevel;
	}
}
